"""Regression tests for review-node output normalization."""

from __future__ import annotations

import pytest

from agent.nodes.review_node import _load_json_output, _normalize_review_data, review_node


def _base_state() -> dict:
    return {
        "paper_bytes": None,
        "arxiv_id": None,
        "review_id": "test-review",
        "title": "Uploaded Reference Letter",
        "authors": [],
        "abstract": "",
        "full_text": "This is a reference letter.",
        "sections": {},
        "figures": [],
        "tables": [],
        "references": [],
        "word_count": 5,
        "page_count": 1,
        "field": "N/A",
        "research_analysis": {
            "document_type_valid": False,
            "document_type_detected": "reference letter",
            "desk_rejection_reason": "The uploaded document is a reference letter, not a research manuscript.",
        },
        "related_papers": [
            {
                "title": "Unrelated Scholarly Paper",
                "authors": "A. Researcher",
                "year": 2024,
                "citation_count": 10,
            }
        ],
        "research_llm_raw_output": "",
        "dimension_scores": [],
        "overall_score": None,
        "recommendation": None,
        "summary": "",
        "general_comments": "",
        "major_flaws": [],
        "minor_points": [],
        "review_llm_raw_output": "",
        "progress_messages": [],
        "error": None,
        "status": "processing",
        "messages": [],
    }


@pytest.mark.asyncio
async def test_review_node_completes_non_research_document_without_score():
    """Non-research documents should not crash when scores are not applicable."""
    result = await review_node(_base_state())

    assert result["status"] == "complete"
    assert result["overall_score"] is None
    assert result["recommendation"] is None
    assert result["dimension_scores"] == []
    assert result["related_papers"] == []
    assert "reference letter" in result["summary"]


def test_normalize_review_data_accepts_null_score_for_desk_rejection():
    """Desk-rejection model JSON may legitimately set overall_score to null."""
    result = _normalize_review_data(
        {
            "desk_rejected": True,
            "dimension_scores": [],
            "overall_score": None,
            "recommendation": "Not applicable — document is not a research manuscript",
            "summary": "This appears to be a reference letter.",
            "general_comments": "Please upload a complete research manuscript.",
            "major_flaws": [],
            "minor_points": [],
        }
    )

    assert result["overall_score"] is None
    assert result["recommendation"] is None
    assert result["status"] == "complete"


def test_load_json_output_accepts_fenced_json():
    """Gemini sometimes wraps JSON in markdown fences despite instructions."""
    assert _load_json_output('```json\n{"overall_score": 7.2}\n```') == {"overall_score": 7.2}


def test_load_json_output_rejects_malformed_json():
    """Malformed output should trigger the repair path in review_node."""
    with pytest.raises(Exception):
        _load_json_output('{"summary": "unfinished')
