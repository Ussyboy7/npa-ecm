#!/bin/bash

# Direct Poppler Installation for macOS
# This script attempts to install Poppler using the most reliable method

set -e

echo "========================================="
echo "Poppler Installation for macOS"
echo "========================================="
echo ""

# Check if already installed
if command -v pdftoppm >/dev/null 2>&1; then
    echo "✓ Poppler is already installed!"
    pdftoppm -v
    exit 0
fi

# Method 1: Try Homebrew
if command -v brew >/dev/null 2>&1; then
    echo "Attempting installation via Homebrew..."
    echo ""
    
    if brew install poppler 2>&1 | tee /tmp/poppler_install.log; then
        echo ""
        echo "✓ Poppler installed successfully via Homebrew!"
        pdftoppm -v
        exit 0
    else
        echo ""
        echo "⚠ Homebrew installation failed. Trying alternative methods..."
        echo ""
    fi
fi

# Method 2: MacPorts
if command -v port >/dev/null 2>&1; then
    echo "Attempting installation via MacPorts..."
    echo ""
    
    if sudo port install poppler; then
        echo ""
        echo "✓ Poppler installed successfully via MacPorts!"
        pdftoppm -v
        exit 0
    fi
fi

# Manual instructions
echo "For macOS 13 (Ventura), you have these options:"
echo ""
echo "Option A: Install via MacPorts (Recommended)"
echo "  1. Install MacPorts: https://www.macports.org/install.php"
echo "  2. Run: sudo port install poppler"
echo ""
echo "Option B: Download pre-built binary"
echo "  1. Visit: https://poppler.freedesktop.org/"
echo "  2. Download macOS binary or compile from source"
echo ""
echo "Option C: Compile from source"
echo "  1. Install dependencies: brew install cmake pkg-config"
echo "  2. Download source: https://poppler.freedesktop.org/releases.html"
echo "  3. Build and install (see INSTALL file)"
echo ""

read -p "Would you like to try installing MacPorts now? (y/n): " install_macports

if [ "$install_macports" = "y" ] || [ "$install_macports" = "Y" ]; then
    echo ""
    echo "MacPorts Installation:"
    echo "1. Download MacPorts installer from: https://www.macports.org/install.php"
    echo "2. Run the installer"
    echo "3. After installation, run: sudo port install poppler"
    echo ""
    echo "Opening MacPorts download page..."
    open "https://www.macports.org/install.php" 2>/dev/null || echo "Please visit: https://www.macports.org/install.php"
else
    echo ""
    echo "Manual installation steps:"
    echo ""
    echo "1. Poppler:"
    echo "   - Visit: https://poppler.freedesktop.org/"
    echo "   - Download macOS binary or compile from source"
    echo ""
    echo "2. After installation, verify with:"
    echo "   pdftoppm -v"
    echo ""
    echo "3. Add to PATH if needed:"
    echo "   export PATH=\"/usr/local/bin:\$PATH\""
    echo "   (Add to ~/.zshrc for permanent)"
fi

echo ""
echo "========================================="
echo "Note: The ECM system works without Poppler"
echo "========================================="
echo "You can use all features except PDF-to-image conversion for OCR."
echo "Install Poppler when you need OCR on PDF files."

