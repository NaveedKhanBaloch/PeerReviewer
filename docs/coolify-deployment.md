# Coolify Deployment on Hostinger VPS

This guide deploys AI Research Paper Reviewer as a Docker Compose stack on a Hostinger VPS managed by Coolify.

## What You Need on Your Computer

You do not need Docker on your personal computer if Coolify builds from your Git repository on the VPS.

Install or prepare:

- Git, so you can commit and push the project to GitHub or another Git provider.
- An SSH client, usually already available on macOS, Linux, and modern Windows.
- A code editor, such as VS Code, for editing environment values and deployment files.
- Access to your Git repository from Coolify. A GitHub account and repository is the simplest path.
- Access to your domain DNS panel, for example Hostinger DNS, Cloudflare, or your registrar.

Optional but useful:

- Docker Desktop, only if you want to test the production Docker Compose stack locally before pushing.
- Node.js 20 and Python 3.11, only for local development outside Docker.

## DNS

Create a DNS record for the public web app:

```text
Type: A
Name: reviewer or your chosen subdomain
Value: your Hostinger VPS public IPv4 address
```

Example:

```text
reviewer.example.com -> 123.123.123.123
```

Coolify can request HTTPS certificates after the domain points to the VPS.

## Coolify Resource Type

Create a new Coolify project and add this repository as a Docker Compose application.

Use:

```text
Compose file: docker-compose.yml
Base directory: repository root
```

The compose stack defines these services:

- `web`: Nginx serving the React app and proxying `/api` to the backend.
- `api`: FastAPI backend running Alembic migrations on startup.
- `postgres`: production database with persistent storage.
- `grobid`: internal PDF extraction service.

Only the `web` service needs a public domain. The API is reached internally through the web container at `/api`.

## Public Domain

Assign your public domain to the `web` service in Coolify.

If the web service listens on port 80, use your normal HTTPS domain:

```text
https://reviewer.example.com
```

## Required Environment Variables

Set these variables in Coolify for the Docker Compose application:

```env
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=generate-a-random-32-plus-character-secret
POSTGRES_PASSWORD=generate-a-strong-database-password
FRONTEND_URL=https://reviewer.example.com
ALLOWED_ORIGINS=https://reviewer.example.com
```

Recommended optional variables:

```env
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key
POSTGRES_DB=research_reviewer
POSTGRES_USER=research_reviewer
MAX_PDF_SIZE_MB=50
CLIENT_MAX_BODY_SIZE=50m
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro
```

Google sign-in is optional:

```env
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

SMTP is optional unless email delivery is enabled:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=no-reply@your-domain.com
SMTP_FROM_NAME=AI Research Reviewer
```

Leave `VITE_API_URL` empty for the Coolify single-domain deployment. The frontend will call `/api`, and Nginx will proxy requests to the backend service internally.

## Storage

The compose file defines persistent Docker volumes:

- `postgres_data`: database data.
- `api_outputs`: generated review PDF reports.
- `api_uploads`: uploaded PDFs used during processing.

Do not delete these volumes unless you intentionally want to remove production data.

## Deployment Steps

1. Push this repository to GitHub or your Git provider.
2. In Coolify, create a new project.
3. Add a Docker Compose application from the repository.
4. Confirm Coolify uses `docker-compose.yml` from the repository root.
5. Add the required environment variables.
6. Assign the public domain to the `web` service.
7. Deploy.
8. Open `https://your-domain.com`.
9. Sign up, submit a small PDF, and confirm the review progresses.

## Health Checks

After deploy, verify these URLs:

```text
https://your-domain.com
https://your-domain.com/api/health
```

The API health endpoint should return:

```json
{"status":"ok","environment":"production"}
```

## Common Issues

### Frontend loads but API calls fail

Check that the `web` service has `BACKEND_UPSTREAM=http://api:8000` and that both `web` and `api` are in the same Coolify compose stack.

### CORS errors

Set:

```env
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
```

Then redeploy.

### Large PDF upload fails

Make sure both values are aligned:

```env
MAX_PDF_SIZE_MB=50
CLIENT_MAX_BODY_SIZE=50m
```

### Backend fails immediately

Check that these variables are not empty:

```env
GEMINI_API_KEY
SECRET_KEY
POSTGRES_PASSWORD
FRONTEND_URL
ALLOWED_ORIGINS
```

`SECRET_KEY` must be at least 32 characters in production.

### Review never leaves processing

Check backend logs in Coolify. Most failures are caused by missing Gemini configuration, GROBID startup delays, PDF extraction issues, or outbound network/API-key problems.
