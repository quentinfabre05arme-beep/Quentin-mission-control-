---
name: content_extractor
description: "Extract text from PDFs, identify key concepts, summarize content, and save extracted knowledge to memory files."
---

# Content Extractor

Extract, analyze, and preserve knowledge from documents and text.

## When to use
- User provides PDF, text file, URL, or paste to analyze
- Need to distill long content into key concepts and summary
- Want to save extracted knowledge for future reference

## Workflow

1. **Read source** — PDF (pdf-parse), text file, or direct paste.
2. **Extract text** — Full content capture; note page count/length.
3. **Identify key concepts** — Named entities, technical terms, important nouns.
4. **Summarize** — TL;DR (1-2 sentences) + structured summary (3-5 bullet points).
5. **Identify important facts** — Dates, numbers, decisions, quotes, action items.
6. **Save to memory** — `memory/YYYY-MM-DD.md` with source attribution.

## Output format

```
# Extracted: {title}
**Source:** {filename or URL}
**Date:** {date}

## TL;DR
{1-2 sentences}

## Key Concepts
- {concept 1}
- {concept 2}

## Summary
- {point 1}
- {point 2}

## Important Facts
- {fact 1}
- {fact 2}

## Full Text (excerpt)
{first 2000 chars or key section}
```

## Scripts

- `scripts/content_extractor.js` — Main extraction pipeline
- Handles PDF text extraction, concept identification, summarization, fact extraction, and memory saving

## Dependencies
- `pdf-parse` for PDF text extraction (optional)
- Node.js built-ins only for core pipeline
