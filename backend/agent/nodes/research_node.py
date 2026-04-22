"""Research node for paper extraction and novelty assessment."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.errors import format_model_error, is_expected_model_auth_error
from agent.prompts import RESEARCH_NODE_SYSTEM_PROMPT
from agent.state import AgentState
from core.config import settings
from services.lit_search import detect_publication_duplicate, search_related_papers
from services.pdf_extractor import extract_paper

logger = logging.getLogger(__name__)

def _strip_json_fences(raw_text: str) -> str:
    """Remove markdown fences from model output when present."""
    text = raw_text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) > 1:
            text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def _duplicate_publication_result(state: dict, publication_check: dict, related: list[dict]) -> dict:
    """Build a terminal rejection result without calling the review model."""
    matched_title = publication_check.get("matched_title") or state.get("title") or "the submitted manuscript"
    matched_year = publication_check.get("matched_year") or "N/A"
    matched_venue = publication_check.get("matched_venue") or "Semantic Scholar"
    confidence = publication_check.get("duplicate_confidence", "high")
    evidence = (
        "Related Literature / Semantic Scholar: exact or near-exact title match "
        f"'{matched_title}' ({matched_year}, {matched_venue}); duplicate confidence: {confidence}."
    )
    summary = (
        "The submitted manuscript appears to be an already published paper. "
        "Because a confirmed publication match is a terminal publication-ethics and originality issue, "
        "the system stopped before running the full AI peer-review stage."
    )
    comments = (
        f"{summary} The matched record was '{matched_title}' ({matched_year}, {matched_venue}). "
        "This submission should not be evaluated as a new manuscript unless the user explicitly intends a "
        "post-publication assessment rather than a publication recommendation."
    )
    return {
        "research_analysis": {
            "document_type_valid": True,
            "field": state.get("field") or "Publication ethics",
            "novelty_score": 0,
            "publication_check": publication_check,
            "novelty_warning": "Already-published manuscript detected before Gemini review.",
        },
        "field": "Publication ethics",
        "dimension_scores": [],
        "overall_score": None,
        "recommendation": "Reject",
        "summary": summary,
        "general_comments": comments,
        "major_flaws": [
            {
                "issue": "Already-published manuscript detected",
                "evidence": evidence,
                "remedy": (
                    "This flaw is non-remediable for a new-manuscript submission. "
                    "Withdraw or reject the submission and follow duplicate-publication ethics guidance."
                ),
            }
        ],
        "minor_points": [],
        "related_papers": related,
        "research_llm_raw_output": json.dumps(
            {
                "publication_check": publication_check,
                "action": "Skipped Gemini novelty and peer-review calls because the manuscript appears already published.",
            }
        ),
        "review_llm_raw_output": "",
        "status": "complete",
    }


async def research_node(state: AgentState) -> dict:
    """Extract paper content, run literature search, and assess novelty."""
    updates: dict = {"progress_messages": [*state.get("progress_messages", [])]}

    try:
        updates["progress_messages"].append("Extracting paper content...")
        paper = await extract_paper(
            pdf_bytes=state.get("paper_bytes"),
            arxiv_id=state.get("arxiv_id"),
            grobid_url=settings.GROBID_URL,
        )

        updates.update(
            {
                "title": paper["title"],
                "authors": paper["authors"],
                "abstract": paper["abstract"],
                "full_text": paper["full_text"],
                "sections": paper["sections"],
                "figures": paper["figures"],
                "tables": paper["tables"],
                "references": paper["references"],
                "word_count": paper["word_count"],
                "page_count": paper["page_count"],
            }
        )
        updates["progress_messages"].append(
            f"Paper extracted: {paper['title'][:60]}... ({paper['page_count']} pages)"
        )

        updates["progress_messages"].append("Searching related literature...")
        related = await search_related_papers(
            title=paper["title"],
            abstract=paper["abstract"],
            api_key=settings.SEMANTIC_SCHOLAR_API_KEY,
        )
        updates["related_papers"] = related
        updates["progress_messages"].append(
            f"Found {len(related)} related papers on Semantic Scholar"
        )

        publication_check = detect_publication_duplicate(
            title=paper["title"],
            authors=paper["authors"],
            related_papers=related,
        )
        updates["publication_check"] = publication_check
        if publication_check.get("status") == "already_published":
            updates["progress_messages"].append(
                "Already-published title match detected in Semantic Scholar; skipping Gemini review"
            )
            updates.update(_duplicate_publication_result(updates, publication_check, related))
            return updates

        updates["progress_messages"].append("Analysing research field and novelty...")
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_FLASH_MODEL,
            temperature=0.1,
            google_api_key=settings.GEMINI_API_KEY,
            response_mime_type="application/json",
        )
        user_prompt = f"""Paper abstract:
{paper["abstract"]}

Related papers from Semantic Scholar:
{json.dumps([{"title": p["title"], "abstract": p.get("abstract_snippet", ""), "year": p.get("year")} for p in related[:8]], indent=2)}

Publication duplicate check:
{json.dumps(publication_check, indent=2)}

Analyse the novelty and field of this paper."""

        response = await llm.ainvoke(
            [
                SystemMessage(content=RESEARCH_NODE_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        raw_output = str(response.content).strip()
        updates["research_llm_raw_output"] = raw_output
        novelty_data = json.loads(_strip_json_fences(raw_output))
        updates["research_analysis"] = novelty_data
        if publication_check.get("status") == "already_published":
            novelty_data["publication_check"] = publication_check
            novelty_data["novelty_warning"] = (
                "Semantic Scholar returned an exact or near-exact title match. "
                "Treat the manuscript as already published unless the user explicitly requested post-publication analysis."
            )
        updates["field"] = novelty_data.get("field", "General Science")
        if novelty_data.get("document_type_valid") is False:
            detected_type = novelty_data.get("document_type_detected") or "non-research document"
            updates["field"] = "N/A"
            updates["related_papers"] = []
            updates["progress_messages"].append(
                f"Document type detected: {detected_type}. Full peer review is not applicable."
            )
            return updates
        updates["progress_messages"].append(
            f"Field detected: {updates['field']}. Novelty score: {novelty_data.get('novelty_score', 'N/A')}"
        )
    except Exception as exc:
        user_message = format_model_error(exc)
        logger.error(
            "research_node error: %s",
            user_message,
            exc_info=not is_expected_model_auth_error(exc),
        )
        updates.setdefault("research_llm_raw_output", "")
        updates["error"] = f"Research node failed: {user_message}"
        updates["status"] = "failed"

    return updates
