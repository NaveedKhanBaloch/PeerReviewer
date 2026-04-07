"""Review PDF generation with WeasyPrint."""

from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Optional
from core.config import settings


def _badge_color(recommendation: Optional[str]) -> str:
    """Return the badge color for a recommendation."""
    mapping = {
        "Accept": "#16a34a",
        "Minor revision": "#eab308",
        "Major revision": "#f97316",
        "Reject": "#dc2626",
    }
    return mapping.get(recommendation or "", "#64748b")


def _score_color(score: float) -> str:
    """Return score color for dimension rows."""
    if score >= 7:
        return "#16a34a"
    if score >= 5:
        return "#f59e0b"
    return "#dc2626"


async def generate_review_pdf(review_data: dict, review_id: str) -> str:
    """Generate a formatted PDF report for a completed review."""
    from weasyprint import HTML

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    recommendation = review_data.get("recommendation")
    badge = _badge_color(recommendation)

    dimension_rows = "".join(
        f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{escape(item.get("dimension", ""))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:{_score_color(float(item.get("score", 0)))};font-weight:700;">
            {float(item.get("score", 0)):.1f}
          </td>
        </tr>
        """
        for item in review_data.get("dimension_scores", [])
    )
    major_flaws = "".join(
        f"""
        <li style="margin-bottom:16px;padding:14px;border-left:4px solid #ef4444;background:#fff7f7;">
          <div><strong>Issue:</strong> {escape(flaw.get("issue", ""))}</div>
          <div style="margin-top:6px;"><strong>Evidence:</strong> <em>{escape(flaw.get("evidence", ""))}</em></div>
          <div style="margin-top:6px;"><strong>Suggested Remedy:</strong> {escape(flaw.get("remedy", ""))}</div>
        </li>
        """
        for flaw in review_data.get("major_flaws", [])
    )
    minor_points = "".join(
        f"<li style='margin-bottom:8px;'>{escape(point)}</li>"
        for point in review_data.get("minor_points", [])
    )
    related_rows = "".join(
        f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{escape(paper.get("title", ""))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{escape(str(paper.get("year") or ""))}</td>
        </tr>
        """
        for paper in review_data.get("related_papers", [])
    )

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color:#0f172a; margin:32px;">
        <header style="border-bottom:3px solid #1d4ed8; padding-bottom:16px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
            <div>
              <div style="font-size:24px; font-weight:700;">PEER REVIEW REPORT</div>
              <div style="font-size:20px; margin-top:8px;">{escape(review_data.get("title", "Untitled Paper"))}</div>
              <div style="color:#475569; margin-top:6px;">Date: {now}</div>
            </div>
            <div style="background:{badge}; color:white; padding:10px 14px; border-radius:999px; font-weight:700;">
              {escape(recommendation or "Pending")}
            </div>
          </div>
          <div style="margin-top:18px; font-size:34px; font-weight:700;">
            {float(review_data.get("overall_score", 0)):.1f} / 10
          </div>
        </header>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">Dimension Scores</h2>
          <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead>
              <tr>
                <th style="text-align:left; padding:10px; background:#eff6ff;">Dimension</th>
                <th style="text-align:left; padding:10px; background:#eff6ff;">Score</th>
              </tr>
            </thead>
            <tbody>{dimension_rows}</tbody>
          </table>
        </section>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">Summary</h2>
          <p style="line-height:1.6;">{escape(review_data.get("summary", ""))}</p>
        </section>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">General Comments</h2>
          <p style="line-height:1.6;">{escape(review_data.get("general_comments", ""))}</p>
        </section>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">Major Flaws</h2>
          <ol style="padding-left:20px;">{major_flaws or "<li>None identified.</li>"}</ol>
        </section>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">Minor Points</h2>
          <ul>{minor_points or "<li>No minor points recorded.</li>"}</ul>
        </section>

        <section style="margin-bottom:24px;">
          <h2 style="font-size:18px;">Related Papers</h2>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding:10px; background:#f8fafc;">Title</th>
                <th style="text-align:left; padding:10px; background:#f8fafc;">Year</th>
              </tr>
            </thead>
            <tbody>{related_rows or "<tr><td style='padding:10px;'>No related papers found</td><td></td></tr>"}</tbody>
          </table>
        </section>

        <footer style="border-top:1px solid #cbd5e1; padding-top:12px; color:#64748b; font-size:12px;">
          Generated by AI Research Reviewer | {now}
        </footer>
      </body>
    </html>
    """

    output_dir = Path(settings.OUTPUTS_DIR)
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"{review_id}.pdf"
    HTML(string=html).write_pdf(output_path)
    return str(output_path.resolve())
