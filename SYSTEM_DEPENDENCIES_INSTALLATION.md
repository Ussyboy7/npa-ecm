# System Dependencies Installation Guide

**Date:** January 2025  
**Status:** Installation Instructions

---

## Summary

This document provides instructions for installing system dependencies required by the ECM modules:
- **Tesseract OCR** - For Content Capture Module
- **Poppler** - For PDF processing in OCR

---

## ✅ Migrations Status

**All migrations have been successfully applied!**

```
✅ capture.0001_initial
✅ dms.0007_document_search_vector_and_more
✅ dms.0008_add_search_vector_gin_index
✅ integrations.0001_initial
✅ records.0001_initial
✅ search.0001_initial
```

---

## System Dependencies Installation

### macOS Installation

#### Option 1: MacPorts (Recommended for macOS 13)

If you have MacPorts installed:

```bash
sudo port install tesseract
sudo port install poppler
```

#### Option 2: Manual Installation

**Tesseract OCR:**

1. Download from: https://github.com/tesseract-ocr/tesseract/releases
2. Or use pre-built installer:
   ```bash
   # Download and install from:
   # https://github.com/tesseract-ocr/tesseract/wiki
   ```

**Poppler:**

1. Download from: https://poppler.freedesktop.org/
2. Or compile from source

#### Option 3: Update Command Line Tools (May Fix Homebrew)

```bash
# Remove old Command Line Tools
sudo rm -rf /Library/Developer/CommandLineTools

# Install new ones
sudo xcode-select --install
```

Then try Homebrew again:
```bash
brew install tesseract
brew install poppler
```

---

## Verification

After installation, verify the dependencies:

```bash
# Check Tesseract
tesseract --version

# Check Poppler
pdftoppm -v
```

Expected output:
- Tesseract: `tesseract 5.x.x` or similar
- Poppler: Version information

---

## Alternative: Docker Installation

If system installation is problematic, you can use Docker:

```dockerfile
# In Dockerfile
RUN apt-get update && \
    apt-get install -y tesseract-ocr poppler-utils && \
    apt-get clean
```

---

## Testing OCR Functionality

Once installed, test OCR:

```python
# In Django shell
python manage.py shell

from capture.services import OCRService
result = OCRService.extract_text_from_image('/path/to/image.png')
print(result)
```

---

## Notes

- **Tesseract** is required for OCR processing
- **Poppler** is required for PDF to image conversion (for OCR on PDFs)
- Both are optional - the system will work without them, but OCR features won't function
- OCR features will gracefully fail if dependencies are missing

---

## Current Status

- ✅ **Migrations:** All applied successfully
- ⚠️ **Tesseract OCR:** Needs installation (see options above)
- ⚠️ **Poppler:** Needs installation (see options above)

---

**Last Updated:** January 2025

