"""PDF and arXiv extraction utilities."""

from __future__ import annotations

import io
import logging
import re
import xml.etree.ElementTree as ET
from collections import defaultdict

import aiohttp
import fitz

logger = logging.getLogger(__name__)

ARXIV_NS = {"atom": "http://www.w3.org/2005/Atom"}


def _normalize_whitespace(text: str) -> str:
    """Collapse repeated whitespace into single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def _detect_sections(full_text: str) -> dict[str, str]:
    """Split paper text into coarse sections using heading heuristics."""
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    sections: dict[str, list[str]] = defaultdict(list)
    current_heading = "Introduction"
    heading_pattern = re.compile(r"^(\d+(\.\d+)*)?\s*[A-Z][A-Za-z0-9 \-/,:()]{2,80}$")

    for line in lines:
        compact = line.strip()
        is_heading = (
            len(compact.split()) <= 10
            and len(compact) <= 90
            and (heading_pattern.match(compact) or compact.isupper())
        )
        if is_heading:
            current_heading = compact.title() if compact.isupper() else compact
            sections.setdefault(current_heading, [])
            continue
        sections[current_heading].append(compact)

    return {heading: _normalize_whitespace(" ".join(content)) for heading, content in sections.items()}


def _extract_title_from_first_page(doc: fitz.Document) -> str:
    """Estimate a title by taking the largest-font text spans on page one."""
    if doc.page_count == 0:
        return ""
    page = doc[0]
    page_dict = page.get_text("dict")
    spans: list[tuple[float, str]] = []
    for block in page_dict.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = _normalize_whitespace(span.get("text", ""))
                if text:
                    spans.append((float(span.get("size", 0.0)), text))
    if not spans:
        return ""
    max_size = max(size for size, _ in spans)
    candidates = [text for size, text in spans if size >= max_size - 0.5]
    return _normalize_whitespace(" ".join(candidates))


def _extract_abstract(full_text: str) -> str:
    """Extract the abstract from the full text with heading-based heuristics."""
    match = re.search(
        r"abstract\s*(.+?)(?:\n\s*(?:1[\.\s]|i[\.\s]|introduction)\b)",
        full_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if match:
        return _normalize_whitespace(match.group(1))
    return ""


def _extract_captions(full_text: str, prefix: str) -> list[str]:
    """Find figure or table captions in text."""
    pattern = re.compile(rf"({prefix}\s*\d+[\.:]?\s+.+)", flags=re.IGNORECASE)
    matches = pattern.findall(full_text)
    return [_normalize_whitespace(match) for match in matches[:20]]


def _parse_grobid_xml(xml_text: str) -> dict[str, object]:
    """Parse GROBID TEI XML into structured paper metadata."""
    root = ET.fromstring(xml_text)
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}
    sections: dict[str, str] = {}
    figures: list[str] = []
    tables: list[str] = []
    references: list[dict] = []

    for div in root.findall(".//tei:text/tei:body/tei:div", ns):
        head = div.find("tei:head", ns)
        heading = _normalize_whitespace("".join(head.itertext())) if head is not None else "Section"
        content = _normalize_whitespace(" ".join("".join(p.itertext()) for p in div.findall("tei:p", ns)))
        if content:
            sections[heading] = content

    for figure in root.findall(".//tei:figure", ns):
        desc = figure.find(".//tei:figDesc", ns)
        label = _normalize_whitespace("".join(desc.itertext())) if desc is not None else ""
        ftype = figure.attrib.get("type", "")
        if label:
            if ftype == "table":
                tables.append(label)
            else:
                figures.append(label)

    for bibl in root.findall(".//tei:listBibl/tei:biblStruct", ns):
        title_node = bibl.find(".//tei:title", ns)
        date_node = bibl.find(".//tei:date", ns)
        id_node = bibl.find(".//tei:idno[@type='DOI']", ns)
        references.append(
            {
                "title": _normalize_whitespace("".join(title_node.itertext())) if title_node is not None else "",
                "year": date_node.attrib.get("when") if date_node is not None else "",
                "doi": _normalize_whitespace("".join(id_node.itertext())) if id_node is not None else "",
            }
        )

    return {
        "sections": sections,
        "figures": figures,
        "tables": tables,
        "references": references,
    }


async def _fetch_arxiv_assets(arxiv_id: str) -> tuple[bytes, dict[str, object]]:
    """Download arXiv PDF and metadata for a given identifier."""
    timeout = aiohttp.ClientTimeout(total=30)
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
    meta_url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(pdf_url) as pdf_response:
            pdf_response.raise_for_status()
            pdf_bytes = await pdf_response.read()

        metadata: dict[str, object] = {"title": "", "authors": [], "abstract": ""}
        async with session.get(meta_url) as meta_response:
            meta_response.raise_for_status()
            xml_text = await meta_response.text()
            root = ET.fromstring(xml_text)
            entry = root.find("atom:entry", ARXIV_NS)
            if entry is not None:
                title_node = entry.find("atom:title", ARXIV_NS)
                summary_node = entry.find("atom:summary", ARXIV_NS)
                authors = [
                    _normalize_whitespace("".join(author.itertext()))
                    for author in entry.findall("atom:author/atom:name", ARXIV_NS)
                ]
                metadata = {
                    "title": _normalize_whitespace(title_node.text or "") if title_node is not None else "",
                    "authors": authors,
                    "abstract": _normalize_whitespace(summary_node.text or "") if summary_node is not None else "",
                }
    return pdf_bytes, metadata


async def _try_grobid(pdf_bytes: bytes, grobid_url: str) -> dict[str, object]:
    """Attempt GROBID extraction and gracefully fall back if unavailable."""
    timeout = aiohttp.ClientTimeout(total=30)
    try:
        data = aiohttp.FormData()
        data.add_field("input", pdf_bytes, filename="paper.pdf", content_type="application/pdf")
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{grobid_url}/api/processFulltextDocument", data=data) as response:
                response.raise_for_status()
                return _parse_grobid_xml(await response.text())
    except Exception as exc:
        logger.warning("GROBID unavailable, falling back to PyMuPDF only: %s", exc)
        return {"sections": {}, "figures": [], "tables": [], "references": []}


async def extract_paper(
    pdf_bytes: bytes | None,
    arxiv_id: str | None,
    grobid_url: str,
) -> dict[str, object]:
    """Extract structured paper content from uploaded PDF bytes or an arXiv ID."""
    resolved_pdf_bytes = pdf_bytes
    arxiv_metadata: dict[str, object] = {"title": "", "authors": [], "abstract": ""}

    if arxiv_id:
        resolved_pdf_bytes, arxiv_metadata = await _fetch_arxiv_assets(arxiv_id)
    if not resolved_pdf_bytes:
        raise ValueError("No PDF content available for extraction.")

    doc = fitz.open(stream=resolved_pdf_bytes, filetype="pdf")
    page_texts = [page.get_text("text") for page in doc]
    full_text = "\n".join(page_texts)
    title = str(arxiv_metadata.get("title") or _extract_title_from_first_page(doc) or "Untitled Paper")
    authors = list(arxiv_metadata.get("authors", []))
    abstract = str(arxiv_metadata.get("abstract") or _extract_abstract(full_text))
    sections = _detect_sections(full_text)
    figures = _extract_captions(full_text, "Figure")
    tables = _extract_captions(full_text, "Table")
    references: list[dict] = []

    grobid_data = await _try_grobid(resolved_pdf_bytes, grobid_url)
    grobid_sections = grobid_data.get("sections", {})
    if isinstance(grobid_sections, dict) and grobid_sections:
        sections = {**sections, **grobid_sections}
    figures = list(dict.fromkeys(figures + list(grobid_data.get("figures", []))))
    tables = list(dict.fromkeys(tables + list(grobid_data.get("tables", []))))
    references = list(grobid_data.get("references", []))

    if not authors:
        author_match = re.search(r"\n([A-Z][A-Za-z\-]+(?:,?\s+[A-Z][A-Za-z\-]+){0,8})\n", full_text[:4000])
        if author_match:
            authors = [segment.strip() for segment in re.split(r",| and ", author_match.group(1)) if segment.strip()]

    return {
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "full_text": full_text,
        "sections": sections,
        "figures": figures,
        "tables": tables,
        "references": references,
        "word_count": len(full_text.split()),
        "page_count": doc.page_count,
    }
