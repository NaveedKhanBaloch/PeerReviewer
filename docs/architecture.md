# Architecture

## High-Level Architecture

The application uses a client-server architecture:

- The frontend provides the user interface for upload, progress monitoring, and review display
- The backend manages ingestion, AI workflow orchestration, persistence, progress tracking, and PDF generation

## Runtime Flow

```text
Browser
  -> POST /api/review
  -> Backend creates review record
  -> Background LangGraph pipeline starts
  -> Browser opens SSE stream /api/progress/{review_id}
  -> Backend emits progress events
  -> Pipeline completes and stores review
  -> Browser requests /api/review/{review_id}
  -> Browser displays final report
```

## Backend Layers

### Core

- [`backend/core/config.py`](../backend/core/config.py)
- [`backend/core/database.py`](../backend/core/database.py)

Responsibilities:
- load settings
- configure SQLAlchemy
- manage DB sessions

### API

- [`backend/api/routes/reviews.py`](../backend/api/routes/reviews.py)

Responsibilities:
- input validation
- review creation
- SSE progress streaming
- review retrieval
- PDF download
- soft deletion

### Agent

- [`backend/agent/graph.py`](../backend/agent/graph.py)
- [`backend/agent/state.py`](../backend/agent/state.py)
- [`backend/agent/nodes/research_node.py`](../backend/agent/nodes/research_node.py)
- [`backend/agent/nodes/review_node.py`](../backend/agent/nodes/review_node.py)

Responsibilities:
- orchestrate the two-step LangGraph workflow
- hold shared state between nodes
- call Gemini models

### Services

- [`backend/services/pdf_extractor.py`](../backend/services/pdf_extractor.py)
- [`backend/services/lit_search.py`](../backend/services/lit_search.py)
- [`backend/services/pdf_generator.py`](../backend/services/pdf_generator.py)

Responsibilities:
- parse PDFs and arXiv metadata
- search literature
- generate review PDFs

## Frontend Layers

### App Shell

- [`frontend/src/App.tsx`](../frontend/src/App.tsx)

Responsibilities:
- determine whether to show upload, progress, or report views
- initialize React Query
- attach SSE handling

### State

- [`frontend/src/stores/reviewStore.ts`](../frontend/src/stores/reviewStore.ts)

Responsibilities:
- selected review state
- processing state
- progress state
- in-memory toasts

### Data Access

- [`frontend/src/api/client.ts`](../frontend/src/api/client.ts)
- [`frontend/src/hooks/useSSE.ts`](../frontend/src/hooks/useSSE.ts)

Responsibilities:
- call REST endpoints
- open SSE stream

### UI Components

- sidebar
- upload zone
- progress panel
- report page
- score gauges

## AI Workflow Design

The LangGraph workflow is intentionally linear:

```text
START -> research_node -> review_node -> END
```

This keeps the system deterministic and aligns with the requirement for exactly two nodes.

## Developer Sequence Diagram

For the detailed request-to-render execution path, see:

- [Developer Sequence Diagram](./developer-sequence.md)

## Persistence Model

The database stores:

- a top-level review record
- dimension-level scores
- related papers
- progress events
- raw Gemini responses
