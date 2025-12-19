# FocusGuard - Quick Start Guide

## 📥 Installation (3 steps)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked** → Select the `blocksite-ext` folder

Done! The extension icon should appear in your toolbar.

## 🚀 Basic Usage

### Block a Website

**Method 1 - Quick Block:**
1. Visit the site you want to block
2. Click the FocusGuard extension icon
3. Click "Block This Site"

**Method 2 - Manual Add:**
1. Click the extension icon
2. Enter a URL pattern (e.g., `facebook.com`)
3. Select rule type (Exact/Wildcard/Keyword)
4. Click "Add"

### Rule Types Examples

| Type | Pattern | Blocks |
|------|---------|--------|
| Exact | `facebook.com` | Only facebook.com |
| Wildcard | `*.facebook.com` | All Facebook subdomains |
| Wildcard | `*reddit*/videos*` | Reddit video pages |
| Keyword | `youtube` | Any URL with "youtube" |

### Temporary Unblock

When blocked:
1. Click "Temporarily Unblock" on the blocked page
2. Complete the challenge (math/typing/wait timer)
3. Get 15 minutes of access

## ⚙️ Settings

Click the ⚙️ button in popup or right-click extension icon → Options

- **Block Mode**: Warning page or redirect
- **Challenge Type**: Math / Typing / Wait Timer / Mixed
- **Wait Duration**: 10-300 seconds

## 💡 Pro Tips

- Use **Wildcard** (`*.domain.com`) for subdomains
- Use **Mixed** challenge for maximum friction
- Check statistics to see blocking patterns
- Toggle sites on/off without deleting them

---

**Need more details?** See [README.md](README.md) for full documentation.
