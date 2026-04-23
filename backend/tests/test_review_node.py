"""Regression tests for review-node output normalization."""

from __future__ import annotations

import pytest

from agent.graph import _route_after_research
from agent.nodes.research_node import _duplicate_publication_result, _title_candidates
from agent.nodes.review_node import _apply_publication_duplicate_guardrail, _load_json_output, _normalize_review_data, review_node
from services.lit_search import detect_publication_duplicate, titles_match_exact


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
        "publication_check": {},
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


def test_detect_publication_duplicate_marks_exact_related_title():
    """Exact Semantic Scholar title matches should stop review even without author overlap."""
    title = "Application Mapping Using Cuckoo Search Optimization With Lévy Flight for NoC-Based System"
    related = [
        {
            "title": "Application Mapping Using Cuckoo Search Optimization With Levy Flight for NoC-Based System",
            "authors": "Different Author, Someone Else",
            "year": 2021,
            "venue": "IEEE Access",
            "citation_count": 19,
        },
        {"title": "A Related NoC Mapping Algorithm", "year": 2020},
    ]

    result = detect_publication_duplicate(title, ["Naveed Khan"], related)

    assert result["status"] == "already_published"
    assert result["duplicate_confidence"] == "high"
    assert related[0]["duplicate_publication_match"] is True
    assert "Already published match" in related[0]["relevance_note"]
    assert "IEEE Access, 2021" in related[0]["relevance_note"]
    assert result["author_overlap"] == 0.0


def test_detect_publication_duplicate_does_not_stop_on_near_match():
    """Only exact normalized title matches should stop the review."""
    title = "Application Mapping Using Cuckoo Search Optimization With Levy Flight for NoC-Based System"
    related = [
        {
            "title": "Application Mapping Using Cuckoo Search Optimization for NoC-Based System",
            "authors": "Different Author",
            "year": 2021,
            "venue": "IEEE Access",
            "citation_count": 19,
        }
    ]

    result = detect_publication_duplicate(title, [], related)

    assert result["status"] == "not_found"
    assert titles_match_exact(title, related[0]["title"]) is False


def test_title_candidates_recover_title_when_pdf_header_is_noisy():
    """First-page title lines should be searched when extracted title is wrong."""
    full_text = """
Algorithms
Article
IWO-IGA - A Hybrid Whale Optimization Algorithm Featuring Improved Genetic Characteristics
for Mapping Real-Time Applications onto 2D Network on Chip
Abstract
This paper proposes a hybrid algorithm.
"""

    candidates = _title_candidates("Algorithms", full_text)

    assert any("IWO-IGA" in candidate for candidate in candidates)


def test_publication_duplicate_guardrail_forces_reject_and_low_originality():
    """Already-published checks must remove scoring and force rejection."""
    state = {
        **_base_state(),
        "title": "Application Mapping Using Cuckoo Search Optimization With Levy Flight for NoC-Based System",
        "research_analysis": {"document_type_valid": True},
        "publication_check": {
            "status": "already_published",
            "matched_title": "Application Mapping Using Cuckoo Search Optimization With Levy Flight for NoC-Based System",
            "matched_year": 2021,
            "matched_venue": "IEEE Access",
        },
    }
    model_review = {
        "dimension_scores": [
            {"dimension": "ORIGINALITY & SIGNIFICANCE", "score": 6.0},
            {"dimension": "ETHICS & REPRODUCIBILITY", "score": 6.0},
            {"dimension": "METHODOLOGY", "score": 6.0},
        ],
        "overall_score": 5.2,
        "recommendation": "Major revision",
        "summary": "The work is incremental.",
        "general_comments": "The paper needs revision.",
        "major_flaws": [],
        "minor_points": [],
    }

    guarded = _apply_publication_duplicate_guardrail(model_review, state)

    assert guarded["recommendation"] == "Reject"
    assert guarded["overall_score"] is None
    assert guarded["dimension_scores"] == []
    assert guarded["already_published"] is True
    assert "Already-published" in guarded["major_flaws"][0]["issue"]

    normalized = _normalize_review_data(guarded)
    assert normalized["recommendation"] == "Reject"
    assert normalized["overall_score"] is None
    assert normalized["dimension_scores"] == []


def test_model_duplicate_language_fallback_removes_scores():
    """If Gemini reports duplicate publication, the persisted result must not keep originality scoring."""
    state = {**_base_state(), "research_analysis": {"document_type_valid": True}, "publication_check": {}}
    model_review = {
        "dimension_scores": [{"dimension": "ORIGINALITY & SIGNIFICANCE", "score": 7.0}],
        "overall_score": 3.9,
        "recommendation": "Reject",
        "summary": "This manuscript has a duplicate publication concern.",
        "general_comments": "It is a verbatim copy of a previously published article.",
        "major_flaws": [
            {
                "issue": "Duplicate Publication",
                "evidence": "The manuscript is identical to a previously published article in Algorithms 2024.",
                "remedy": "Reject the manuscript.",
            }
        ],
        "minor_points": [],
    }

    guarded = _apply_publication_duplicate_guardrail(model_review, state)
    normalized = _normalize_review_data(guarded)

    assert normalized["recommendation"] == "Reject"
    assert normalized["overall_score"] is None
    assert normalized["dimension_scores"] == []
    assert "already published" in normalized["summary"].lower()


def test_duplicate_publication_result_is_terminal_without_review_model():
    """Confirmed published papers should stop before Gemini Pro review."""
    publication_check = {
        "status": "already_published",
        "duplicate_confidence": "high",
        "matched_title": "IWO-IGA - A Hybrid Whale Optimization Algorithm",
        "matched_year": 2024,
        "matched_venue": "Algorithms",
    }
    result = _duplicate_publication_result(
        {"title": "IWO-IGA - A Hybrid Whale Optimization Algorithm"},
        publication_check,
        [{"title": "IWO-IGA - A Hybrid Whale Optimization Algorithm", "relevance_note": "Already published match"}],
    )

    assert result["status"] == "complete"
    assert result["recommendation"] == "Reject"
    assert result["overall_score"] is None
    assert result["dimension_scores"] == []
    assert result["review_llm_raw_output"] == ""
    assert '"extracted_title": "IWO-IGA - A Hybrid Whale Optimization Algorithm"' in result["research_llm_raw_output"]
    assert "Skipped Gemini" in result["research_llm_raw_output"]
    assert _route_after_research({"status": "complete"}) == "end"
