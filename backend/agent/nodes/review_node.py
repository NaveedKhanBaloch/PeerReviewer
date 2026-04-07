"""Review node for generating the structured peer review."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import REVIEW_NODE_SYSTEM_PROMPT
from agent.state import AgentState
from core.config import settings

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


def _build_review_prompt(state: AgentState) -> str:
    """Build the user prompt from extracted paper and literature data."""
    sections_text = "\n\n".join(
        f"=== {name.upper()} ===\n{content[:3000]}"
        for name, content in state.get("sections", {}).items()
    )
    related_papers_text = "\n".join(
        f"- {paper.get('title', 'Unknown')} ({paper.get('year', 'N/A')}) — {paper.get('citation_count', 0)} citations"
        for paper in state.get("related_papers", [])[:10]
    )
    references_text = "\n".join(
        f"- {reference.get('title', 'Unknown')} ({reference.get('year', 'N/A')})"
        for reference in state.get("references", [])[:20]
    )

    return f"""PAPER TO REVIEW
===============
Title: {state.get('title', 'Unknown')}
Authors: {', '.join(state.get('authors', []))}
Field: {state.get('field', 'Unknown')}
Word count: {state.get('word_count', 0)} | Pages: {state.get('page_count', 0)}

ABSTRACT:
{state.get('abstract', 'Not available')}

PAPER SECTIONS:
{sections_text}

FIGURES ({len(state.get('figures', []))} total):
{chr(10).join(state.get('figures', [])[:10])}

TABLES ({len(state.get('tables', []))} total):
{chr(10).join(state.get('tables', [])[:10])}

REFERENCES:
{references_text if references_text else 'No references extracted'}

RELATED PAPERS FROM SEMANTIC SCHOLAR:
{related_papers_text if related_papers_text else 'No related papers found'}

INSTRUCTIONS:
Produce a complete, rigorous peer review of this paper following your system prompt.
Every critical issue must cite a specific section, table, or figure.
Return ONLY valid JSON."""


async def review_node(state: AgentState) -> dict:
    """Generate the final structured review with Gemini Pro."""
    updates: dict = {"progress_messages": [*state.get("progress_messages", [])]}
    if state.get("status") == "failed":
        return updates

    try:
        updates["progress_messages"].append(
            "Running peer review analysis with Gemini Pro (this takes 30-60 seconds)..."
        )
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_PRO_MODEL,
            temperature=0.2,
            google_api_key=settings.GEMINI_API_KEY,
            max_output_tokens=8000,
        )
        response = await llm.ainvoke(
            [
                SystemMessage(content=REVIEW_NODE_SYSTEM_PROMPT),
                HumanMessage(content=_build_review_prompt(state)),
            ]
        )
        raw_output = str(response.content).strip()
        updates["review_llm_raw_output"] = raw_output
        review_data = json.loads(_strip_json_fences(raw_output))

        validated_flaws = []
        for flaw in review_data.get("major_flaws", []):
            evidence = flaw.get("evidence", "")
            if evidence and any(
                keyword in evidence.lower()
                for keyword in ["section", "table", "figure", "abstract", "line", "page", "eq"]
            ):
                validated_flaws.append(flaw)
        review_data["major_flaws"] = validated_flaws

        updates.update(
            {
                "dimension_scores": review_data.get("dimension_scores", []),
                "overall_score": float(review_data.get("overall_score", 5.0)),
                "recommendation": review_data.get("recommendation", "Major revision"),
                "summary": review_data.get("summary", ""),
                "general_comments": review_data.get("general_comments", ""),
                "major_flaws": review_data.get("major_flaws", []),
                "minor_points": review_data.get("minor_points", []),
                "status": "complete",
            }
        )
        updates["progress_messages"].append(
            f"Review complete. Score: {updates['overall_score']:.1f}/10 — {updates['recommendation']}"
        )
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse review JSON: %s", exc, exc_info=True)
        updates.setdefault("review_llm_raw_output", raw_output if "raw_output" in locals() else "")
        updates["error"] = f"Review JSON parse error: {exc}"
        updates["status"] = "failed"
    except Exception as exc:
        logger.error("review_node error: %s", exc, exc_info=True)
        updates.setdefault("review_llm_raw_output", raw_output if "raw_output" in locals() else "")
        updates["error"] = f"Review node failed: {exc}"
        updates["status"] = "failed"

    return updates
