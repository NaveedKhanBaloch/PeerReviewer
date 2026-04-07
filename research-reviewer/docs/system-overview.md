# System Overview

## Purpose

AI Research Paper Reviewer helps users review academic papers with a structured AI-assisted workflow. The system accepts a PDF or arXiv URL, extracts paper content, gathers related literature, asks Gemini to analyze novelty and peer-review quality, stores the result, and presents the report in a web UI.

## End-to-End User Journey

1. User opens the application
2. The sidebar loads previous reviews
3. User uploads a PDF or pastes an arXiv URL
4. Backend creates a review record and starts the review pipeline
5. Frontend subscribes to backend progress using SSE
6. Backend extracts paper content and fetches related papers
7. Gemini Flash performs field and novelty analysis
8. Gemini Pro generates the final review JSON
9. Backend stores the output and creates a PDF report
10. Frontend displays the complete review and raw Gemini outputs

## Main Components

- FastAPI backend
- Async SQLite database with SQLAlchemy
- LangGraph review pipeline
- Google Gemini integration
- Semantic Scholar integration
- React frontend with Zustand and React Query
- WeasyPrint PDF generation

## Business Value

- Speeds up academic review preparation
- Standardizes structured peer-review output
- Makes review history searchable and persistent
- Improves transparency with visible raw LLM outputs

