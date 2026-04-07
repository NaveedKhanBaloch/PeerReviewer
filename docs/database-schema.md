# Database Schema

## Overview

The database is SQLite accessed asynchronously through SQLAlchemy.

## Tables

### `reviews`

Primary record for each review request.

Key fields:

- `id`
- `title`
- `authors`
- `abstract`
- `field`
- `source`
- `arxiv_id`
- `status`
- `recommendation`
- `overall_score`
- `summary`
- `general_comments`
- `major_flaws_json`
- `minor_points_json`
- `research_llm_raw_output`
- `review_llm_raw_output`
- `error_message`
- `pdf_report_path`
- `created_at`
- `updated_at`
- `deleted_at`

### `review_dimension_scores`

Stores dimension-level scores and lists of strengths, weaknesses, issues, and suggestions.

### `related_papers`

Stores the related literature linked to a review.

### `progress_events`

Stores step-by-step progress updates used by the SSE endpoint.

## Relationships

- one `Review` has many `ReviewDimensionScore`
- one `Review` has many `RelatedPaper`
- one `Review` has many `ProgressEvent`

## Migration Strategy

Alembic versions live in:

- [`backend/alembic/versions`](../backend/alembic/versions)

The backend also includes a lightweight SQLite startup compatibility patch for nullable columns added after the original DB creation.

