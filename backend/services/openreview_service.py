"""Helpers for fetching human review examples from OpenReview."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

FIELD_TO_VENUE = {
    "Machine Learning": "ICLR.cc/2025/Conference",
    "Deep Learning": "ICLR.cc/2025/Conference",
    "Artificial Intelligence": "NeurIPS.cc/2024/Conference",
    "Computer Vision": "NeurIPS.cc/2024/Conference",
    "Natural Language Processing": "NeurIPS.cc/2024/Conference",
    "Reinforcement Learning": "ICLR.cc/2025/Conference",
    "Robotics": "NeurIPS.cc/2024/Conference",
    "Computational Biology": "NeurIPS.cc/2024/Conference",
    "Data Science": "NeurIPS.cc/2024/Conference",
    "default": "ICLR.cc/2025/Conference",
}

SUPPORTED_OPENREVIEW_FIELDS = {
    key for key in FIELD_TO_VENUE.keys() if key != "default"
}

OPENREVIEW_STOPWORDS = {
    "a", "an", "and", "approach", "based", "for", "from", "in", "of", "on", "paper",
    "study", "system", "the", "to", "using", "via", "with",
}


def _extract_value(value: Any) -> str:
    """Extract a string value from OpenReview v1/v2 content payloads."""
    if isinstance(value, dict):
        inner = value.get("value")
        if inner is None:
            return ""
        return str(inner).strip()
    if value is None:
        return ""
    return str(value).strip()


def _truncate(text: str, limit: int) -> str:
    """Truncate prompt text while keeping it readable."""
    cleaned = (text or "").strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rstrip()


def _query_tokens(text: str) -> set[str]:
    """Extract content-bearing tokens for coarse title relevance checks."""
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]+", text or "")
        if len(token) > 3 and token.lower() not in OPENREVIEW_STOPWORDS
    }


async def fetch_openreview_examples(
    title: str,
    abstract: str,
    field: str,
    max_examples: int = 3,
) -> list[dict]:
    """Fetch similar OpenReview submissions and a few real human reviews."""
    del abstract
    try:
        if field not in SUPPORTED_OPENREVIEW_FIELDS:
            logger.info("Skipping OpenReview examples for unsupported field: %s", field)
            return []

        import openreview

        client = openreview.api.OpenReviewClient(
            baseurl="https://api2.openreview.net"
        )
        venue = FIELD_TO_VENUE[field]
        keyword_query = " ".join((title or "").split()[:6]).strip()
        if not keyword_query:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: _fetch_sync(client, venue, keyword_query, max_examples),
        )
    except Exception as exc:
        logger.warning("OpenReview fetch failed: %s", exc)
        return []


def _fetch_sync(
    client: Any,
    venue: str,
    keyword_query: str,
    max_examples: int,
) -> list[dict]:
    """Synchronously fetch review examples from OpenReview."""
    try:
        submissions = client.get_notes(
            invitation=f"{venue}/-/Submission",
            limit=20,
            offset=0,
        )
    except Exception as exc:
        logger.warning("OpenReview submission fetch failed: %s", exc)
        return []

    if not submissions:
        return []

    examples: list[dict] = []
    query_words = _query_tokens(keyword_query)
    if not query_words:
        return []

    for submission in submissions[:30]:
        content = getattr(submission, "content", {}) or {}
        title_field = content.get("title", {})
        paper_title = _extract_value(title_field)
        if not paper_title:
            continue

        title_words = _query_tokens(paper_title)
        overlap = len(query_words & title_words)
        if overlap < 2:
            continue

        try:
            replies = client.get_notes(forum=submission.id, limit=50)
        except Exception as exc:
            logger.warning("OpenReview reply fetch failed for %s: %s", paper_title, exc)
            continue

        decision = "Unknown"
        reviews: list[dict] = []

        for reply in replies or []:
            reply_content = getattr(reply, "content", {}) or {}
            if not isinstance(reply_content, dict):
                continue

            if "decision" in reply_content and decision == "Unknown":
                decision_value = _extract_value(reply_content.get("decision"))
                if decision_value:
                    decision = decision_value

            if not any(key in reply_content for key in ("summary", "strengths", "soundness")):
                continue

            review = {
                "summary": _extract_value(reply_content.get("summary")),
                "strengths": _extract_value(reply_content.get("strengths")),
                "weaknesses": _extract_value(reply_content.get("weaknesses")),
                "questions": _extract_value(reply_content.get("questions")),
                "soundness": _extract_value(reply_content.get("soundness")),
                "presentation": _extract_value(reply_content.get("presentation")),
                "contribution": _extract_value(reply_content.get("contribution")),
                "rating": _extract_value(reply_content.get("rating")),
                "confidence": _extract_value(reply_content.get("confidence")),
            }

            if not review["summary"] and not review["strengths"]:
                continue

            reviews.append(review)
            if len(reviews) >= 2:
                break

        if not reviews:
            continue

        examples.append(
            {
                "paper_title": _truncate(paper_title, 100),
                "decision": decision,
                "reviews": reviews,
            }
        )
        if len(examples) >= max_examples:
            break

    return examples


def format_examples_for_prompt(examples: list[dict]) -> str:
    """Format OpenReview examples as a prompt block for Gemini."""
    if not examples:
        return ""

    lines = [
        "===============================================================",
        "REAL HUMAN PEER REVIEW EXAMPLES FROM OPENREVIEW.NET",
        "===============================================================",
        "These are actual peer reviews written by expert human reviewers",
        "at top-tier ML/AI conferences (ICLR, NeurIPS, ICML).",
        "",
        "Study these examples carefully before writing your review:",
        "  - Mirror their LEVEL OF SPECIFICITY (cite exact sections/tables)",
        "  - Mirror their SCORE CALIBRATION (what a 6 vs 8 actually means)",
        "  - Mirror their CONSTRUCTIVE TONE (critical but helpful)",
        "  - Mirror their STRUCTURE (summary → strengths → weaknesses → questions)",
        "",
        "===============================================================",
        "",
    ]

    total = len(examples)
    for i, example in enumerate(examples, start=1):
        lines.extend(
            [
                f"--- Example {i} of {total} ---",
                f"Paper: {example.get('paper_title', 'Unknown paper')}",
                f"Decision: {example.get('decision', 'Unknown')}",
                "",
            ]
        )
        for j, review in enumerate((example.get("reviews") or [])[:2], start=1):
            lines.extend(
                [
                    f"Reviewer {j}:",
                    f"Summary: {_truncate(str(review.get('summary') or '(not provided)'), 500) if review.get('summary') else '(not provided)'}",
                    f"Strengths: {_truncate(str(review.get('strengths') or '(not provided)'), 500) if review.get('strengths') else '(not provided)'}",
                    f"Weaknesses: {_truncate(str(review.get('weaknesses') or '(not provided)'), 500) if review.get('weaknesses') else '(not provided)'}",
                    "Soundness: "
                    f"{review.get('soundness') or '(not provided)'} | "
                    f"Presentation: {review.get('presentation') or '(not provided)'} | "
                    f"Contribution: {review.get('contribution') or '(not provided)'}",
                    f"Overall Rating: {review.get('rating') or '(not provided)'} | Confidence: {review.get('confidence') or '(not provided)'}",
                    "",
                ]
            )

    lines.extend(
        [
            "===============================================================",
            "END OF EXAMPLES — NOW REVIEW THE SUBMITTED MANUSCRIPT BELOW",
            "===============================================================",
            "Apply the scoring calibration and specificity you observed above.",
            "Every strength and weakness you write must cite a specific location",
            "in the submitted paper (section, table, figure, or line number).",
            "===============================================================",
        ]
    )
    return "\n".join(lines)
