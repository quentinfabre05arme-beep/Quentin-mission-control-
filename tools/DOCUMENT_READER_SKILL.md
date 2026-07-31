# 🎯 DOCUMENT READER SKILL

## Overview
Universal document text extraction skill for OpenClaw.

## Features
- **PDF extraction** — Text-based PDFs (with OCR fallback)
- **Image OCR** — Extract text from screenshots/photos
- **Multiple formats** — PDF, PNG, JPG, TIFF, BMP
- **Batch processing** — Process multiple files

## Installation

### Prerequisites
```powershell
# Install Node.js dependencies
npm install pdf-parse pdfjs-dist

# Install Python dependencies (for OCR fallback)
pip install pytesseract pdf2image pillow pdfplumber
```

### Quick Start
```powershell
# Extract text from PDF
node tools/pdf_reader.js "path/to/document.pdf"

# Extract text from image
python tools/image_ocr.py "path/to/image.png"
```

## Usage in OpenClaw

When you receive a document/image:
1. Save it to workspace
2. Run extraction script
3. Read the extracted text

## Supported File Types

| Format | Text Extraction | OCR Fallback |
|--------|-----------------|--------------|
| Text-based PDF | ✅ Yes | ❌ No need |
| Image-based PDF | ⚠️ Needs OCR | ✅ Yes |
| PNG/JPG images | ⚠️ Needs OCR | ✅ Yes |
| Screenshots | ⚠️ Needs OCR | ✅ Yes |
| Scanned documents | ⚠️ Needs OCR | ✅ Yes |

## Tools Created

### 1. PDF Reader (Node.js)
**File:** `tools/pdf_reader.js`
- Extracts text from text-based PDFs
- Falls back to alternative methods
- Saves extracted text to file

### 2. Image OCR (Python)
**File:** `tools/image_ocr.py`
- Extracts text from images using Tesseract OCR
- Supports multiple image formats
- Handles rotated text

## Future Improvements

- [ ] Install Tesseract OCR for full image support
- [ ] Add batch processing
- [ ] Add text summarization
- [ ] Integrate with OpenClaw directly

## Status

✅ **PDF text extraction** — Ready (for text-based PDFs)
⚠️ **Image OCR** — Needs Tesseract installation
📅 **Full OCR support** — Planned

---
*Created: 2026-07-31*
*For: Quentin's OpenClaw workspace*