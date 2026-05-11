"""Helpers for fetching human review examples from OpenReview."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

FIELD_TO_VENUES = {
    "Machine Learning": ["ICLR.cc/2025/Conference", "NeurIPS.cc/2024/Conference", "ICLR.cc/2024/Conference"],
    "Deep Learning": ["ICLR.cc/2025/Conference", "NeurIPS.cc/2024/Conference", "ICLR.cc/2024/Conference"],
    "Artificial Intelligence": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference", "ICLR.cc/2024/Conference"],
    "Computer Vision": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference", "ICLR.cc/2024/Conference"],
    "Natural Language Processing": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference", "ICLR.cc/2024/Conference"],
    "Reinforcement Learning": ["ICLR.cc/2025/Conference", "ICLR.cc/2024/Conference", "NeurIPS.cc/2024/Conference"],
    "Robotics": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference"],
    "Computational Biology": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference"],
    "Data Science": ["NeurIPS.cc/2024/Conference", "ICLR.cc/2025/Conference"],
    "default": ["ICLR.cc/2025/Conference", "NeurIPS.cc/2024/Conference", "ICLR.cc/2024/Conference"],
}

SUPPORTED_OPENREVIEW_FIELDS = {
    key for key in FIELD_TO_VENUES.keys() if key != "default"
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


def _relevance_score(query_tokens: set[str], title: str, abstract: str) -> int:
    """Score a candidate OpenReview paper against submitted-paper terms."""
    title_tokens = _query_tokens(title)
    abstract_tokens = _query_tokens(abstract)
    return (3 * len(query_tokens & title_tokens)) + len(query_tokens & abstract_tokens)


async def fetch_openreview_examples(
    title: str,
    abstract: str,
    field: str,
    max_examples: int = 3,
) -> list[dict]:
    """Fetch similar OpenReview submissions and a few real human reviews."""
    try:
        if field not in SUPPORTED_OPENREVIEW_FIELDS:
            logger.info("Skipping OpenReview examples for unsupported field: %s", field)
            return []

        import openreview

        client = openreview.api.OpenReviewClient(
            baseurl="https://api2.openreview.net"
        )
        venues = FIELD_TO_VENUES.get(field, FIELD_TO_VENUES["default"])
        keyword_query = " ".join((title or "").split()[:8]).strip()
        if not keyword_query:
            return []
        query_text = f"{title} {abstract} {field}"
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: _fetch_sync(client, venues, query_text, max_examples, field in SUPPORTED_OPENREVIEW_FIELDS),
        )
    except Exception as exc:
        logger.warning("OpenReview fetch failed: %s", exc)
        return []


def _fetch_sync(
    client: Any,
    venues: list[str],
    query_text: str,
    max_examples: int,
    allow_general_fallback: bool,
) -> list[dict]:
    """Synchronously fetch review examples from OpenReview."""
    query_words = _query_tokens(query_text)
    if not query_words:
        return []

    candidates: list[tuple[int, str, Any]] = []
    for venue in venues:
        try:
            submissions = client.get_notes(
                invitation=f"{venue}/-/Submission",
                limit=75,
                offset=0,
                sort="tcdate:desc",
            )
        except Exception as exc:
            logger.warning("OpenReview submission fetch failed for %s: %s", venue, exc)
            continue

        for submission in submissions or []:
            content = getattr(submission, "content", {}) or {}
            paper_title = _extract_value(content.get("title", {}))
            paper_abstract = _extract_value(content.get("abstract", {}))
            if not paper_title:
                continue
            score = _relevance_score(query_words, paper_title, paper_abstract)
            candidates.append((score, venue, submission))

    if not candidates:
        return []

    candidates.sort(key=lambda item: item[0], reverse=True)
    relevant_candidates = [item for item in candidates if item[0] >= 2]
    if not relevant_candidates and allow_general_fallback:
        relevant_candidates = candidates[:10]

    examples: list[dict] = []
    seen_forums: set[str] = set()
    for relevance, venue, submission in relevant_candidates[:30]:
        if getattr(submission, "id", "") in seen_forums:
            continue
        seen_forums.add(getattr(submission, "id", ""))

        content = getattr(submission, "content", {}) or {}
        paper_title = _extract_value(content.get("title", {}))

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
                "venue": venue,
                "relevance_score": relevance,
                "calibration_scope": "similar paper" if relevance >= 2 else "general venue calibration",
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
        "Some examples may be field-calibration examples when exact topical",
        "matches are unavailable; use them for reviewer tone, specificity,",
        "score calibration, and structure rather than as evidence about the",
        "submitted manuscript.",
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
                f"Venue: {example.get('venue', 'OpenReview')} | Scope: {example.get('calibration_scope', 'review calibration')}",
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
