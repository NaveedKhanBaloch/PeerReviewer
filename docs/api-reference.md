# API Reference

## Base URL

```text
http://localhost:8000
```

## Health

### `GET /health`

Returns backend health status.

Response:

```json
{
  "status": "ok",
  "environment": "development"
}
```

## Start Review

### `POST /api/review`

Creates a new review from either:

- `multipart/form-data` with `file`
- `multipart/form-data` with `arxiv_url`

Exactly one must be provided.

Success response:

```json
{
  "review_id": "uuid",
  "status": "processing"
}
```

Common failures:

- `400` invalid input
- `413` file too large
- `429` rate limited

## Stream Progress

### `GET /api/progress/{review_id}`

Returns an SSE stream.

Event payload example:

```json
{
  "step": "reviewing",
  "message": "Running peer review analysis",
  "review_id": "uuid",
  "status": "processing"
}
```

## List Reviews

### `GET /api/reviews?limit=50&offset=0`

Returns recent non-deleted reviews for the sidebar.

## Get Full Review

### `GET /api/review/{review_id}`

Returns the full review payload, including:

- structured review content
- dimension scores
- related papers
- raw Gemini outputs

## Download PDF

### `GET /api/review/{review_id}/pdf`

Returns the generated PDF file if available.

## Delete Review

### `DELETE /api/review/{review_id}`

Soft-deletes the review.

Response:

```json
{
  "message": "deleted"
}
```

