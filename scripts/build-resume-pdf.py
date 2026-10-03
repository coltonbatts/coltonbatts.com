#!/usr/bin/env python3
"""Build public/resume/Colton_Batts_Resume.pdf from src/data/resume_source.json.

One source of truth: the same JSON renders /resume and this PDF. Re-run after any
edit to the JSON.  Usage:  python3 scripts/build-resume-pdf.py
"""
import json
import pathlib
import sys

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "data" / "resume_source.json"
OUT = ROOT / "public" / "resume" / "Colton_Batts_Resume.pdf"

INK = "#141414"
MUTED = "#5a5a5a"
RULE = "#d8d8d8"

S = {
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=19, leading=21,
                           textColor=INK, spaceAfter=2),
    "contact": ParagraphStyle("contact", fontName="Helvetica", fontSize=8.6, leading=11.4,
                              textColor=MUTED, spaceAfter=1),
    "section": ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=10, leading=12,
                              textColor=INK, spaceBefore=11, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=12.2,
                           textColor=INK, alignment=TA_LEFT, spaceAfter=3.5),
    "lead": ParagraphStyle("lead", fontName="Helvetica", fontSize=9.8, leading=12.8,
                           textColor=INK, spaceAfter=4),
    "entry": ParagraphStyle("entry", fontName="Helvetica-Bold", fontSize=10, leading=12,
                            textColor=INK, spaceBefore=5, spaceAfter=1.5),
    "meta": ParagraphStyle("meta", fontName="Helvetica", fontSize=8.4, leading=10.4,
                           textColor=MUTED, spaceAfter=2.5),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, leading=12,
                             textColor=INK, leftIndent=10, bulletIndent=1, spaceAfter=2.2),
    "stack": ParagraphStyle("stack", fontName="Helvetica-Oblique", fontSize=8.2, leading=10.4,
                            textColor=MUTED, spaceAfter=1),
}


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def rule(space_before=3, space_after=0):
    return HRFlowable(width="100%", thickness=0.5, color=RULE,
                      spaceBefore=space_before, spaceAfter=space_after)


def head(title: str, first_flowables) -> KeepTogether:
    """Section heading bound to its first block, so it can never orphan at a page foot."""
    return KeepTogether([rule(space_before=6, space_after=0),
                         Paragraph(title.upper(), S["section"]), *first_flowables])


def entry_block(lead: str, lines) -> list:
    return [Paragraph(lead, S["entry"]), *lines]


def build_story(d: dict) -> list:
    c = d["contact"]
    story = [Paragraph(esc(c["name"]).upper(), S["name"])]
    bits = [c["location"], c["phone"], c["email"], c["website"], c["github"]]
    story.append(Paragraph(" · ".join(esc(b) for b in bits), S["contact"]))
    story.append(rule(space_before=4, space_after=2))

    story.append(head("Summary", [Paragraph(esc(d["summary"]), S["lead"])]))

    built = d.get("built") or []
    if built:
        blocks = [
            entry_block(
                f"{esc(t['name'])} <font color='{MUTED}' size='8'>— {esc(t['role'])}</font>",
                [Paragraph(esc(t["line"]), S["body"]),
                 Paragraph(esc(t["body"]), S["body"]),
                 Paragraph(esc(f"{t['stack']} · {t['link']}"), S["stack"])],
            )
            for t in built
        ]
        story.append(head("Built", [
            Paragraph("Working software, published and in use — the same tools the commercial work runs on.",
                      S["meta"]), *blocks[0]]))
        story += [KeepTogether(b) for b in blocks[1:]]

    selected = d.get("selected") or []
    if selected:
        blocks = [entry_block(esc(s["title"]), [Paragraph(esc(s["detail"]), S["body"])])
                  for s in selected]
        story.append(head("Selected Work", blocks[0]))
        story += [KeepTogether(b) for b in blocks[1:]]

    experience = d.get("experience") or []
    if experience:
        blocks = [
            entry_block(
                f"{esc(r['title'])} <font color='{MUTED}' size='8.5'>— {esc(r['company'])}</font>",
                [Paragraph(f"{esc(r['location'])} · {esc(r['dates'])}", S["meta"]),
                 *[Paragraph(esc(b), S["bullet"], bulletText="•") for b in r["bullets"]]],
            )
            for r in experience
        ]
        story.append(head("Experience", blocks[0]))
        story += [KeepTogether(b) for b in blocks[1:]]

    skills = d.get("skills") or []
    if skills:
        rows = [Paragraph(f"<b>{esc(g['category'])}:</b> {esc(', '.join(g['items']))}", S["body"])
                for g in skills]
        story.append(head("Skills", rows))
    return story


def main() -> int:
    d = json.loads(SRC.read_text())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT), pagesize=LETTER,
        leftMargin=0.72 * inch, rightMargin=0.72 * inch,
        topMargin=0.55 * inch, bottomMargin=0.5 * inch,
        title=f"{d['contact']['name']} — Resume", author=d["contact"]["name"],
    )
    doc.build(build_story(d))
    from pypdf import PdfReader
    reader = PdfReader(str(OUT))
    n = len(reader.pages)
    tail = reader.pages[-1].extract_text().strip().splitlines()[-1]
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {n} page{'s' if n != 1 else ''})")
    print(f"last line on final page: {tail!r}")
    if n > 2:
        print("WARNING: over 2 pages — tighten copy, not spacing", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
