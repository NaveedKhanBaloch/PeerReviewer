"""Research node for paper extraction and novelty assessment."""

from __future__ import annotations

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.errors import format_model_error, is_expected_model_auth_error
from agent.progress import emit_progress
from agent.prompts import RESEARCH_NODE_SYSTEM_PROMPT
from agent.state import AgentState
from core.config import settings
from services.lit_search import search_related_papers_with_diagnostics, titles_match_exact
from services.openreview_service import (
    fetch_openreview_examples,
    format_examples_for_prompt,
)
from services.pdf_extractor import extract_paper

logger = logging.getLogger(__name__)

TITLE_EXTRACTION_SYSTEM_PROMPT = """You extract the exact paper title and a clean Semantic Scholar search query from the first page of an academic PDF.
Return ONLY valid JSON with this schema:
{"title":"string","semantic_scholar_query":"string","query_keywords":["string"]}
Rules:
- Use only the first page text provided.
- Search for the manuscript title only in the text that appears BEFORE the keyword "Abstract" (or "ABSTRACT").
- Do NOT guess the title from the abstract body or any text after the abstract heading.
- Return the full manuscript title, not a journal name, header, section label, abstract heading, or author list.
- If the title is not clearly present before the abstract heading, return title as an empty string "".
- semantic_scholar_query must be a short, intelligent search query for finding the paper and related work on Semantic Scholar.
- semantic_scholar_query should usually be 4-10 words, based on distinctive technical terms from the visible first-page content.
- query_keywords should contain 3-6 short technical keyword phrases.
- Prefer the best complete title if the text is noisy or line-broken.
- Never return abstract paragraphs as the title."""

TITLE_MATCH_SYSTEM_PROMPT = """You compare one extracted manuscript title against a list of Semantic Scholar titles.
Return ONLY valid JSON with this schema:
{
  "matched": true,
  "matched_title": "string or null",
  "reason": "string"
}
Rules:
- Decide whether any listed title is the same paper as the extracted title.
- Treat punctuation, dash variants, line-break artifacts, and harmless unicode differences as the same title.
- Do NOT match merely related or similar papers.
- Be STRICT: return matched=true only when all substantive title words match the same paper title after ignoring punctuation, dash variants, capitalization, and harmless unicode differences.
- If important title words are missing, replaced, or paraphrased, return matched=false.
- Do NOT infer a title match from abstract meaning, topic similarity, methodology similarity, or domain overlap.
- Match titles, not descriptions.
- Only return matched=true when the titles themselves refer to the same paper.
- If no exact/same-paper match exists, return matched=false and matched_title=null."""


def _title_candidates(extracted_title: str, full_text: str) -> list[str]:
    """Build a few likely title candidates when PDF extraction picks up header noise."""
    candidates = []
    if extracted_title:
        candidates.append(extracted_title)

    lines = [re.sub(r"\s+", " ", line).strip() for line in full_text.splitlines()[:80]]
    lines = [line for line in lines if line]
    blocked = ("abstract", "introduction", "keywords", "doi", "journal", "copyright", "received", "accepted")
    for index, line in enumerate(lines):
        lower = line.lower()
        word_count = len(line.split())
        if word_count < 4 or word_count > 24:
            continue
        if any(token in lower for token in blocked):
            continue
        if not re.search(r"[A-Za-z]{4}", line):
            continue
        candidates.append(line)
        if index + 1 < len(lines):
            combined = f"{line} {lines[index + 1]}"
            combined_words = len(combined.split())
            if 6 <= combined_words <= 28 and not any(token in combined.lower() for token in blocked):
                candidates.append(combined)
        if len(candidates) >= 6:
            break

    deduped = []
    seen = set()
    for candidate in candidates:
        key = re.sub(r"[^a-z0-9]+", " ", candidate.lower()).strip()
        if key and key not in seen:
            seen.add(key)
            deduped.append(candidate)
    return deduped[:5]


def _trim_first_page_before_abstract(first_page_text: str) -> str:
    """Keep only the first-page content before the abstract heading when possible."""
    if not first_page_text.strip():
        return ""
    match = re.search(r"\babstract\b", first_page_text, flags=re.IGNORECASE)
    if not match:
        return first_page_text
    return first_page_text[: match.start()].strip()


