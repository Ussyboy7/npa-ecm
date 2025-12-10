# System Dependencies Installation Guide

**Date:** January 2025  
**Status:** Installation Instructions

---

## Summary

This guide provides step-by-step instructions for installing system dependencies required by the ECM modules:
- **Tesseract OCR** - For Content Capture Module (OCR processing)
- **Poppler** - For PDF processing in OCR (PDF to image conversion)

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

#### Option 1: MacPorts (Recommended for macOS 13 Ventura)

If you have MacPorts installed:

```bash
# Install Tesseract OCR
sudo port install tesseract

# Install Poppler (includes pdftoppm)
sudo port install poppler

# Verify installation
tesseract --version
pdftoppm -v
```

**Install MacPorts (if not installed):**
1. Download from: https://www.macports.org/install.php
2. Follow installation instructions for macOS 13

#### Option 2: Homebrew (After updating Command Line Tools)

**First, update Command Line Tools:**

```bash
# Remove old Command Line Tools
sudo rm -rf /Library/Developer/CommandLineTools

# Install new ones
sudo xcode-select --install
```

**Then install via Homebrew:**

```bash
# Install Tesseract OCR
brew install tesseract

# Install Poppler
brew install poppler

# Verify installation
tesseract --version
pdftoppm -v
```

#### Option 3: Manual Installation

**Tesseract OCR:**

1. Download pre-built binary from:
   - https://github.com/tesseract-ocr/tesseract/wiki
   - Or use: https://github.com/tesseract-ocr/tesseract/releases

2. Install the `.dmg` file

3. Add to PATH (if needed):
   ```bash
   export PATH="/usr/local/bin:$PATH"
   ```

**Poppler:**

1. Download from: https://poppler.freedesktop.org/
2. Extract and add to PATH
3. Or compile from source (see: https://poppler.freedesktop.org/INSTALL.html)

#### Option 4: Conda (If you use Conda/Miniconda)

```bash
# Install Tesseract
conda install -c conda-forge tesseract

# Install Poppler
conda install -c conda-forge poppler
```

---

## Verification

After installation, verify the dependencies:

```bash
# Check Tesseract
tesseract --version
# Expected: tesseract 5.x.x or similar

# Check Poppler
pdftoppm -v
# Expected: pdftoppm version x.x.x or similar

# List available Tesseract languages
tesseract --list-langs
```

---

## Testing OCR Functionality

Once installed, test OCR in Django:

```bash
# Start Django shell
python manage.py shell
```

```python
# Test Tesseract
import pytesseract
from PIL import Image

# Create a test image or use an existing one
img = Image.open('/path/to/test/image.png')
text = pytesseract.image_to_string(img)
print(text)

# Test Poppler (PDF to image)
from pdf2image import convert_from_path

images = convert_from_path('/path/to/test.pdf')
print(f"Converted {len(images)} pages")
```

---

## Python Package Dependencies

The following Python packages are already in `requirements.txt`:

- ✅ `pytesseract>=0.3` - Python wrapper for Tesseract
- ✅ `pdf2image>=1.17` - PDF to image conversion
- ✅ `Pillow>=10.4` - Image processing

**Install Python packages (if not already installed):**

```bash
cd backend
source .venv/bin/activate  # or env/bin/activate
pip install -r requirements.txt
```

---

## Docker Installation (Alternative)

If system installation is problematic, use Docker:

```dockerfile
# In Dockerfile
FROM python:3.11

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

---

## Troubleshooting

### Tesseract Not Found

**Error:** `TesseractNotFoundError: tesseract is not installed`

**Solutions:**
1. Verify installation: `which tesseract`
2. Add to PATH if needed
3. Set path in Python:
   ```python
   import pytesseract
   pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'
   ```

### Poppler Not Found

**Error:** `pdf2image.exceptions.PDFInfoNotInstalledError`

**Solutions:**
1. Verify installation: `which pdftoppm`
2. Install poppler-utils (Linux) or poppler (macOS)
3. Set path in Python:
   ```python
   from pdf2image import convert_from_path
   # Poppler path (if needed)
   images = convert_from_path('file.pdf', poppler_path='/usr/local/bin')
   ```

### Permission Errors

If you get permission errors:

```bash
# macOS: Fix permissions
sudo chown -R $(whoami) /usr/local/bin

# Or install to user directory
brew install --prefix=$HOME/.local tesseract poppler
```

---

## Current Status

- ✅ **Migrations:** All applied successfully
- ✅ **Python Packages:** Installed (pytesseract, pdf2image, Pillow)
- ⚠️ **Tesseract OCR:** Needs system installation (see options above)
- ⚠️ **Poppler:** Needs system installation (see options above)

---

## Notes

- **Tesseract** is required for OCR processing of images and PDFs
- **Poppler** is required for PDF to image conversion (needed for OCR on PDFs)
- Both are **optional** - the system will work without them, but OCR features won't function
- OCR features will gracefully fail if dependencies are missing (error handling in place)
- You can test the system without OCR first, then add OCR capabilities later

---

## Quick Start (After Installation)

1. **Verify dependencies:**
   ```bash
   tesseract --version
   pdftoppm -v
   ```

2. **Test OCR in Django:**
   ```bash
   python manage.py shell
   ```
   ```python
   from capture.services import CaptureService
   # Test with a document
   ```

3. **Update search vectors (for existing documents):**
   ```bash
   python manage.py update_search_vectors
   ```

---

**Last Updated:** January 2025

