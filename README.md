# AI Research Paper Reviewer

AI Research Paper Reviewer is a full-stack application that accepts a research paper as a PDF upload or arXiv URL, analyzes it with a LangGraph-powered review pipeline using Google Gemini, enriches the analysis with related literature from Semantic Scholar, and produces a structured peer-review report with downloadable PDF output.

The project is built as a two-part system:
- A FastAPI backend responsible for ingestion, orchestration, persistence, streaming progress updates, and report generation
- A React frontend responsible for upload, progress tracking, review browsing, and report display

## Core Capabilities

- Upload a PDF or submit an arXiv URL
- Extract paper content and metadata
- Search related literature from Semantic Scholar
- Run a two-node LangGraph review workflow with Gemini
- Stream real-time progress to the browser using SSE
- Persist all reviews, scores, and related papers in SQLite
- Download a generated PDF review report
- Inspect raw Gemini outputs directly on the review page for debugging

## Documentation Index

- [System Overview](./docs/system-overview.md)
- [Architecture](./docs/architecture.md)
- [Developer Sequence Diagram](./docs/developer-sequence.md)
- [Backend Guide](./docs/backend.md)
- [Frontend Guide](./docs/frontend.md)
- [API Reference](./docs/api-reference.md)
- [Database Schema](./docs/database-schema.md)
- [Operations and Deployment Notes](./docs/operations.md)
- [Troubleshooting](./docs/troubleshooting.md)
- PDF bundle: [`AI_Research_Paper_Reviewer_Documentation.pdf`](./docs/AI_Research_Paper_Reviewer_Documentation.pdf)

## Project Structure

```text
research-reviewer/
├── .env.example
├── README.md
├── docker-compose.yml
├── docs/
├── backend/
└── frontend/
```

## Quick Start

### 1. Prepare Environment

```bash
git clone <repo>
cd research-reviewer
cp .env.example .env
```

Edit `.env` and provide real values for at least:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SEMANTIC_SCHOLAR_API_KEY=your_s2_key_here
```

### 2. Optional: Start GROBID

```bash
docker run -d --name grobid -p 8070:8070 grobid/grobid:0.8.0
```

### 3. Start Backend

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn main:app --reload --port 8000
```

If `.venv` does not exist yet:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access the Application

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

## Running Tests

### Backend Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v --timeout=180
```

### Frontend Build Validation

```bash
cd frontend
npm run build
```

## Recommended Development Workflow

1. Start the backend and frontend in separate terminals
2. Submit a PDF or arXiv link from the UI
3. Watch progress stream in real time
4. Open the completed review from the sidebar
5. Scroll to the Gemini raw output sections when debugging model behavior

## Notes

- The backend environment has been upgraded to Python `3.11+`
- Existing SQLite databases are patched at startup for backward-compatible schema additions
- WeasyPrint may require OS-level dependencies on some machines for real PDF rendering
