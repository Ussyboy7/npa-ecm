# Quick Commands Reference

**For installing Tesseract English language data**

---

## ✅ Quick Fix

The PATH needs to be set in your current terminal. Run:

```bash
export PATH="/opt/local/bin:$PATH"
sudo port install tesseract-eng
```

Or use the automated script:

```bash
./scripts/install-tesseract-eng.sh
```

---

## 📝 Step-by-Step

### 1. Set PATH (for current terminal session)
```bash
export PATH="/opt/local/bin:$PATH"
```

### 2. Verify port is available
```bash
which port
# Should show: /opt/local/bin/port
```

### 3. Install English language data
```bash
sudo port install tesseract-eng
```

### 4. Verify installation
```bash
tesseract --list-langs
# Should show: eng
```

---

## 🔄 Permanent Fix

The PATH is already in your `~/.zshrc`, but you need to reload it:

```bash
# Reload your shell configuration
source ~/.zshrc

# Or just open a new terminal window
```

Then you can run:
```bash
sudo port install tesseract-eng
```

---

## ✅ Current Status

- ✅ Tesseract: Installed (5.4.1)
- ✅ Poppler: Installed (24.04.0)
- ⚠️ English Language Data: Needs installation

**After installing tesseract-eng, everything will be complete!**

---

**Last Updated:** January 2025

