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

See:

- [`.env.example`](../.env.example)

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
- rotate and back up the SQLite database or migrate to a production DB if load grows

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

