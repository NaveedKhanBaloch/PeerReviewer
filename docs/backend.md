# Backend Guide

## Backend Entry Point

The backend starts in [`backend/main.py`](../backend/main.py).

On startup it:

1. loads environment settings
2. initializes database tables
3. applies compatibility fixes for older SQLite schemas
4. ensures output and upload directories exist
5. registers middleware and routes

## Configuration

Environment variables are defined in [`backend/core/config.py`](../backend/core/config.py) and sourced from the root `.env`.

Important settings:

- `GEMINI_API_KEY`
- `SEMANTIC_SCHOLAR_API_KEY`
- `GROBID_URL`
- `DATABASE_URL`
- `OUTPUTS_DIR`
- `UPLOADS_DIR`
- `ENVIRONMENT`

## Database Session Management

[`backend/core/database.py`](../backend/core/database.py) creates:

- async SQLAlchemy engine
- async session maker
- `get_db()` dependency

Each request gets its own managed async session.

## Review Creation Flow

`POST /api/review`:

1. validates exactly one of file or arXiv URL
2. validates file type and size
3. rate-limits by IP
4. creates a `Review` row
5. creates initial progress events
6. launches `run_pipeline(...)` asynchronously

## Background Pipeline

`run_pipeline(...)`:

1. marks review as `processing`
2. constructs initial agent state
3. invokes LangGraph
4. persists the structured result
5. generates a PDF
6. marks review `complete`
7. stores failure reason if something breaks

## LangGraph State

[`backend/agent/state.py`](../backend/agent/state.py) holds:

- paper bytes or arXiv id
- extracted paper content
- related literature
- structured review output
- progress messages
- error/status flags
- raw Gemini outputs

## research_node

[`backend/agent/nodes/research_node.py`](../backend/agent/nodes/research_node.py) performs:

- paper extraction
- literature lookup
- Gemini Flash novelty and field analysis

Outputs include:

- title
- authors
- abstract
- sections
- related papers
- field
- raw Gemini research response

## review_node

[`backend/agent/nodes/review_node.py`](../backend/agent/nodes/review_node.py) performs:

- final review synthesis with Gemini Pro
- JSON parsing and validation
- flaw filtering by evidence quality

Outputs include:

- dimension scores
- overall score
- recommendation
- summary
- comments
- flaw lists
- raw Gemini review response

## Progress Streaming

`GET /api/progress/{review_id}` streams `text/event-stream`.

The frontend uses `EventSource` to receive:

- pending
- extraction
- literature search
- novelty analysis
- peer review analysis
- PDF generation
- complete or failed

## PDF Generation

[`backend/services/pdf_generator.py`](../backend/services/pdf_generator.py) builds a styled HTML report and converts it with WeasyPrint.

## Logging

The backend is configured to:

- show useful application logs
- suppress noisy SQL debug output
- suppress noisy Gemini SDK info logs

