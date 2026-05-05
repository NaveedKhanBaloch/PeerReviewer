# Railway Deployment

This project deploys to Railway as four resources:

- `api`: Dockerized FastAPI backend from `backend/`
- `web`: Dockerized React/Vite frontend from `frontend/`
- `grobid`: Docker image service using `grobid/grobid:0.8.0`
- `Postgres`: Railway PostgreSQL database

## Free Plan Notes

Railway's Free plan is usage-credit based and has limited memory. This app can be deployed for a demo, but GROBID is a Java service and may exceed free-tier memory during PDF processing. If GROBID crashes, the backend will fall back to PyMuPDF extraction, but structured GROBID extraction will be unavailable until the service has enough memory.

The frontend and backend services do not use persistent disks. Uploaded PDFs and generated report files are stored in `/tmp/research-reviewer`, which can be cleared on restart or redeploy. The review metadata is persisted in Railway Postgres.

## Services

### 1. Postgres

Add a Railway PostgreSQL database to the project. Railway will expose a `DATABASE_URL` variable.

### 2. GROBID

Create an empty service named `grobid`, then deploy the Docker image:

```text
grobid/grobid:0.8.0
```

Set:

```env
PORT=8070
```

The backend should reach it through Railway private networking:

```env
GROBID_URL=http://grobid.railway.internal:8070
```

### 3. Backend API

Create a GitHub-backed service named `api`.

Set the service root directory to:

```text
/backend
```

Set the config file path to:

```text
backend/railway.json
```

Set variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
GEMINI_API_KEY=your_gemini_api_key
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_api_key
GROBID_URL=http://grobid.railway.internal:8070
OUTPUTS_DIR=/tmp/research-reviewer/outputs
UPLOADS_DIR=/tmp/research-reviewer/uploads
MAX_PDF_SIZE_MB=50
ENVIRONMENT=production
SECRET_KEY=replace-with-a-random-32-plus-character-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
```

Generate a public domain for this service.

### 4. Frontend Web

Create a GitHub-backed service named `web`.

Set the service root directory to:

```text
/frontend
```

Set the config file path to:

```text
frontend/railway.json
```

Set variables:

```env
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

Generate a public domain for this service.

## Validation

After deployment, open:

```text
https://<api-public-domain>/health
```

Expected response:

```json
{"status":"ok","environment":"production"}
```

Then open the frontend public domain, log in, and submit a small PDF first.

Default local admin account:

```text
Email: admin@login.com
Password: admin
```

Change the password immediately after first login.
