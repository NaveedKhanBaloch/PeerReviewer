"""Semantic Scholar literature search service."""

from __future__ import annotations

import logging
import re
from collections import Counter

import aiohttp

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "we", "with",
    "using", "use", "via", "our", "paper", "study", "method", "results", "based",
}


def _extract_keywords(title: str, abstract: str) -> list[str]:
    """Extract high-signal content keywords from title and abstract."""
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-]+", f"{title} {abstract}".lower())
    filtered = [word for word in words if len(word) > 2 and word not in STOPWORDS]
    return [word for word, _ in Counter(filtered).most_common(6)]


async def search_related_papers(title: str, abstract: str, api_key: str) -> list[dict]:
    """Search Semantic Scholar for related papers and return normalized results."""
    keywords = _extract_keywords(title, abstract)
    if not keywords:
        return []

    params = {
        "query": " ".join(keywords),
        "fields": "paperId,title,abstract,year,authors,citationCount,externalIds",
        "limit": 15,
    }
    headers = {"x-api-key": api_key} if api_key else {}

    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=params,
                headers=headers,
            ) as response:
                response.raise_for_status()
                payload = await response.json()
    except Exception as exc:
        logger.warning("Semantic Scholar search failed: %s", exc)
        return []

    papers = payload.get("data", [])
    if not papers:
        logger.warning("Semantic Scholar returned zero results for query: %s", params["query"])
        return []

    normalized = []
    for paper in papers:
        authors = ", ".join(author.get("name", "") for author in paper.get("authors", []) if author.get("name"))
        abstract_text = (paper.get("abstract") or "").strip()
        normalized.append(
            {
                "s2_paper_id": paper.get("paperId"),
                "title": paper.get("title", "Untitled"),
                "authors": authors or None,
                "year": paper.get("year"),
                "citation_count": paper.get("citationCount", 0),
                "abstract_snippet": abstract_text[:300],
            }
        )

    return sorted(normalized, key=lambda item: item.get("citation_count") or 0, reverse=True)