def _is_bad_title_candidate(value: str) -> bool:
    """Detect extracted title strings that are clearly abstract-like noise."""
    cleaned = " ".join((value or "").split()).strip()
    if not cleaned:
        return True
    lowered = cleaned.lower()
    if lowered.startswith("abstract "):
        return True
    if len(cleaned) > 220:
        return True
    sentence_markers = sum(cleaned.count(marker) for marker in (". ", "; ", ": "))
    if sentence_markers >= 2:
        return True
    return False


async def _extract_search_metadata_with_gemini(first_page_text: str, heuristic_title: str) -> dict:
    """Use Gemini Flash to extract the title and a clean Semantic Scholar query."""
    if not first_page_text.strip():
        return {
            "title": heuristic_title if not _is_bad_title_candidate(heuristic_title) else "",
            "semantic_scholar_query": " ".join(_title_candidates(heuristic_title, heuristic_title)[:1]).strip(),
            "query_keywords": [],
        }

    pre_abstract_text = _trim_first_page_before_abstract(first_page_text)

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_FLASH_MODEL,
        temperature=0,
        google_api_key=settings.GEMINI_API_KEY,
        response_mime_type="application/json",
    )
    response = await llm.ainvoke(
        [
            SystemMessage(content=TITLE_EXTRACTION_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Heuristic title candidate:\n{heuristic_title}\n\n"
                    f"First page text before abstract:\n{pre_abstract_text[:8000]}\n\n"
                    f"Full first page text:\n{first_page_text[:12000]}"
                )
            ),
        ]
    )
    payload = json.loads(_strip_json_fences(str(response.content).strip()))
    title = str(payload.get("title") or "").strip()
    semantic_scholar_query = str(payload.get("semantic_scholar_query") or "").strip()
    query_keywords = [
        str(item).strip()
        for item in payload.get("query_keywords", [])
        if str(item).strip()
    ][:6]

    if _is_bad_title_candidate(title):
        title = ""
    if not semantic_scholar_query:
        semantic_scholar_query = " ".join(query_keywords[:5]).strip()
    if not semantic_scholar_query and title:
        semantic_scholar_query = " ".join(re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]+", title)[:10]).strip()

    return {
        "title": title,
        "semantic_scholar_query": semantic_scholar_query,
        "query_keywords": query_keywords,
    }


async def _match_title_against_related_with_gemini(extracted_title: str, related_papers: list[dict]) -> dict:
    """Use Gemini Flash to decide whether any Semantic Scholar title matches the extracted title."""
    if not extracted_title.strip() or not related_papers:
        return {"matched": False, "matched_title": None, "reason": "No titles available to compare."}

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_FLASH_MODEL,
        temperature=0,
        google_api_key=settings.GEMINI_API_KEY,
        response_mime_type="application/json",
    )
    related_titles = [
        {
            "title": str(paper.get("title") or ""),
            "year": paper.get("year"),
            "venue": paper.get("venue") or paper.get("publication_venue"),
        }
        for paper in related_papers
        if paper.get("title")
    ]
    response = await llm.ainvoke(
        [
            SystemMessage(content=TITLE_MATCH_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Extracted manuscript title:\n{extracted_title}\n\n"
                    f"Semantic Scholar titles:\n{json.dumps(related_titles, ensure_ascii=False, indent=2)}"
                )
            ),
        ]
    )
    payload = json.loads(_strip_json_fences(str(response.content).strip()))
    matched = bool(payload.get("matched"))
    matched_title = str(payload.get("matched_title") or "").strip() or None
    reason = str(payload.get("reason") or "").strip()

    if matched and matched_title and not titles_match_exact(extracted_title, matched_title):
        return {
            "matched": False,
            "matched_title": None,
            "reason": (
                "Gemini proposed a match, but the extracted title and Semantic Scholar title "
                "did not pass strict exact normalized title matching."
            ),
        }

    return {
        "matched": matched,
        "matched_title": matched_title,
        "reason": reason,
    }


def _merge_related_papers(existing: list[dict], incoming: list[dict]) -> list[dict]:
    """Merge Semantic Scholar results without dropping duplicate-publication annotations."""
    merged: dict[str, dict] = {}
    for paper in [*existing, *incoming]:
        key = str(paper.get("s2_paper_id") or paper.get("title") or "")
        if not key:
            continue
        current = merged.get(key, {})
        merged[key] = {**current, **paper}
    return sorted(
        merged.values(),
        key=lambda item: (
            item.get("duplicate_publication_match") is True,
            item.get("citation_count") or 0,
        ),
        reverse=True,
    )


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


