"""Integration-style tests for the review API."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Optional

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_reviews.db")
os.environ.setdefault("OUTPUTS_DIR", "test_outputs")
os.environ.setdefault("UPLOADS_DIR", "test_uploads")
os.environ.setdefault("ENVIRONMENT", "development")

from main import app  # noqa: E402
from core.database import Base, engine  # noqa: E402
from models.database import Recommendation  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def cleanup_paths():
    """Clean test artifacts before and after the suite."""
    for path in ["test_reviews.db", "test_outputs", "test_uploads"]:
        target = Path(path)
        if target.is_file():
            target.unlink(missing_ok=True)
        elif target.exists():
            for child in target.iterdir():
                if child.is_file():
                    child.unlink()
            target.rmdir()
    yield


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create and later tear down the test database schema."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def patch_pipeline(monkeypatch):
    """Replace the background pipeline with a deterministic fake."""
    from api.routes import reviews as review_routes
    from core.database import AsyncSessionLocal
    from models.database import ProgressEvent, RelatedPaper, Review, ReviewDimensionScore, ReviewStatus

    async def fake_pipeline(review_id: str, _paper_bytes: Optional[bytes], _arxiv_id: Optional[str]) -> None:
        async with AsyncSessionLocal() as session:
            review = await session.get(Review, review_id)
            assert review is not None
            review.status = ReviewStatus.processing
            session.add(ProgressEvent(review_id=review_id, step="extracting", message="Extracting paper content"))
            session.add(ProgressEvent(review_id=review_id, step="literature", message="Searching related literature"))
            session.add(ProgressEvent(review_id=review_id, step="analysing", message="Analysing research field and novelty"))
            session.add(ProgressEvent(review_id=review_id, step="reviewing", message="Running peer review analysis"))
            review.title = "Synthetic Test Paper"
            review.authors = "Ada Lovelace, Alan Turing"
            review.abstract = "A test abstract."
            review.field = "Machine Learning"
            review.overall_score = 7.4
            review.recommendation = Recommendation.minor_revision
            review.summary = "What the paper does is propose a controlled synthetic benchmark for evaluation and demonstrate a reproducible review flow that exercises extraction, literature search, and structured critique generation. The manuscript is clearly scoped and the experimental framing is coherent, with enough detail to support a fair assessment of the toolchain under test conditions. Its strongest contribution is the end-to-end orchestration of review artifacts and progress reporting. The main limitations are that the validation breadth is modest and some claims about generalizability would require broader empirical evidence before publication in a top-tier venue."
            review.general_comments = "The submission is well structured and presents a useful systems-style workflow that combines extraction, literature search, and peer-review synthesis in a coherent pipeline. The architecture is practical, and the reporting format is clear and actionable. The paper also does a good job separating strengths, weaknesses, and remedies, which would help authors iterate effectively. The main concerns are methodological depth and external validation. Several claims are framed broadly relative to the size of the demonstrated evidence, and the discussion of failure modes is brief. Strengthening the evaluation protocol, adding more ablations, and documenting reproducibility settings in greater detail would materially improve confidence in the findings."
            review.major_flaws_json = '[{"issue":"Limited evaluation breadth","evidence":"Section 4.2, Table 1","remedy":"Add more datasets and ablation studies."}]'
            review.minor_points_json = '["Clarify the baseline configuration in Section 3.", "Standardize notation between Figures 2 and 3."]'
            review.research_llm_raw_output = '{"field":"Machine Learning","main_contributions":["Synthetic benchmark"],"novelty_score":7.2}'
            review.review_llm_raw_output = '{"dimension_scores":[{"dimension":"ORIGINALITY & SIGNIFICANCE","score":7.2}],"overall_score":7.4,"recommendation":"Minor revision"}'
            session.add(ReviewDimensionScore(review_id=review_id, dimension="ORIGINALITY & SIGNIFICANCE", score=7.2, strengths='["Clear motivation"]', weaknesses='["Incremental novelty"]', critical_issues='["Section 2 lacks stronger positioning"]', suggestions='["Expand comparison to prior work"]'))
            session.add(ReviewDimensionScore(review_id=review_id, dimension="METHODOLOGY", score=7.0, strengths='["Reasonable setup"]', weaknesses='["Few ablations"]', critical_issues='["Section 3.1 omits variance analysis"]', suggestions='["Add ablations"]'))
            session.add(ReviewDimensionScore(review_id=review_id, dimension="DATA & RESULTS", score=7.5, strengths='["Results are consistent"]', weaknesses='["Limited baselines"]', critical_issues='["Table 1 lacks confidence intervals"]', suggestions='["Report intervals"]'))
            session.add(ReviewDimensionScore(review_id=review_id, dimension="FIGURES & TABLES", score=7.1, strengths='["Readable charts"]', weaknesses='["Some captions are terse"]', critical_issues='[]', suggestions='["Expand captions"]'))
            session.add(ReviewDimensionScore(review_id=review_id, dimension="PRESENTATION & CLARITY", score=7.8, strengths='["Well written"]', weaknesses='["A few dense paragraphs"]', critical_issues='[]', suggestions='["Tighten discussion"]'))
            session.add(ReviewDimensionScore(review_id=review_id, dimension="ETHICS & REPRODUCIBILITY", score=7.6, strengths='["Reproducibility intent"]', weaknesses='["Repository details missing"]', critical_issues='["Section 5 does not link code repository"]', suggestions='["Link the repository"]'))
            session.add(RelatedPaper(review_id=review_id, title="Benchmarking Automated Peer Review", authors="J. Doe", year=2025, citation_count=14, relevance_note="Comparable orchestration approach."))
            output_dir = Path("test_outputs")
            output_dir.mkdir(exist_ok=True)
            pdf_path = output_dir / f"{review_id}.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n% synthetic pdf\n")
            review.pdf_report_path = str(pdf_path.resolve())
            review.status = ReviewStatus.complete
            session.add(ProgressEvent(review_id=review_id, step="generating_pdf", message="Generating PDF report"))
            session.add(ProgressEvent(review_id=review_id, step="complete", message="Review complete"))
            await session.commit()

    original_create_task = asyncio.create_task

    monkeypatch.setattr(review_routes, "run_pipeline", fake_pipeline)
    monkeypatch.setattr(review_routes.asyncio, "create_task", lambda coro: original_create_task(coro))


@pytest_asyncio.fixture
async def client():
    """Create an HTTP client bound to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest_asyncio.fixture
