# 🛡️ FocusGuard - Website Blocker Chrome Extension

A powerful Chrome extension to help you stay focused by blocking distracting websites. Features smart blocking rules and engaging challenges for temporary unblocking.

## ✨ Features

### 🎯 Flexible Blocking Rules
- **Exact Domain Match**: Block specific domains like `facebook.com`
- **Wildcard Patterns**: Block subdomains with `*.example.com` or complex patterns like `*reddit*/r/*`
- **Keyword Matching**: Block any URL containing specific keywords

### 🧩 Temporary Unblock Challenges
When you need to access a blocked site temporarily, solve a challenge first:
- **Math Problems**: Solve random arithmetic questions
- **Typing Challenges**: Type motivational phrases exactly
- **Wait Timers**: Introduce friction by forcing a wait period
- **Mixed Mode**: Combine math problems with wait timers for extra resistance

### ⚙️ Customizable Behavior
- **Warning Page**: Show a blocked page with motivational quotes (default)
- **Redirect Mode**: Automatically redirect to a productive URL
- **Statistics**: Track how many times sites were blocked each day

### 🎨 Modern UI
- Beautiful, intuitive popup interface
- Comprehensive settings page
- Smooth animations and transitions
- Responsive design

## 📥 Installation

### For Development/Testing

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd blocksite-ext
   ```

2. **Open Chrome and navigate to Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `blocksite-ext` directory

4. **The extension is now installed!**
   - You should see the FocusGuard icon in your toolbar

### For Production

This extension is currently in development. For production use:
1. Follow the development installation steps above
2. Or package it as a `.crx` file for distribution

## 🚀 Usage

### Quick Start

1. **Click the extension icon** in your toolbar
2. **Add a site to block**:
   - Quick block: Click "Block This Site" for the current page
   - Manual add: Enter a URL pattern and select rule type
3. **Configure settings** (optional):
   - Click the ⚙️ Settings button
   - Choose blocking behavior
   - Select challenge type
   - Customize wait duration

### Blocking Rules Examples

| Rule Type | Pattern | What it blocks |
|-----------|---------|----------------|
| Exact Domain | `facebook.com` | Only facebook.com |
| Wildcard | `*.facebook.com` | All Facebook subdomains |
| Wildcard | `*facebook*` | Any URL containing "facebook" |
| Wildcard | `*reddit*/r/videos*` | Reddit videos subreddit |
| Keyword | `youtube` | Any URL with "youtube" |

### Temporary Unblock

When you visit a blocked site:

1. **See the blocked page** with motivational quotes
2. **Click "Temporarily Unblock"**
3. **Complete the challenge** based on your settings:
   - **Math**: Solve the arithmetic problem
   - **Typing**: Type the phrase exactly as shown
   - **Wait**: Wait for the countdown to finish
   - **Mixed**: Solve math, then wait
4. **Access granted** for 15 minutes

### Managing Blocked Sites

**Via Popup:**
- View all blocked sites
- Toggle sites on/off with ✓/○ button
- Delete sites with × button
- See active site count

**Via Settings Page:**
- Full table view with status badges
- Enable/disable individual sites
- Delete sites with confirmation
- View temporary unblocks with time remaining

## 🎮 Challenge Types

### Math Problem
Solve random arithmetic:
- Addition: `17 + 23 = ?`
- Subtraction: `45 - 18 = ?`
- Multiplication: `7 × 8 = ?`

### Typing Challenge
Type motivational phrases exactly:
- "I am in control of my focus and time."
- "I choose productivity over distraction."
- And more...

### Wait Timer
Visual countdown timer with circular progress indicator.
Default: 30 seconds (configurable from 10-300 seconds)

### Mixed Challenge
Combines Math + Wait for maximum friction.
Perfect for your most distracting sites!

## ⚙️ Configuration Options

### Blocking Behavior
- **Warning Page** (Recommended): Shows blocked page with stats and motivational quotes
- **Redirect**: Automatically redirects to a URL of your choice

### Challenge Settings
- **Type**: Choose from Math, Typing, Wait, or Mixed
- **Wait Duration**: Set timer length (10-300 seconds)

### Advanced
- **Per-site rules**: Each blocked site can use different rule types
- **Enable/Disable**: Temporarily disable blocking for specific sites
- **Statistics**: Track blocking frequency per day

## 📁 Project Structure

```
blocksite-ext/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background script for blocking logic
├── popup/
│   ├── popup.html            # Popup UI
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup logic
├── options/
│   ├── options.html          # Settings page
│   ├── options.css           # Settings styles
│   └── options.js            # Settings logic
├── blocked/
│   ├── blocked.html          # Blocked page
│   ├── blocked.css           # Blocked page styles
│   └── blocked.js            # Challenge system
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # This file
```

## 🔧 Development

### Technologies Used
- **Manifest V3**: Latest Chrome extension API
- **Vanilla JavaScript**: No frameworks for minimal footprint
- **CSS3**: Modern styling with animations
- **Chrome Storage API**: Persistent data storage
- **Web Navigation API**: URL interception

### Key Files

- **`background/service-worker.js`**: Core blocking logic, URL pattern matching
- **`blocked/blocked.js`**: Challenge system implementation
- **`popup/popup.js`**: Quick site management
- **`options/options.js`**: Full settings management

### Modifying Challenge System

To add new challenge types, edit `blocked/blocked.js`:

```javascript
// Add to challenge types in settings
challengeType: 'your-type'

// Implement setup function
function setupYourChallenge() {
  // Setup challenge UI
}

// Implement verification
function checkYourAnswer() {
  // Verify and call grantTemporaryUnblock()
}
```

## 🐛 Troubleshooting

### Extension not blocking sites
- Check if the site is enabled in the popup/settings
- Verify the URL pattern matches the site you're visiting
- Try using a wildcard pattern like `*example.com*`

### Challenge not working
- Refresh the blocked page
- Check challenge type in settings
- Ensure JavaScript is enabled

### Icons not showing
- Default colored squares are included as placeholders
- For custom icons, see `icons/README.md`
- Run `python3 create_icons.py` to regenerate placeholders

## 🤝 Contributing

This is a personal productivity tool, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is provided as-is for personal use. Feel free to modify and distribute as needed.

## 🎯 Future Ideas

- [ ] Schedule-based blocking (block during work hours)
- [ ] Allowlist mode (block everything except allowed sites)
- [ ] Export/import blocked site lists
- [ ] Sync settings across devices
- [ ] Custom challenge questions
- [ ] Block site categories (social media, news, etc.)
- [ ] Productivity reports and insights
- [ ] Password protection for settings

## 💡 Tips for Success

1. **Start small**: Block your top 3 distracting sites first
2. **Use strict challenges**: Mixed mode is most effective
3. **Review statistics**: Check how often you're being blocked
4. **Adjust as needed**: Fine-tune patterns and challenge difficulty
5. **Stay motivated**: Read the motivational quotes when blocked
6. **Be honest**: Don't disable the extension when it's working!

## 🙏 Acknowledgments

Built with focus and determination. Stay productive! 🚀

---

**Remember**: The goal isn't to completely block yourself from the internet, but to add friction to mindless browsing and help you make conscious decisions about your time.

Stay focused, stay productive! 💪
