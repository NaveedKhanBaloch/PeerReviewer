# Developer Sequence Diagram

## End-to-End Request Sequence

The following sequence describes what happens from the moment a user submits a paper to the moment the final report is displayed in the browser.

```text
User
  |
  | 1. Upload PDF or paste arXiv URL
  v
Frontend UploadZone
  |
  | 2. POST /api/review
  v
FastAPI Route: start_review
  |
  | 3. Validate input, rate-limit, create Review row
  | 4. Insert initial ProgressEvent
  | 5. Launch run_pipeline(review_id, ...)
  v
Background Pipeline
  |
  | 6. Mark review as processing
  | 7. Build initial AgentState
  | 8. Invoke LangGraph
  v
LangGraph
  |
  | 9. research_node
  |    - extract paper
  |    - search related literature
  |    - call Gemini Flash
  |    - store raw research response in state
  |
  | 10. review_node
  |     - build consolidated review prompt
  |     - call Gemini Pro
  |     - validate JSON and flaws
  |     - store raw review response in state
  v
Pipeline Persistence
  |
  | 11. Save review fields to DB
  | 12. Save dimension scores
  | 13. Save related papers
  | 14. Generate review PDF
  | 15. Mark review complete
  | 16. Insert final ProgressEvent
  v
SSE Endpoint
  |
  | 17. Frontend EventSource polls progress stream
  | 18. Backend emits step/status messages
  v
Frontend ReviewProgress
  |
  | 19. Switches UI from progress to report view
  v
Frontend ReviewReport
  |
  | 20. GET /api/review/{review_id}
  | 21. Render structured review
  | 22. Render raw Gemini outputs
  v
User sees final report
```

## Request Lifecycle by Module

### Frontend

- [`frontend/src/components/UploadZone.tsx`](../frontend/src/components/UploadZone.tsx)
- [`frontend/src/hooks/useSSE.ts`](../frontend/src/hooks/useSSE.ts)
- [`frontend/src/components/ReviewProgress.tsx`](../frontend/src/components/ReviewProgress.tsx)
- [`frontend/src/components/ReviewReport.tsx`](../frontend/src/components/ReviewReport.tsx)

### API Layer

- [`backend/api/routes/reviews.py`](../backend/api/routes/reviews.py)

### Agent Layer

- [`backend/agent/graph.py`](../backend/agent/graph.py)
- [`backend/agent/nodes/research_node.py`](../backend/agent/nodes/research_node.py)
- [`backend/agent/nodes/review_node.py`](../backend/agent/nodes/review_node.py)

### Services

- [`backend/services/pdf_extractor.py`](../backend/services/pdf_extractor.py)
- [`backend/services/lit_search.py`](../backend/services/lit_search.py)
- [`backend/services/pdf_generator.py`](../backend/services/pdf_generator.py)

### Persistence

- [`backend/models/database.py`](../backend/models/database.py)
- [`backend/core/database.py`](../backend/core/database.py)

## Data Artifacts Produced Along the Sequence

At different stages the system produces different artifacts:

- review metadata record
- progress events
- extracted paper text
- related literature result set
- Gemini research-node raw output
- Gemini review-node raw output
- structured review JSON
- normalized DB rows
- final downloadable PDF