async def created_review_id(client: AsyncClient) -> str:
    """Create a fake arXiv review and return its id."""
    response = await client.post("/api/review", data={"arxiv_url": "https://arxiv.org/abs/2503.08569"})
    assert response.status_code == 200
    review_id = response.json()["review_id"]
    for _ in range(50):
        detail = await client.get(f"/api/review/{review_id}")
        if detail.status_code == 200:
            return review_id
        await asyncio.sleep(0.05)
    raise AssertionError("Review never became available.")


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    """Health endpoint returns expected payload."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_arxiv_review(client: AsyncClient):
    """Creating an arXiv review returns a completed structured review."""
    response = await client.post("/api/review", data={"arxiv_url": "https://arxiv.org/abs/2503.08569"})
    assert response.status_code == 200
    review_id = response.json()["review_id"]

    sse_response = await client.get(f"/api/progress/{review_id}")
    assert sse_response.status_code == 200
    assert '"status": "complete"' in sse_response.text

    detail = await client.get(f"/api/review/{review_id}")
    payload = detail.json()
    assert detail.status_code == 200
    assert 1 <= payload["overall_score"] <= 10
    assert payload["recommendation"] in ["Accept", "Minor revision", "Major revision", "Reject"]
    assert len(payload["dimension_scores"]) == 6


@pytest.mark.asyncio
async def test_pdf_download(client: AsyncClient, created_review_id: str):
    """Generated PDF is downloadable."""
    response = await client.get(f"/api/review/{created_review_id}/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_review_list(client: AsyncClient, created_review_id: str):
    """Review list returns at least one item."""
    response = await client.get("/api/reviews")
    assert response.status_code == 200
    assert any(item["id"] == created_review_id for item in response.json())


@pytest.mark.asyncio
async def test_delete_review(client: AsyncClient, created_review_id: str):
    """Soft-deleted review is no longer retrievable."""
    delete_response = await client.delete(f"/api/review/{created_review_id}")
    assert delete_response.status_code == 200

    detail_response = await client.get(f"/api/review/{created_review_id}")
    assert detail_response.status_code == 404
