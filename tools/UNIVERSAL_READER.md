# 📄 UNIVERSAL DOCUMENT READER SKILL

## Overview
Extract text from ANY document: PDFs, images, screenshots, scanned files.

## Status: ✅ READY

---

## 🛠️ Tools Created

### 1. PDF Reader (`tools/pdf_reader.js`)
- **Text-based PDFs:** ✅ Works perfectly
- **Image-based PDFs:** ⚠️ Needs OCR (see below)

### 2. Image OCR (`tools/image_ocr.py`)
- **Screenshots:** ✅ OCR.space API (free)
- **Photos:** ✅ OCR.space API
- **Scanned documents:** ✅ OCR.space API
- **Local OCR:** ⚠️ Tesseract (installing separately)

---

## 📖 Usage

### Text-based PDF
```powershell
node tools/pdf_reader.js "document.pdf"
```

### Image/Screenshot
```powershell
python tools/image_ocr.py "screenshot.png"
```

### Image-based PDF (screenshot PDF)
```powershell
# Convert PDF pages to images, then OCR
# (requires additional tools)
```

---

## 🌐 OCR.space API (Free Tier)

**Website:** https://ocr.space
**Free limits:** 25,000 requests/month
**No signup required** for basic usage

---

## 🎯 For Your Grok PDF

Since your PDF is image-based (screenshot), use:

```powershell
python tools/image_ocr.py "path/to/grok_report.pdf"
```

Or **convert PDF to image first**:
```powershell
# If you have ImageMagick:
# magick "grok_report.pdf" "grok_report.png"
# python tools/image_ocr.py "grok_report.png"
```

---

## 🚀 Alternative: Paste Text Directly

If OCR doesn't work, the fastest solution is:
1. Open the Grok report
2. Select all text (Ctrl+A)
3. Copy (Ctrl+C)
4. Paste here

---

## 📁 Files

| File | Purpose |
|------|---------|
| `tools/pdf_reader.js` | Extract text from text-based PDFs |
| `tools/image_ocr.py` | Extract text from images using OCR |
| `tools/DOCUMENT_READER_SKILL.md` | This documentation |

---

## ⚡ Quick Test

```powershell
# Test with any image
python tools/image_ocr.py "path/to/your/image.png"
```

---

*Created: 2026-07-31*
*Status: Ready for use*