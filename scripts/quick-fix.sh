#!/bin/bash
echo "========================================="
echo "Quick Fix: Add MacPorts to PATH & Install Tesseract"
echo "========================================="
echo ""
echo "✅ Poppler Status: INSTALLED (v24.04.0)"
echo "⚠️  Tesseract Status: NOT INSTALLED"
echo ""
echo "Solution:"
echo "1. Add MacPorts to PATH"
echo "2. Install Tesseract"
echo ""
read -p "Add MacPorts to PATH in ~/.zshrc? (y/n): " add_path
if [ "$add_path" = "y" ] || [ "$add_path" = "Y" ]; then
    if ! grep -q "/opt/local/bin" ~/.zshrc 2>/dev/null; then
        echo 'export PATH="/opt/local/bin:$PATH"' >> ~/.zshrc
        echo "✅ Added to ~/.zshrc"
    else
        echo "✅ Already in ~/.zshrc"
    fi
    export PATH="/opt/local/bin:$PATH"
fi
echo ""
read -p "Install Tesseract now? (y/n): " install_tess
if [ "$install_tess" = "y" ] || [ "$install_tess" = "Y" ]; then
    export PATH="/opt/local/bin:$PATH"
    echo "Installing Tesseract (this may take 10-15 minutes)..."
    sudo port install tesseract
    echo ""
    echo "✅ Tesseract installed!"
    tesseract --version | head -1
else
    echo "Skipped. Install manually with: sudo port install tesseract"
fi
echo ""
echo "========================================="
echo "Verification"
echo "========================================="
export PATH="/opt/local/bin:$PATH"
echo "Poppler:"
pdftoppm -v 2>&1 | head -1
echo ""
if command -v tesseract >/dev/null 2>&1; then
    echo "Tesseract:"
    tesseract --version | head -1
else
    echo "Tesseract: Not installed (run: sudo port install tesseract)"
fi
