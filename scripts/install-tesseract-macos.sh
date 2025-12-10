#!/bin/bash

# Direct Tesseract Installation for macOS
# This script attempts to install Tesseract using the most reliable method

set -e

echo "========================================="
echo "Tesseract OCR Installation for macOS"
echo "========================================="
echo ""

# Check if already installed
if command -v tesseract >/dev/null 2>&1; then
    echo "✓ Tesseract is already installed!"
    tesseract --version
    exit 0
fi

# Method 1: Try Homebrew (if available and Command Line Tools are updated)
if command -v brew >/dev/null 2>&1; then
    echo "Attempting installation via Homebrew..."
    echo ""
    
    # Check if we need to update Command Line Tools first
    if ! xcode-select -p >/dev/null 2>&1; then
        echo "⚠ Command Line Tools not found. Installing..."
        xcode-select --install || echo "Please install Command Line Tools manually"
    fi
    
    # Try to install
    if brew install tesseract 2>&1 | tee /tmp/tesseract_install.log; then
        echo ""
        echo "✓ Tesseract installed successfully via Homebrew!"
        tesseract --version
        exit 0
    else
        echo ""
        echo "⚠ Homebrew installation failed. Trying alternative methods..."
        echo ""
    fi
fi

# Method 2: Download pre-built binary (if available)
echo "Checking for pre-built binaries..."
echo ""

# Create install directory
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "For macOS 13 (Ventura), you have these options:"
echo ""
echo "Option A: Install via MacPorts (Recommended)"
echo "  1. Install MacPorts: https://www.macports.org/install.php"
echo "  2. Run: sudo port install tesseract"
echo ""
echo "Option B: Download pre-built binary"
echo "  1. Visit: https://github.com/tesseract-ocr/tesseract/wiki"
echo "  2. Look for macOS installer or download from releases"
echo "  3. Install the .dmg file"
echo ""
echo "Option C: Compile from source"
echo "  1. Install dependencies: brew install autoconf automake libtool pkg-config"
echo "  2. Clone: git clone https://github.com/tesseract-ocr/tesseract.git"
echo "  3. Build and install (see tesseract README)"
echo ""

read -p "Would you like to try installing MacPorts now? (y/n): " install_macports

if [ "$install_macports" = "y" ] || [ "$install_macports" = "Y" ]; then
    echo ""
    echo "MacPorts Installation:"
    echo "1. Download MacPorts installer from: https://www.macports.org/install.php"
    echo "2. Run the installer"
    echo "3. After installation, run: sudo port install tesseract"
    echo ""
    echo "Opening MacPorts download page..."
    open "https://www.macports.org/install.php" 2>/dev/null || echo "Please visit: https://www.macports.org/install.php"
else
    echo ""
    echo "Manual installation steps:"
    echo ""
    echo "1. Tesseract OCR:"
    echo "   - Visit: https://github.com/tesseract-ocr/tesseract/wiki"
    echo "   - Download macOS installer or compile from source"
    echo ""
    echo "2. After installation, verify with:"
    echo "   tesseract --version"
    echo ""
    echo "3. Add to PATH if needed:"
    echo "   export PATH=\"/usr/local/bin:\$PATH\""
    echo "   (Add to ~/.zshrc for permanent)"
fi

echo ""
echo "========================================="
echo "Note: The ECM system works without OCR"
echo "========================================="
echo "You can use all features except OCR processing."
echo "Install Tesseract when you need OCR functionality."

