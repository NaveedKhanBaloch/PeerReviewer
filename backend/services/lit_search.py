"""Semantic Scholar literature search service."""

from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher

import aiohttp

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "we", "with",
    "using", "use", "via", "our", "paper", "study", "method", "results", "based",
}


def normalize_title_for_match(title: str) -> str:
    """Normalize a title for duplicate-publication matching."""
    ascii_title = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode("ascii")
    words = re.findall(r"[a-z0-9]+", ascii_title.lower())
    return " ".join(words)


def _author_tokens(authors: list[str] | str | None) -> set[str]:
    """Extract stable author-name tokens for loose overlap checks."""
    if not authors:
        return set()
    author_text = ", ".join(authors) if isinstance(authors, list) else authors
    tokens = set()
    for chunk in re.split(r"[,;]", author_text):
        parts = re.findall(r"[A-Za-z][A-Za-z'-]+", chunk.lower())
        tokens.update(part for part in parts if len(part) > 2)
    return tokens


def detect_publication_duplicate(title: str, authors: list[str], related_papers: list[dict]) -> dict:
    """Detect whether Semantic Scholar returned the uploaded paper itself."""
    source_title = normalize_title_for_match(title)
    if not source_title:
        return {"status": "not_found", "duplicate_confidence": "none", "matches": []}

    source_authors = _author_tokens(authors)
    matches = []
    for paper in related_papers:
        candidate_title = normalize_title_for_match(str(paper.get("title") or ""))
        if not candidate_title:
            continue

        title_similarity = SequenceMatcher(None, source_title, candidate_title).ratio()
        exact_title = source_title == candidate_title
        candidate_authors = _author_tokens(paper.get("authors"))
        author_overlap = 0.0
        if source_authors and candidate_authors:
            author_overlap = len(source_authors & candidate_authors) / max(1, min(len(source_authors), len(candidate_authors)))

        has_publication_metadata = bool(
            paper.get("year")
            or paper.get("venue")
            or paper.get("publication_venue")
            or paper.get("external_ids")
        )
        if not (exact_title or title_similarity >= 0.92):
            continue

        confidence = "high" if exact_title else "medium"
        if author_overlap >= 0.5:
            confidence = "high"
        if confidence == "medium" and not has_publication_metadata:
            continue

        match = {
            "title": paper.get("title"),
            "year": paper.get("year"),
            "venue": paper.get("venue") or paper.get("publication_venue"),
            "s2_paper_id": paper.get("s2_paper_id"),
            "external_ids": paper.get("external_ids") or {},
            "title_similarity": round(title_similarity, 3),
            "author_overlap": round(author_overlap, 3),
            "confidence": confidence,
            "reason": "Exact title match found in Semantic Scholar." if exact_title else "Near-exact title match found in Semantic Scholar.",
        }
        matches.append(match)
        paper["duplicate_publication_match"] = True
        paper["relevance_note"] = (
            "Already published match: "
            f"{match['reason']} Treat this as a duplicate-publication/originality concern."
        )

    if not matches:
        return {"status": "not_found", "duplicate_confidence": "none", "matches": []}

    best_match = sorted(
        matches,
        key=lambda item: (item["confidence"] == "high", item["title_similarity"], item["author_overlap"]),
        reverse=True,
    )[0]
    return {
        "status": "already_published",
        "duplicate_confidence": best_match["confidence"],
        "matched_title": best_match["title"],
        "matched_year": best_match["year"],
        "matched_venue": best_match["venue"],
        "matched_s2_paper_id": best_match["s2_paper_id"],
        "matched_external_ids": best_match["external_ids"],
        "title_similarity": best_match["title_similarity"],
        "author_overlap": best_match["author_overlap"],
        "reason": best_match["reason"],
        "matches": matches,
    }


def _extract_keywords(title: str, abstract: str) -> list[str]:
    """Extract high-signal content keywords from title and abstract."""
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-]+", f"{title} {abstract}".lower())
    filtered = [word for word in words if len(word) > 2 and word not in STOPWORDS]
    return [word for word, _ in Counter(filtered).most_common(6)]


def _paper_key(paper: dict) -> str:
    """Build a stable key for merging Semantic Scholar result sets."""
    return str(paper.get("paperId") or normalize_title_for_match(str(paper.get("title") or "")))


def _normalize_semantic_paper(paper: dict) -> dict:
    """Normalize one Semantic Scholar paper payload."""
    authors = ", ".join(author.get("name", "") for author in paper.get("authors", []) if author.get("name"))
    abstract_text = (paper.get("abstract") or "").strip()
    return {
        "s2_paper_id": paper.get("paperId"),
        "title": paper.get("title", "Untitled"),
        "authors": authors or None,
        "year": paper.get("year"),
        "venue": paper.get("venue"),
        "publication_venue": (paper.get("publicationVenue") or {}).get("name"),
        "publication_types": paper.get("publicationTypes") or [],
        "external_ids": paper.get("externalIds") or {},
        "url": paper.get("url"),
        "citation_count": paper.get("citationCount", 0),
        "abstract_snippet": abstract_text[:300],
    }


async def _semantic_scholar_search(session: aiohttp.ClientSession, query: str, api_key: str, limit: int) -> list[dict]:
    """Run one Semantic Scholar search query."""
    params = {
        "query": query,
        "fields": "paperId,title,abstract,year,authors,citationCount,externalIds,venue,publicationVenue,publicationTypes,url",
        "limit": limit,
    }
    headers = {"x-api-key": api_key} if api_key else {}
    async with session.get(
        "https://api.semanticscholar.org/graph/v1/paper/search",
        params=params,
        headers=headers,
    ) as response:
        response.raise_for_status()
        payload = await response.json()
    return payload.get("data", [])


async def search_related_papers(title: str, abstract: str, api_key: str) -> list[dict]:
    """Search Semantic Scholar by exact title and keywords, then return normalized results."""
    keywords = _extract_keywords(title, abstract)
    exact_title_query = " ".join(normalize_title_for_match(title).split())
    if not keywords and not exact_title_query:
        return []

    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            paper_map: dict[str, dict] = {}
            if exact_title_query:
                for paper in await _semantic_scholar_search(session, exact_title_query, api_key, 10):
                    paper_map[_paper_key(paper)] = paper
            if keywords:
                for paper in await _semantic_scholar_search(session, " ".join(keywords), api_key, 15):
                    paper_map.setdefault(_paper_key(paper), paper)
    except Exception as exc:
        logger.warning("Semantic Scholar search failed: %s", exc)
        return []

    papers = list(paper_map.values())
    if not papers:
        logger.warning("Semantic Scholar returned zero results for title/query: %s", title)
        return []

    normalized = [_normalize_semantic_paper(paper) for paper in papers]
    duplicate_check = detect_publication_duplicate(title, [], normalized)
    duplicate_ids = {match.get("s2_paper_id") for match in duplicate_check.get("matches", [])}

    return sorted(
        normalized,
        key=lambda item: (
            item.get("s2_paper_id") in duplicate_ids or item.get("duplicate_publication_match") is True,
            item.get("citation_count") or 0,
        ),
        reverse=True,
    )
