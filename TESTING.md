# Testing Guide - FocusGuard

## How to Test the Blocking Feature

### Step 1: Reload the Extension

After updating the code:
1. Go to `chrome://extensions/`
2. Find **FocusGuard - Website Blocker**
3. Click the **Reload** button (circular arrow icon)

### Step 2: Add a Test Site

1. Click the FocusGuard extension icon
2. Add a site to block:
   - **Easy test**: `example.com` (Exact Domain)
   - **Or**: `*.example.com` (Wildcard)
   - **Or**: `example` (Keyword)
3. Click **Add**
4. Verify the site appears in the list with a ✓ (enabled)

### Step 3: Test Blocking

1. Open a new tab
2. Navigate to `https://example.com`
3. You should see the **FocusGuard blocked page** immediately

### Step 4: Check Browser Console (for debugging)

If blocking doesn't work:
1. Press `F12` to open DevTools
2. Go to the **Console** tab
3. Look for `[FocusGuard]` messages:
   ```
   [FocusGuard] Checking URL: example.com | Blocked sites count: 1
   [FocusGuard] ✓ BLOCKED by exact match: example.com
   ```

### Step 5: Check Service Worker Logs

For more detailed debugging:
1. Go to `chrome://extensions/`
2. Find FocusGuard
3. Click **service worker** (blue link under "Inspect views")
4. A DevTools window opens showing background script logs
5. Try visiting a blocked site again
6. You should see the `[FocusGuard]` logs appear here

## Common Issues & Solutions

### Issue: Sites not getting blocked

**Solution 1: Reload the extension**
- Go to `chrome://extensions/`
- Click the reload button on FocusGuard

**Solution 2: Check the pattern**
- Make sure the pattern matches the URL
- Try using keyword match (simplest) first
- Example: Use `facebook` instead of `facebook.com`

**Solution 3: Verify site is enabled**
- Open the extension popup
- Make sure the site has a ✓ (not ○)
- If it shows ○, click the toggle button

**Solution 4: Check permissions**
- Go to `chrome://extensions/`
- Click **Details** on FocusGuard
- Scroll to **Permissions**
- Make sure it has access to "Read your browsing history"

### Issue: Extension popup shows errors

- Open DevTools while the popup is open (right-click popup → Inspect)
- Check for error messages in the console

### Issue: Blocked page shows but challenge doesn't work

- This is a separate issue from blocking
- Check the console on the blocked page for errors

## Quick Test Commands

You can test by visiting these sites:
- `http://example.com` - Standard test domain
- `http://www.example.com` - Test www handling
- Any site you actually want to block!

## Example Test Scenarios

### Test 1: Exact Domain
1. Add: `facebook.com` (Exact)
2. Visit: `https://facebook.com` → Should block ✓
3. Visit: `https://www.facebook.com` → Should block ✓
4. Visit: `https://m.facebook.com` → Should NOT block

### Test 2: Wildcard Subdomain
1. Add: `*.facebook.com` (Wildcard)
2. Visit: `https://m.facebook.com` → Should block ✓
3. Visit: `https://www.facebook.com` → Should block ✓
4. Visit: `https://facebook.com` → Should block ✓

### Test 3: Keyword
1. Add: `reddit` (Keyword)
2. Visit: `https://reddit.com` → Should block ✓
3. Visit: `https://www.reddit.com` → Should block ✓
4. Visit: `https://old.reddit.com` → Should block ✓
5. Visit: Any URL with "reddit" in it → Should block ✓

## What Changed (for debugging)

The key fixes made:
1. Changed from `webNavigation.onBeforeNavigate` to `tabs.onUpdated` (more reliable)
2. Added debug console logging
3. Improved www. prefix handling (normalizes both hostname and pattern)
4. Fixed typo in popup.js

If you still have issues, check the console logs - they will show exactly what's happening!