def _update_research_raw_output(payload: dict, updates: dict) -> None:
    """Persist debugging metadata for the research node as a JSON string."""
    existing_raw = updates.get("research_llm_raw_output", "")
    try:
        current = json.loads(existing_raw) if existing_raw else {}
        if not isinstance(current, dict):
            current = {}
    except json.JSONDecodeError:
        current = {"gemini_output": existing_raw} if existing_raw else {}
    current.update(payload)
    updates["research_llm_raw_output"] = json.dumps(current)


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
                "severity": "critical",
            }
        ],
        "minor_points": [],
        "related_papers": related,
        "research_llm_raw_output": json.dumps(
            {
                "heuristic_title": state.get("heuristic_title"),
                "extracted_title": state.get("title"),
                "title_candidates_checked": state.get("title_candidates_checked", []),
                "publication_check": publication_check,
                "literature_search_diagnostics": state.get("literature_search_diagnostics", {}),
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
        await emit_progress(state["review_id"], "extracting", "Extracting paper content")
        paper = await extract_paper(
            pdf_bytes=state.get("paper_bytes"),
            arxiv_id=state.get("arxiv_id"),
            grobid_url=settings.GROBID_URL,
        )

        updates.update(
            {
                "title": paper["title"],
                "heuristic_title": paper["title"],
                "authors": paper["authors"],
                "abstract": paper["abstract"],
                "full_text": paper["full_text"],
                "first_page_text": paper.get("first_page_text", ""),
                "sections": paper["sections"],
                "figures": paper["figures"],
                "tables": paper["tables"],
                "references": paper["references"],
                "word_count": paper["word_count"],
                "page_count": paper["page_count"],
            }
        )
        search_metadata = await _extract_search_metadata_with_gemini(
            str(paper.get("first_page_text") or ""),
            str(paper["title"]),
        )
        gemini_title = str(search_metadata.get("title") or "").strip()
        semantic_scholar_query = str(search_metadata.get("semantic_scholar_query") or "").strip()
        query_keywords = search_metadata.get("query_keywords", [])
        updates["title"] = gemini_title or paper["title"]
        updates["progress_messages"].append(
            f"Paper extracted: {(gemini_title or paper['title'])[:60]}... ({paper['page_count']} pages)"
        )
        logger.info("Extracted title from PDF with Gemini: %s", gemini_title or "(empty)")
        logger.info("Semantic Scholar query from Gemini: %s", semantic_scholar_query or "(empty)")

        updates["progress_messages"].append("Searching related literature...")
        await emit_progress(state["review_id"], "literature", "Searching related literature")
        related_result = await search_related_papers_with_diagnostics(
            title=gemini_title,
            abstract=paper["abstract"],
            api_key=settings.SEMANTIC_SCHOLAR_API_KEY,
            search_query=semantic_scholar_query,
            references=paper["references"],
        )
        related = list(related_result.get("papers", []))
        literature_diagnostics = dict(related_result.get("diagnostics", {}))
        updates["literature_search_diagnostics"] = literature_diagnostics
        updates["title_candidates_checked"] = [value for value in [gemini_title, semantic_scholar_query, *query_keywords] if value]

        logger.info("Extracted title:\n%s\n", gemini_title or "(empty)")
        related_titles = [str(item.get("title") or "") for item in related if item.get("title")]
        logger.info("Semantic Scholar related paper titles:\n%s\n", "\n".join(related_titles) if related_titles else "(none)")
        title_match = await _match_title_against_related_with_gemini(gemini_title, related)
        logger.info(
            "Gemini title-match verdict:\nmatched=%s\nmatched_title=%s\nreason=%s\n",
            title_match.get("matched"),
            title_match.get("matched_title"),
            title_match.get("reason"),
        )

        publication_check = {"status": "not_found", "duplicate_confidence": "none", "matches": []}
        if title_match.get("matched"):
            matched_title = str(title_match.get("matched_title") or gemini_title)
            matched_paper = next((paper for paper in related if str(paper.get("title") or "") == matched_title), None)
            if matched_paper is None and related:
                matched_paper = next((paper for paper in related if paper.get("title")), related[0])
            if matched_paper is not None:
                venue = matched_paper.get("venue") or matched_paper.get("publication_venue")
                year = matched_paper.get("year")
                external_ids = matched_paper.get("external_ids") or {}
                published_in = ", ".join(
                    str(value) for value in [venue, year] if value not in (None, "", "N/A")
                ) or "Semantic Scholar"
                doi = external_ids.get("DOI") if isinstance(external_ids, dict) else None
                doi_note = f" DOI: {doi}." if doi else ""
                matched_paper["duplicate_publication_match"] = True
                matched_paper["relevance_note"] = (
                    f"Already published match: Published in {published_in}.{doi_note} {title_match.get('reason')}".strip()
                )
                publication_check = {
                    "status": "already_published",
                    "duplicate_confidence": "high",
                    "matched_title": matched_paper.get("title"),
                    "matched_year": year,
                    "matched_venue": venue,
                    "matched_s2_paper_id": matched_paper.get("s2_paper_id"),
                    "matched_external_ids": external_ids,
                    "reason": title_match.get("reason") or "Gemini confirmed the extracted title matches a Semantic Scholar record.",
                    "source_title_checked": gemini_title,
                    "matches": [
                        {
                            "title": matched_paper.get("title"),
                            "year": year,
                            "venue": venue,
                            "s2_paper_id": matched_paper.get("s2_paper_id"),
                            "external_ids": external_ids,
                            "confidence": "high",
                            "reason": title_match.get("reason") or "Gemini confirmed a title match.",
                        }
                    ],
                }

        updates["related_papers"] = related
        if literature_diagnostics.get("status") == "limited_results":
            updates["progress_messages"].append(
                f"Found only {len(related)} related papers after title, keyword, and reference fallback searches"
            )
        elif literature_diagnostics.get("status") == "no_results":
            updates["progress_messages"].append(
                "No related papers found after title, keyword, and reference fallback searches"
            )
        else:
            updates["progress_messages"].append(
                f"Found {len(related)} related papers on Semantic Scholar"
            )

        updates["publication_check"] = publication_check
        if publication_check.get("status") == "already_published":
            updates["progress_messages"].append(
                "Already-published title match detected in Semantic Scholar; skipping Gemini review"
            )
            updates.update(_duplicate_publication_result(updates, publication_check, related))
            return updates

        updates["progress_messages"].append("Analysing research field and novelty...")
        await emit_progress(state["review_id"], "analysing", "Analysing research field and novelty")
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

Literature search diagnostics:
{json.dumps({
    "status": literature_diagnostics.get("status"),
    "result_count": literature_diagnostics.get("result_count"),
    "query_strategy": literature_diagnostics.get("query_strategy"),
    "queries_attempted": [
        {"type": attempt.get("type"), "query": attempt.get("query"), "returned": attempt.get("returned")}
        for attempt in literature_diagnostics.get("attempts", [])[:8]
    ],
}, indent=2)}

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
        updates["research_llm_raw_output"] = json.dumps(
            {
                "heuristic_title": paper["title"],
                "extracted_title": gemini_title,
                "semantic_scholar_query": semantic_scholar_query,
                "query_keywords": query_keywords,
                "title_candidates_checked": updates["title_candidates_checked"],
                "literature_search_diagnostics": literature_diagnostics,
                "gemini_output": raw_output,
            }
        )
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

        try:
            updates["progress_messages"].append(
                "Fetching real peer review examples from OpenReview..."
            )
            await emit_progress(
                state["review_id"],
                "openreview",
                "Fetching real peer review examples from OpenReview...",
            )
            examples = await fetch_openreview_examples(
                title=updates.get("title") or state.get("title", ""),
                abstract=updates.get("abstract") or state.get("abstract", ""),
                field=updates.get("field") or state.get("field", "default"),
                max_examples=3,
            )
            prompt_block = format_examples_for_prompt(examples)
            updates["openreview_examples_prompt"] = prompt_block

            if examples:
                total_reviews = sum(len(example.get("reviews", [])) for example in examples)
                updates["progress_messages"].append(
                    f"Found {len(examples)} similar papers with {total_reviews} "
                    f"real human reviews from OpenReview — using as calibration examples"
                )
            else:
                updates["openreview_examples_prompt"] = ""
                updates["progress_messages"].append(
                    "No similar OpenReview examples found — proceeding without examples"
                )
            _update_research_raw_output(
                {
                    "openreview_examples_prompt": updates.get("openreview_examples_prompt", ""),
                    "openreview_examples_count": len(examples),
                },
                updates,
            )
        except Exception as exc:
            logger.warning("OpenReview fetch failed (non-fatal, pipeline continues): %s", exc)
            updates["openreview_examples_prompt"] = ""
            _update_research_raw_output(
                {
                    "openreview_examples_prompt": "",
                    "openreview_examples_count": 0,
                },
                updates,
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
