#!/bin/bash

# Install Tesseract English Language Data
# Make sure MacPorts is in PATH first

set -e

echo "========================================="
echo "Install Tesseract English Language Data"
echo "========================================="
echo ""

# Add MacPorts to PATH
export PATH="/opt/local/bin:$PATH"

# Check if port is available
if ! command -v port >/dev/null 2>&1; then
    echo "❌ MacPorts not found in PATH"
    echo ""
    echo "Adding MacPorts to PATH..."
    export PATH="/opt/local/bin:$PATH"
    
    if ! command -v port >/dev/null 2>&1; then
        echo "❌ MacPorts still not found. Please check your installation."
        exit 1
    fi
fi

echo "✅ MacPorts found"
echo ""

# Check current languages
echo "Current Tesseract languages:"
tesseract --list-langs 2>&1 || echo "No languages installed yet"
echo ""

# Install English language data
echo "Installing Tesseract English language data..."
echo "This will require your password."
echo ""

sudo port install tesseract-eng

echo ""
echo "✅ English language data installed!"
echo ""

# Verify
echo "Verifying installation..."
tesseract --list-langs

echo ""
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "Tesseract is now ready with English language support."
echo ""

