"""Shared state definition for the review graph."""

from __future__ import annotations

from typing import Annotated, Dict, List, Optional

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """LangGraph state carried through the review pipeline."""

    paper_bytes: Optional[bytes]
    arxiv_id: Optional[str]
    review_id: str
    title: str
    authors: List[str]
    abstract: str
    full_text: str
    sections: Dict[str, str]
    figures: List[str]
    tables: List[str]
    references: List[dict]
    word_count: int
    page_count: int
    field: str
    related_papers: List[dict]
    research_llm_raw_output: str
    dimension_scores: List[dict]
    overall_score: float
    recommendation: str
    summary: str
    general_comments: str
    major_flaws: List[dict]
    minor_points: List[str]
    review_llm_raw_output: str
    progress_messages: List[str]
    error: Optional[str]
    status: str
    messages: Annotated[List[BaseMessage], add_messages]
