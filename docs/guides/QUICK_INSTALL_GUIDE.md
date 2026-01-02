# Quick Installation Guide - System Dependencies

**For macOS 13 (Ventura) Users**

---

## 🚀 Quick Start

Since you're on macOS 13, Homebrew may have compatibility issues. Here are the **fastest** ways to install:

### Option 1: MacPorts (Recommended for macOS 13) ⭐

```bash
# 1. Install MacPorts (one-time)
# Download from: https://www.macports.org/install.php
# Or use the installer:
open "https://www.macports.org/install.php"

# 2. After MacPorts is installed:
sudo port install tesseract
sudo port install poppler

# 3. Verify:
tesseract --version
pdftoppm -v
```

**Why MacPorts?** It has better support for older macOS versions.

---

### Option 2: Try Homebrew (May Work After Updates)

```bash
# 1. Update Command Line Tools first
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install

# 2. Wait for installation, then try:
brew install tesseract poppler

# 3. Verify:
tesseract --version
pdftoppm -v
```

---

### Option 3: Use the Installation Scripts

```bash
# Run the improved installation script
cd npa-ecm
./scripts/install-dependencies.sh

# Or install individually:
./scripts/install-tesseract-macos.sh
./scripts/install-poppler-macos.sh
```

---

## ⚡ One-Line Commands

### If MacPorts is installed:
```bash
sudo port install tesseract poppler
```

### If Homebrew works:
```bash
brew install tesseract poppler
```

---

## ✅ Verification

After installation, verify everything works:

```bash
# Run the verification script
./scripts/verify-dependencies.sh
```

Or manually:
```bash
tesseract --version
pdftoppm -v
```

---

## 📝 Important Notes

1. **The ECM system works WITHOUT these dependencies**
   - All features work except OCR on images/PDFs
   - You can install them later when needed

2. **Python packages are already installed**
   - ✅ pytesseract
   - ✅ pdf2image
   - ✅ Pillow

3. **System binaries are optional**
   - Only needed for OCR functionality
   - Can be installed anytime

---

## 🆘 Troubleshooting

### "Command not found" after installation

Add to PATH:
```bash
# Add to ~/.zshrc
export PATH="/usr/local/bin:$PATH"
export PATH="/opt/local/bin:$PATH"  # For MacPorts

# Reload
source ~/.zshrc
```

### Homebrew fails on macOS 13

This is expected. Use MacPorts instead (Option 1 above).

### Still having issues?

1. Check the detailed guide: `DEPENDENCY_INSTALLATION_GUIDE.md`
2. Run verification: `./scripts/verify-dependencies.sh`
3. The system works fine without OCR - install when needed

---

## 🎯 Recommended Path for macOS 13

1. **Install MacPorts** (if not already installed)
2. **Run:** `sudo port install tesseract poppler`
3. **Verify:** `./scripts/verify-dependencies.sh`

That's it! 🎉

---

**Last Updated:** January 2025

