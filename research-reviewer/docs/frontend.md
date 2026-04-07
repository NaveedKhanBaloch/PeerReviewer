# Frontend Guide

## Frontend Entry Point

The frontend starts in [`frontend/src/main.tsx`](../frontend/src/main.tsx), which renders [`frontend/src/App.tsx`](../frontend/src/App.tsx).

## Main Layout

The UI is split into:

- left sidebar with review history
- main content area

The main content area conditionally shows:

- upload screen
- progress screen
- completed review screen

## State Management

[`frontend/src/stores/reviewStore.ts`](../frontend/src/stores/reviewStore.ts) stores:

- selected review id
- processing review id
- progress messages
- review list
- transient toast messages

## API Client

[`frontend/src/api/client.ts`](../frontend/src/api/client.ts) wraps Axios and exposes typed helper methods for:

- start review with file
- start review with arXiv URL
- list reviews
- load a review
- delete a review
- build PDF URL

## Review Sidebar

[`frontend/src/components/ReviewSidebar.tsx`](../frontend/src/components/ReviewSidebar.tsx):

- fetches reviews with React Query
- supports search by title
- highlights the active review
- allows delete and PDF open actions
- auto-refreshes while processing is active

## Upload Zone

[`frontend/src/components/UploadZone.tsx`](../frontend/src/components/UploadZone.tsx):

- supports drag-and-drop PDF upload
- supports file picker upload
- supports arXiv URL submission
- performs client-side file validation

## Progress Handling

[`frontend/src/hooks/useSSE.ts`](../frontend/src/hooks/useSSE.ts) opens an SSE connection and updates the Zustand store as progress events arrive.

[`frontend/src/components/ReviewProgress.tsx`](../frontend/src/components/ReviewProgress.tsx) renders the current pipeline stage.

## Review Display

[`frontend/src/components/ReviewReport.tsx`](../frontend/src/components/ReviewReport.tsx) renders:

- recommendation
- score summary
- dimension gauges
- summary and comments
- flaws and minor points
- related papers
- raw Gemini research output
- raw Gemini review output

## Build Output

Production artifacts are generated into:

- [`frontend/dist`](../frontend/dist)

