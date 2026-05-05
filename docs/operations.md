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
GROBID_HOSTPORT=
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

## Render Deployment

The repository root includes `render.yaml`, which creates a free Render demo deployment:

- a Dockerized FastAPI free web service
- a public GROBID free web service from the `grobid/grobid:0.8.0` Docker image
- a React/Vite static site
- a free managed Render Postgres database

Create a new Render Blueprint instance from the repository and provide the prompted secret values:

```env
GEMINI_API_KEY=...
SEMANTIC_SCHOLAR_API_KEY=...
```

Render injects the database internal connection string into `DATABASE_URL`. The backend normalizes Render's `postgresql://...` URL to SQLAlchemy's async `postgresql+asyncpg://...` driver URL at startup.

The free Blueprint avoids paid persistent disks by using `/tmp/research-reviewer` for uploads and generated PDFs. This storage is ephemeral and can be cleared when the backend restarts. Free Render Postgres is limited to 1 GB and expires after 30 days unless upgraded.

Render cannot use its private service hostname directly in browser code, so the frontend must use the public backend URL:

```env
VITE_API_URL=https://research-reviewer-api.onrender.com
```

The backend CORS allowlist must include the public frontend URL:

```env
ALLOWED_ORIGINS=https://research-reviewer-web.onrender.com
```

If Render assigns different URLs or you add custom domains, update both values in the Render dashboard or `render.yaml`.

For production, upgrade the backend and GROBID services to paid instances, use a private service for GROBID, and add persistent storage or object storage for uploaded PDFs and generated reports.

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
