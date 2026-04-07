"""LangGraph definition for the two-node review pipeline."""

from langgraph.graph import END, START, StateGraph

from agent.nodes.research_node import research_node
from agent.nodes.review_node import review_node
from agent.state import AgentState


def build_review_graph():
    """Build and compile the review graph."""
    graph = StateGraph(AgentState)
    graph.add_node("research_node", research_node)
    graph.add_node("review_node", review_node)
    graph.add_edge(START, "research_node")
    graph.add_edge("research_node", "review_node")
    graph.add_edge("review_node", END)
    return graph.compile()


review_graph = build_review_graph()
