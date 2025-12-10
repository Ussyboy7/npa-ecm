#!/bin/bash

# Fix PATH and Install Tesseract
# Poppler is already installed via MacPorts, just need to add to PATH and install Tesseract

set -e

echo "========================================="
echo "Fix PATH & Install Tesseract"
echo "========================================="
echo ""

# Check if Poppler exists
if [ -f "/opt/local/bin/pdftoppm" ]; then
    echo "✅ Poppler found at /opt/local/bin/pdftoppm"
    /opt/local/bin/pdftoppm -v 2>&1 | head -1
    echo ""
else
    echo "❌ Poppler not found. Installing..."
    export PATH="/opt/local/bin:$PATH"
    sudo port install poppler
fi

# Add MacPorts to PATH for this session
export PATH="/opt/local/bin:$PATH"

# Check if MacPorts is available
if ! command -v port >/dev/null 2>&1; then
    echo "❌ MacPorts not found in PATH"
    echo ""
    echo "Adding MacPorts to PATH..."
    echo ""
    echo "To make this permanent, add to ~/.zshrc:"
    echo 'export PATH="/opt/local/bin:$PATH"'
    echo ""
    read -p "Would you like to add this to ~/.zshrc now? (y/n): " add_to_zshrc
    
    if [ "$add_to_zshrc" = "y" ] || [ "$add_to_zshrc" = "Y" ]; then
        if ! grep -q "/opt/local/bin" ~/.zshrc 2>/dev/null; then
            echo 'export PATH="/opt/local/bin:$PATH"' >> ~/.zshrc
            echo "✅ Added to ~/.zshrc"
            echo "Run: source ~/.zshrc (or restart terminal)"
        else
            echo "✅ Already in ~/.zshrc"
        fi
    fi
    
    export PATH="/opt/local/bin:$PATH"
fi

# Check if Tesseract is already installed
if command -v tesseract >/dev/null 2>&1; then
    echo "✅ Tesseract is already installed!"
    tesseract --version | head -1
    exit 0
fi

# Check if Tesseract is installed via MacPorts but not in PATH
if [ -f "/opt/local/bin/tesseract" ]; then
    echo "✅ Tesseract found at /opt/local/bin/tesseract"
    echo "Just need to add MacPorts to PATH (see above)"
    /opt/local/bin/tesseract --version | head -1
    exit 0
fi

# Install Tesseract
echo "Installing Tesseract OCR via MacPorts..."
echo "This may take 10-15 minutes..."
echo ""

sudo port install tesseract

echo ""
echo "✅ Tesseract installed!"
echo ""

# Verify installation
export PATH="/opt/local/bin:$PATH"
tesseract --version | head -1

echo ""
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "✅ Poppler: Installed"
echo "✅ Tesseract: Installed"
echo ""
echo "Note: Make sure /opt/local/bin is in your PATH"
echo "Add to ~/.zshrc if not already:"
echo 'export PATH="/opt/local/bin:$PATH"'
echo ""

