# Troubleshooting

## `GEMINI_API_KEY` missing

Cause:
- `.env` missing or not populated

Fix:
- copy `.env.example` to `.env`
- set `GEMINI_API_KEY`

## `no such column: reviews.research_llm_raw_output`

Cause:
- older SQLite DB created before new debug columns were added

Fix:
- run `alembic upgrade head`
- restart backend
- the backend also patches missing nullable SQLite columns at startup

## Backend shows large SQL logs

Cause:
- SQLAlchemy debug logging

Fix:
- already suppressed in backend logging setup

## Gemini SDK info logs appear in terminal

Cause:
- Gemini SDK emits `INFO` messages by default

Fix:
- backend logging now suppresses those to `WARNING`

## PDF generation fails

Cause:
- missing native WeasyPrint dependencies

Fix:
- install required system libraries for your OS
- verify WeasyPrint can render a simple PDF locally

## Review gets stuck in processing

Checklist:

- backend is running
- Gemini key is valid
- Semantic Scholar key is valid
- network access is available
- `/api/progress/{review_id}` is reachable

Also inspect:

- backend terminal traceback
- raw Gemini outputs on the review page

## Frontend cannot reach backend

Checklist:

- backend running on `http://localhost:8000`
- frontend running on `http://localhost:5173`
- `VITE_API_URL` is set correctly in `frontend/.env.local`

