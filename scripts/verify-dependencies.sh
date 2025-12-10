#!/bin/bash

# Dependency Verification Script for NPA ECM

set -e

echo "========================================="
echo "NPA ECM - Dependency Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check function
check_dependency() {
    local name=$1
    local command=$2
    local test_cmd=$3
    
    echo -n "Checking $name... "
    if command -v "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Installed${NC}"
        if [ -n "$test_cmd" ]; then
            eval "$test_cmd" >/dev/null 2>&1 && echo "  Test: ${GREEN}✓ Working${NC}" || echo "  Test: ${YELLOW}⚠ May have issues${NC}"
        fi
        return 0
    else
        echo -e "${RED}✗ Not installed${NC}"
        return 1
    fi
}

# System dependencies
echo "System Dependencies:"
echo "-------------------"
TESSERACT_OK=false
POPPLER_OK=false

if check_dependency "Tesseract OCR" "tesseract" "tesseract --version"; then
    TESSERACT_OK=true
    echo "  Version: $(tesseract --version 2>/dev/null | head -1)"
    echo "  Languages: $(tesseract --list-langs 2>/dev/null | tail -n +2 | wc -l | tr -d ' ') installed"
fi

if check_dependency "Poppler" "pdftoppm" "pdftoppm -v"; then
    POPPLER_OK=true
    echo "  Version: $(pdftoppm -v 2>/dev/null | head -1)"
fi

echo ""
echo "Python Dependencies:"
echo "-------------------"

# Check Python packages
cd "$(dirname "$0")/../backend" || exit 1

if [ -d ".venv" ]; then
    PYTHON=".venv/bin/python"
elif [ -d "env" ]; then
    PYTHON="env/bin/python"
else
    PYTHON="python3"
fi

echo "Using Python: $PYTHON"
echo ""

check_python_package() {
    local name=$1
    local import_name=$2
    
    echo -n "Checking $name... "
    if $PYTHON -c "import $import_name" 2>/dev/null; then
        echo -e "${GREEN}✓ Installed${NC}"
        return 0
    else
        echo -e "${RED}✗ Not installed${NC}"
        return 1
    fi
}

PYTESSERACT_OK=false
PDF2IMAGE_OK=false
PILLOW_OK=false

if check_python_package "pytesseract" "pytesseract"; then
    PYTESSERACT_OK=true
fi

if check_python_package "pdf2image" "pdf2image"; then
    PDF2IMAGE_OK=true
fi

if check_python_package "Pillow" "PIL"; then
    PILLOW_OK=true
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""

ALL_OK=true

if [ "$TESSERACT_OK" = false ]; then
    echo -e "${RED}✗ Tesseract OCR is not installed${NC}"
    echo "   Install with: brew install tesseract"
    echo "   Or see: DEPENDENCY_INSTALLATION_GUIDE.md"
    ALL_OK=false
else
    echo -e "${GREEN}✓ Tesseract OCR${NC}"
fi

if [ "$POPPLER_OK" = false ]; then
    echo -e "${RED}✗ Poppler is not installed${NC}"
    echo "   Install with: brew install poppler"
    echo "   Or see: DEPENDENCY_INSTALLATION_GUIDE.md"
    ALL_OK=false
else
    echo -e "${GREEN}✓ Poppler${NC}"
fi

if [ "$PYTESSERACT_OK" = false ]; then
    echo -e "${RED}✗ pytesseract Python package is not installed${NC}"
    echo "   Install with: pip install pytesseract"
    ALL_OK=false
else
    echo -e "${GREEN}✓ pytesseract${NC}"
fi

if [ "$PDF2IMAGE_OK" = false ]; then
    echo -e "${RED}✗ pdf2image Python package is not installed${NC}"
    echo "   Install with: pip install pdf2image"
    ALL_OK=false
else
    echo -e "${GREEN}✓ pdf2image${NC}"
fi

if [ "$PILLOW_OK" = false ]; then
    echo -e "${RED}✗ Pillow Python package is not installed${NC}"
    echo "   Install with: pip install Pillow"
    ALL_OK=false
else
    echo -e "${GREEN}✓ Pillow${NC}"
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}All dependencies are installed and ready!${NC}"
    echo ""
    echo "You can now use OCR features in the ECM system."
    exit 0
else
    echo -e "${YELLOW}Some dependencies are missing.${NC}"
    echo ""
    echo "The ECM system will work without OCR capabilities."
    echo "To enable OCR, install the missing dependencies."
    echo ""
    echo "See DEPENDENCY_INSTALLATION_GUIDE.md for detailed instructions."
    exit 1
fi

