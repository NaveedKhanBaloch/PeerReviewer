"""Research node for paper extraction and novelty assessment."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import RESEARCH_NODE_SYSTEM_PROMPT
from agent.state import AgentState
from core.config import settings
from services.lit_search import search_related_papers
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

        updates["progress_messages"].append("Analysing research field and novelty...")
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_FLASH_MODEL,
            temperature=0.1,
            google_api_key=settings.GEMINI_API_KEY,
        )
        user_prompt = f"""Paper abstract:
{paper["abstract"]}

Related papers from Semantic Scholar:
{json.dumps([{"title": p["title"], "abstract": p.get("abstract_snippet", ""), "year": p.get("year")} for p in related[:8]], indent=2)}

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
        updates["field"] = novelty_data.get("field", "General Science")
        updates["progress_messages"].append(
            f"Field detected: {updates['field']}. Novelty score: {novelty_data.get('novelty_score', 'N/A')}"
        )
    except Exception as exc:
        logger.error("research_node error: %s", exc, exc_info=True)
        updates.setdefault("research_llm_raw_output", "")
        updates["error"] = f"Research node failed: {exc}"
        updates["status"] = "failed"

    return updates
