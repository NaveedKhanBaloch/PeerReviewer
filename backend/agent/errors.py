"""Helpers for converting model-provider errors into user-facing messages."""

from __future__ import annotations


def format_model_error(exc: Exception) -> str:
    """Return a concise, actionable message for common LLM provider failures."""
    message = str(exc)
    if "PERMISSION_DENIED" in message and "leaked" in message.lower():
        return (
            "Gemini rejected the configured API key because it was reported as leaked. "
            "Create a new Gemini API key, update GEMINI_API_KEY in the root .env file, "
            "and restart the backend."
        )
    if "PERMISSION_DENIED" in message or "403" in message:
        return (
            "Gemini rejected the configured API key or model access. "
            "Check GEMINI_API_KEY, enabled Gemini API access, and the configured model names."
        )
    return message


def is_expected_model_auth_error(exc: Exception) -> bool:
    """Identify provider auth/configuration errors that do not need a full traceback."""
    message = str(exc)
    return "PERMISSION_DENIED" in message or "403" in message
