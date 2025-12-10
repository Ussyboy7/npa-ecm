#!/bin/bash

# Simple one-command installation attempt
# This tries Homebrew first, then provides alternatives

set -e

echo "========================================="
echo "Quick Installation Attempt"
echo "========================================="
echo ""

# Check prerequisites
if ! command -v brew >/dev/null 2>&1; then
    echo "❌ Homebrew not found. Please install from https://brew.sh"
    exit 1
fi

if ! xcode-select -p >/dev/null 2>&1; then
    echo "❌ Command Line Tools not found. Installing..."
    xcode-select --install
    echo "Please wait for installation, then run this script again."
    exit 0
fi

echo "✅ Prerequisites check passed"
echo ""

# Try installing Tesseract
if ! command -v tesseract >/dev/null 2>&1; then
    echo "Installing Tesseract OCR..."
    if brew install tesseract 2>&1; then
        echo "✅ Tesseract installed!"
    else
        echo "⚠️  Tesseract installation failed (common on macOS 13)"
        echo ""
        echo "Alternative: Install MacPorts and run: sudo port install tesseract"
        echo "Or: The system works fine without OCR - install when needed"
    fi
else
    echo "✅ Tesseract already installed"
fi

echo ""

# Try installing Poppler
if ! command -v pdftoppm >/dev/null 2>&1; then
    echo "Installing Poppler..."
    if brew install poppler 2>&1; then
        echo "✅ Poppler installed!"
    else
        echo "⚠️  Poppler installation failed (common on macOS 13)"
        echo ""
        echo "Alternative: Install MacPorts and run: sudo port install poppler"
        echo "Or: The system works fine without OCR - install when needed"
    fi
else
    echo "✅ Poppler already installed"
fi

echo ""
echo "========================================="
echo "Verification"
echo "========================================="
./scripts/verify-dependencies.sh

