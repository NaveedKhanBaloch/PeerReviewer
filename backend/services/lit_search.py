"""Semantic Scholar literature search service."""

from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
import aiohttp

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "we", "with",
    "using", "use", "via", "our", "paper", "study", "method", "results", "based",
    "journal", "article", "published", "volume", "issue", "pages", "doi",
}


def normalize_title_for_match(title: str) -> str:
    """Normalize a title for duplicate-publication matching."""
    ascii_title = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode("ascii")
    words = re.findall(r"[a-z0-9]+", ascii_title.lower())
    return " ".join(words)


def _title_tokens(title: str) -> list[str]:
    """Return content-bearing normalized title tokens."""
    return [
        token
        for token in normalize_title_for_match(title).split()
        if len(token) > 2 and token not in STOPWORDS
    ]


def _token_containment(source_title: str, candidate_title: str) -> float:
    """Measure whether one title's content tokens are contained in the other."""
    source_tokens = set(_title_tokens(source_title))
    candidate_tokens = set(_title_tokens(candidate_title))
    if not source_tokens or not candidate_tokens:
        return 0.0
    return len(source_tokens & candidate_tokens) / max(1, min(len(source_tokens), len(candidate_tokens)))


def _title_search_queries(title: str) -> list[str]:
    """Build robust title-search queries from raw and normalized title text."""
    raw_title = " ".join((title or "").split())
    normalized_title = " ".join(normalize_title_for_match(title).split())
    tokens = _title_tokens(title)
    queries = [raw_title, normalized_title]
    if len(tokens) >= 6:
        queries.append(" ".join(tokens[:12]))
    deduped = []
    for query in queries:
        if query and query not in deduped:
            deduped.append(query)
    return deduped


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


def titles_match_exact(source_title: str, candidate_title: str) -> bool:
    """Return True only when normalized titles are exactly equal."""
    normalized_source = normalize_title_for_match(source_title)
    normalized_candidate = normalize_title_for_match(candidate_title)
    return bool(normalized_source) and normalized_source == normalized_candidate


def detect_publication_duplicate(title: str, authors: list[str], related_papers: list[dict]) -> dict:
    """Detect whether Semantic Scholar returned the uploaded paper itself.

    Title match alone is sufficient to stop review; author overlap is diagnostic only.
    """
    source_title = normalize_title_for_match(title)
    if not source_title:
        return {"status": "not_found", "duplicate_confidence": "none", "matches": []}

    source_authors = _author_tokens(authors)
    matches = []
    for paper in related_papers:
        candidate_title = normalize_title_for_match(str(paper.get("title") or ""))
        if not candidate_title:
            continue

        exact_title = source_title == candidate_title
        candidate_authors = _author_tokens(paper.get("authors"))
        author_overlap = 0.0
        if source_authors and candidate_authors:
            author_overlap = len(source_authors & candidate_authors) / max(1, min(len(source_authors), len(candidate_authors)))

        if not exact_title:
            continue

        match = {
            "title": paper.get("title"),
            "year": paper.get("year"),
            "venue": paper.get("venue") or paper.get("publication_venue"),
            "s2_paper_id": paper.get("s2_paper_id"),
            "external_ids": paper.get("external_ids") or {},
            "title_similarity": 1.0,
            "title_token_containment": 1.0,
            "author_overlap": round(author_overlap, 3),
            "confidence": "high",
            "reason": "Exact title match found in Semantic Scholar.",
        }
        matches.append(match)
        published_in = ", ".join(
            str(value)
            for value in [match["venue"], match["year"]]
            if value not in (None, "", "N/A")
        ) or "Semantic Scholar"
        doi = match["external_ids"].get("DOI") if isinstance(match["external_ids"], dict) else None
        doi_note = f" DOI: {doi}." if doi else ""
        paper["duplicate_publication_match"] = True
        paper["relevance_note"] = (
            f"Already published match: {match['reason']} Published in {published_in}.{doi_note} "
            "Treat this as a duplicate-publication/originality concern."
        )

    if not matches:
        return {"status": "not_found", "duplicate_confidence": "none", "matches": []}

    best_match = sorted(
        matches,
        key=lambda item: (
            item["confidence"] == "high",
            item["title_token_containment"],
            item["title_similarity"],
            item["author_overlap"],
        ),
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
        "title_token_containment": best_match["title_token_containment"],
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


async def _semantic_scholar_title_match(session: aiohttp.ClientSession, query: str, api_key: str) -> list[dict]:
    """Ask Semantic Scholar for its best title match."""
    params = {
        "query": query,
        "fields": "paperId,title,abstract,year,authors,citationCount,externalIds,venue,publicationVenue,publicationTypes,url",
    }
    headers = {"x-api-key": api_key} if api_key else {}
    async with session.get(
        "https://api.semanticscholar.org/graph/v1/paper/search/match",
        params=params,
        headers=headers,
    ) as response:
        response.raise_for_status()
        payload = await response.json()
    data = payload.get("data", [])
    if isinstance(data, dict):
        return [data]
    return data if isinstance(data, list) else []


async def search_related_papers(title: str, abstract: str, api_key: str) -> list[dict]:
    """Search Semantic Scholar by exact title and keywords, then return normalized results."""
    keywords = _extract_keywords(title, abstract)
    title_queries = _title_search_queries(title)
    if not keywords and not title_queries:
        return []

    timeout = aiohttp.ClientTimeout(total=20)
    paper_map: dict[str, dict] = {}
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for query in title_queries:
            try:
                for paper in await _semantic_scholar_title_match(session, query, api_key):
                    paper_map[_paper_key(paper)] = paper
            except Exception as exc:
                logger.warning("Semantic Scholar title-match search failed for %r: %s", query, exc)
            try:
                for paper in await _semantic_scholar_search(session, query, api_key, 10):
                    paper_map.setdefault(_paper_key(paper), paper)
            except Exception as exc:
                logger.warning("Semantic Scholar exact-title search failed for %r: %s", query, exc)

        if keywords:
            try:
                for paper in await _semantic_scholar_search(session, " ".join(keywords), api_key, 15):
                    paper_map.setdefault(_paper_key(paper), paper)
            except Exception as exc:
                logger.warning("Semantic Scholar keyword search failed: %s", exc)

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
