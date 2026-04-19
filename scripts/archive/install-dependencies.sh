#!/bin/bash

# System Dependencies Installation Script for NPA ECM
# This script helps install Tesseract OCR and Poppler on macOS

set -e

echo "========================================="
echo "NPA ECM - System Dependencies Installer"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check OS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script is for macOS only${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check installation
check_installation() {
    if command_exists "$1"; then
        echo -e "${GREEN}✓ $1 is installed${NC}"
        "$1" --version 2>/dev/null | head -1 || echo "  Version check failed"
        return 0
    else
        echo -e "${RED}✗ $1 is not installed${NC}"
        return 1
    fi
}

echo "Checking current installations..."
echo ""

# Check Tesseract
TESSERACT_INSTALLED=false
if check_installation tesseract; then
    TESSERACT_INSTALLED=true
fi

# Check Poppler
POPPLER_INSTALLED=false
if check_installation pdftoppm; then
    POPPLER_INSTALLED=true
fi

echo ""
echo "========================================="
echo "Installation Status"
echo "========================================="
echo ""

if [ "$TESSERACT_INSTALLED" = true ] && [ "$POPPLER_INSTALLED" = true ]; then
    echo -e "${GREEN}All dependencies are already installed!${NC}"
    exit 0
fi

# Installation options
echo "Installation Options:"
echo ""
echo "1. Homebrew (recommended if Command Line Tools are up to date)"
echo "2. Manual download instructions"
echo "3. Skip installation (you can install manually later)"
echo ""
read -p "Select option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Attempting installation via Homebrew..."
        
        if ! command_exists brew; then
            echo -e "${RED}Error: Homebrew is not installed${NC}"
            echo "Install Homebrew from: https://brew.sh"
            echo ""
            read -p "Would you like to install Homebrew now? (y/n): " install_brew
            if [ "$install_brew" = "y" ] || [ "$install_brew" = "Y" ]; then
                echo "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            else
                echo "Skipping Homebrew installation. Please install manually or choose another option."
                exit 1
            fi
        fi
        
        # Check Command Line Tools
        if ! xcode-select -p >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠ Command Line Tools not found.${NC}"
            echo "Installing Command Line Tools..."
            xcode-select --install || echo "Please install Command Line Tools manually from System Settings"
            echo "After Command Line Tools are installed, run this script again."
            exit 0
        fi
        
        # Update Homebrew
        echo "Updating Homebrew..."
        brew update || echo "Warning: Homebrew update failed, continuing..."
        
        # Install Tesseract
        if [ "$TESSERACT_INSTALLED" = false ]; then
            echo ""
            echo "Installing Tesseract OCR..."
            echo "This may take several minutes..."
            if brew install tesseract 2>&1 | tee /tmp/tesseract_install.log; then
                echo -e "${GREEN}✓ Tesseract installed successfully${NC}"
                tesseract --version | head -1
            else
                echo -e "${YELLOW}⚠ Tesseract installation failed.${NC}"
                echo "This is common on macOS 13. Trying alternative method..."
                echo ""
                echo "You can try:"
                echo "  1. Update Command Line Tools: sudo xcode-select --install"
                echo "  2. Use MacPorts: sudo port install tesseract"
                echo "  3. Manual installation (see option 2)"
                echo ""
                read -p "Would you like to try MacPorts installation? (y/n): " try_macports
                if [ "$try_macports" = "y" ] || [ "$try_macports" = "Y" ]; then
                    if command_exists port; then
                        sudo port install tesseract
                    else
                        echo "MacPorts not installed. See: https://www.macports.org/install.php"
                    fi
                fi
            fi
        fi
        
        # Install Poppler
        if [ "$POPPLER_INSTALLED" = false ]; then
            echo ""
            echo "Installing Poppler..."
            echo "This may take several minutes..."
            if brew install poppler 2>&1 | tee /tmp/poppler_install.log; then
                echo -e "${GREEN}✓ Poppler installed successfully${NC}"
                pdftoppm -v | head -1
            else
                echo -e "${YELLOW}⚠ Poppler installation failed.${NC}"
                echo "This is common on macOS 13. Trying alternative method..."
                echo ""
                echo "You can try:"
                echo "  1. Update Command Line Tools: sudo xcode-select --install"
                echo "  2. Use MacPorts: sudo port install poppler"
                echo "  3. Manual installation (see option 2)"
                echo ""
                read -p "Would you like to try MacPorts installation? (y/n): " try_macports
                if [ "$try_macports" = "y" ] || [ "$try_macports" = "Y" ]; then
                    if command_exists port; then
                        sudo port install poppler
                    else
                        echo "MacPorts not installed. See: https://www.macports.org/install.php"
                    fi
                fi
            fi
        fi
        ;;
    2)
        echo ""
        echo "========================================="
        echo "Manual Installation Instructions"
        echo "========================================="
        echo ""
        echo "Tesseract OCR:"
        echo "1. Download from: https://github.com/tesseract-ocr/tesseract/wiki"
        echo "   Or: https://github.com/tesseract-ocr/tesseract/releases"
        echo "2. Install the .dmg file"
        echo "3. Add to PATH if needed:"
        echo "   export PATH=\"/usr/local/bin:\$PATH\""
        echo ""
        echo "Poppler:"
        echo "1. Download from: https://poppler.freedesktop.org/"
        echo "2. Extract and add to PATH"
        echo "3. Or compile from source: https://poppler.freedesktop.org/INSTALL.html"
        echo ""
        echo "After installation, verify with:"
        echo "  tesseract --version"
        echo "  pdftoppm -v"
        ;;
    3)
        echo ""
        echo "Skipping installation. You can install manually later."
        echo "See DEPENDENCY_INSTALLATION_GUIDE.md for instructions."
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "Verification"
echo "========================================="
echo ""

# Verify installations
if check_installation tesseract; then
    echo "Tesseract languages:"
    tesseract --list-langs 2>/dev/null | tail -n +2 || echo "  (unable to list languages)"
fi

if check_installation pdftoppm; then
    echo ""
    echo "Poppler tools available:"
    command -v pdftoppm >/dev/null && echo "  ✓ pdftoppm"
    command -v pdftotext >/dev/null && echo "  ✓ pdftotext"
    command -v pdfinfo >/dev/null && echo "  ✓ pdfinfo"
fi

echo ""
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test OCR in Python:"
echo "   python manage.py shell"
echo "   >>> from capture.services import CaptureService"
echo ""
echo "2. Update search vectors (if needed):"
echo "   python manage.py update_search_vectors"
echo ""

