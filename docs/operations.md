# Operations and Deployment Notes

## Local Development

### Backend

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a root `.env` file for local development and set:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_api_key_here
GROBID_URL=http://localhost:8070
DATABASE_URL=sqlite+aiosqlite:///./reviews.db
OUTPUTS_DIR=outputs
UPLOADS_DIR=uploads
MAX_PDF_SIZE_MB=50
ENVIRONMENT=development
```

## Optional Services

### GROBID

```bash
docker run -d --name grobid -p 8070:8070 grobid/grobid:0.8.0
```

### Docker Compose

```bash
docker compose up -d
```

## Production Considerations

- use Python 3.11+
- keep API keys only in environment variables
- restrict CORS origins
- monitor Gemini and Semantic Scholar quotas
- verify WeasyPrint native dependencies on the host
- use managed Postgres instead of SQLite
- preserve uploaded PDFs and generated reports on persistent storage

## Railway Deployment

Railway deployment uses separate services:

- `api`: Dockerized FastAPI backend from `backend/`
- `web`: Dockerized React/Vite frontend from `frontend/`
- `grobid`: Docker image service from `grobid/grobid:0.8.0`
- `Postgres`: Railway PostgreSQL database

The backend and frontend each include a Railway config:

```text
backend/railway.json
frontend/railway.json
```

Create the services from GitHub, set each service root directory, and configure environment variables in the Railway dashboard.

Backend variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
GROBID_URL=http://grobid.railway.internal:8070
GEMINI_API_KEY=...
SEMANTIC_SCHOLAR_API_KEY=...
SECRET_KEY=...
OUTPUTS_DIR=/tmp/research-reviewer/outputs
UPLOADS_DIR=/tmp/research-reviewer/uploads
MAX_PDF_SIZE_MB=50
ENVIRONMENT=production
ALLOWED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
```

Frontend variables:

```text
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

See [Railway Deployment](./railway-deployment.md) for the full procedure. Free Railway deployments are credit-limited, and GROBID may need more memory than the free plan provides during real PDF processing.

## Testing and Validation

### Backend

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v --timeout=180
```

### Frontend

```bash
cd frontend
npm run build
```
