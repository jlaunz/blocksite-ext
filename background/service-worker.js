// Background service worker for FocusGuard extension

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    blockedSites: [],
    blockMode: 'warning', // 'warning' or 'redirect'
    redirectUrl: 'https://www.google.com',
    challengeType: 'math', // 'math', 'typing', 'wait', 'mixed'
    waitDuration: 30, // seconds
    temporaryUnblocks: {} // { url: expiryTimestamp }
  };

  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (existing[key] === undefined) {
      toSet[key] = value;
    }
  }

  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
});

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  const urlObj = new URL(url);

  // Skip chrome:// and extension pages
  if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
    return;
  }

  // Check if URL should be blocked
  const shouldBlock = await checkIfBlocked(url);

  if (shouldBlock) {
    // Redirect to blocked page
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked/blocked.html') + '?url=' + encodeURIComponent(url)
    });
  }
});

// Check if a URL matches blocking rules
async function checkIfBlocked(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const fullUrl = url.toLowerCase();

    // Get settings from storage
    const data = await chrome.storage.local.get(['blockedSites', 'temporaryUnblocks']);
    const blockedSites = data.blockedSites || [];
    const temporaryUnblocks = data.temporaryUnblocks || {};

    // Check if site has temporary unblock that's still valid
    const now = Date.now();
    for (const [unblockedUrl, expiry] of Object.entries(temporaryUnblocks)) {
      if (now < expiry && urlMatchesPattern(url, unblockedUrl)) {
        return false; // Don't block, temporary unblock is active
      }
    }

    // Clean up expired temporary unblocks
    const validUnblocks = {};
    for (const [unblockedUrl, expiry] of Object.entries(temporaryUnblocks)) {
      if (now < expiry) {
        validUnblocks[unblockedUrl] = expiry;
      }
    }
    if (Object.keys(validUnblocks).length !== Object.keys(temporaryUnblocks).length) {
      await chrome.storage.local.set({ temporaryUnblocks: validUnblocks });
    }

    // Check each blocked site rule
    for (const site of blockedSites) {
      if (!site.enabled) continue;

      const pattern = site.pattern.toLowerCase();

      // Match based on rule type
      switch (site.type) {
        case 'exact':
          // Exact domain match
          if (hostname === pattern || hostname === 'www.' + pattern) {
            return true;
          }
          break;

        case 'wildcard':
          // Wildcard subdomain match (*.example.com)
          if (pattern.startsWith('*.')) {
            const domain = pattern.substring(2);
            if (hostname === domain || hostname.endsWith('.' + domain)) {
              return true;
            }
          } else if (pattern.includes('*')) {
            // General wildcard pattern
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            if (regex.test(fullUrl)) {
              return true;
            }
          }
          break;

        case 'keyword':
          // Keyword anywhere in URL
          if (fullUrl.includes(pattern)) {
            return true;
          }
          break;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking blocked status:', error);
    return false;
  }
}

// Helper function to check if URL matches a pattern
function urlMatchesPattern(url, pattern) {
  try {
    const urlObj = new URL(url);
    const patternObj = new URL(pattern);

    // Simple hostname comparison
    return urlObj.hostname === patternObj.hostname;
  } catch {
    return false;
  }
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkBlocked') {
    checkIfBlocked(message.url).then(sendResponse);
    return true; // Keep channel open for async response
  } else if (message.action === 'addTemporaryUnblock') {
    addTemporaryUnblock(message.url, message.duration).then(sendResponse);
    return true;
  } else if (message.action === 'getSettings') {
    chrome.storage.local.get(null).then(sendResponse);
    return true;
  }
});

// Add a temporary unblock for a URL
async function addTemporaryUnblock(url, durationMinutes) {
  try {
    const data = await chrome.storage.local.get(['temporaryUnblocks']);
    const temporaryUnblocks = data.temporaryUnblocks || {};

    const expiry = Date.now() + (durationMinutes * 60 * 1000);
    temporaryUnblocks[url] = expiry;

    await chrome.storage.local.set({ temporaryUnblocks });

    return { success: true, expiry };
  } catch (error) {
    console.error('Error adding temporary unblock:', error);
    return { success: false, error: error.message };
  }
}
