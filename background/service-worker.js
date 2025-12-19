// Background service worker for FocusGuard extension

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    blockedSites: [],
    blockMode: 'warning', // 'warning' or 'redirect'
    redirectUrl: 'https://www.google.com',
    challengeType: 'math', // 'math', 'typing', 'wait', 'mixed'
    waitDuration: 30, // seconds
    temporaryUnblocks: {}, // { url: expiryTimestamp }
    deletePassword: '' // Password for deleting/disabling sites
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

// Update blocking rules when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.blockedSites || changes.temporaryUnblocks)) {
    updateBlockingRules();
  }
});

// Update blocking rules on startup
updateBlockingRules();

// Update declarativeNetRequest rules based on blocked sites
async function updateBlockingRules() {
  const data = await chrome.storage.local.get(['blockedSites', 'temporaryUnblocks']);
  const blockedSites = data.blockedSites || [];
  const temporaryUnblocks = data.temporaryUnblocks || {};

  // Remove expired temporary unblocks
  const now = Date.now();
  const activeUnblocks = Object.entries(temporaryUnblocks)
    .filter(([_, expiry]) => now < expiry)
    .map(([url, _]) => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })
    .filter(h => h);

  // Get existing rule IDs and remove them
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);

  // Build new rules
  const newRules = [];
  let ruleId = 1;

  for (const site of blockedSites) {
    if (!site.enabled) continue;

    const pattern = site.pattern.toLowerCase();
    let urlFilter = null;

    // Check if temporarily unblocked
    const isUnblocked = activeUnblocks.some(host => {
      const normalizedHost = host.replace(/^www\./, '');
      const normalizedPattern = pattern.replace(/^www\./, '');
      return normalizedHost === normalizedPattern;
    });

    if (isUnblocked) continue;

    // Convert our patterns to declarativeNetRequest format
    switch (site.type) {
      case 'exact':
        // Match exact domain with or without www
        const domain = pattern.replace(/^www\./, '');
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: chrome.runtime.getURL('blocked/blocked.html') + '?url=\\1'
            }
          },
          condition: {
            regexFilter: `^(https?://(?:[a-z0-9-]+\\.)?${domain.replace(/\./g, '\\.')}(?:/.*)?)$`,
            resourceTypes: ['main_frame']
          }
        });
        // www version is already covered by the regex above
        break;

      case 'wildcard':
        if (pattern.startsWith('*.')) {
          // Subdomain wildcard
          const domain = pattern.substring(2);
          urlFilter = `||${domain}`;
        } else {
          // General wildcard - convert * to *
          urlFilter = pattern.replace(/\*/g, '*');
        }

        if (urlFilter) {
          const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
          newRules.push({
            id: ruleId++,
            priority: 1,
            action: {
              type: 'redirect',
              redirect: {
                regexSubstitution: chrome.runtime.getURL('blocked/blocked.html') + '?url=\\1'
              }
            },
            condition: {
              regexFilter: `^(${regexPattern})$`,
              resourceTypes: ['main_frame']
            }
          });
        }
        break;

      case 'keyword':
        // Keyword match
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: chrome.runtime.getURL('blocked/blocked.html') + '?url=\\1'
            }
          },
          condition: {
            regexFilter: `^(.*${pattern.replace(/\./g, '\\.')}.*?)$`,
            resourceTypes: ['main_frame']
          }
        });
        break;
    }
  }

  // Update rules
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules
    });

    console.log('[FocusGuard] Updated blocking rules, active rules:', newRules.length);
    console.log('[FocusGuard] Sample rules:', JSON.stringify(newRules.slice(0, 2), null, 2));
  } catch (error) {
    console.error('[FocusGuard] Error updating rules:', error);
    console.error('[FocusGuard] Failed rules:', JSON.stringify(newRules, null, 2));
  }

  // Check all open tabs and reload any that are now blocked
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url) continue;

    try {
      const url = new URL(tab.url);
      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') continue;

      const shouldBlock = await checkIfBlocked(tab.url);
      if (shouldBlock) {
        // Reload the tab so the blocking rule takes effect
        await chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      // Invalid URL, skip
    }
  }
}

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

    console.log('[FocusGuard] Checking URL:', hostname, '| Blocked sites count:', blockedSites.length);

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
          // Exact domain match (normalize www)
          const normalizedHostname = hostname.replace(/^www\./, '');
          const normalizedPattern = pattern.replace(/^www\./, '');
          if (normalizedHostname === normalizedPattern) {
            console.log('[FocusGuard] ✓ BLOCKED by exact match:', pattern);
            return true;
          }
          break;

        case 'wildcard':
          // Wildcard subdomain match (*.example.com)
          if (pattern.startsWith('*.')) {
            const domain = pattern.substring(2);
            if (hostname === domain || hostname.endsWith('.' + domain)) {
              console.log('[FocusGuard] ✓ BLOCKED by wildcard subdomain:', pattern);
              return true;
            }
          } else if (pattern.includes('*')) {
            // General wildcard pattern
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            if (regex.test(fullUrl)) {
              console.log('[FocusGuard] ✓ BLOCKED by wildcard pattern:', pattern);
              return true;
            }
          }
          break;

        case 'keyword':
          // Keyword anywhere in URL
          if (fullUrl.includes(pattern)) {
            console.log('[FocusGuard] ✓ BLOCKED by keyword:', pattern);
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
  } else if (message.action === 'forceUpdateRules') {
    updateBlockingRules().then(() => sendResponse({ success: true }));
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

    // Force immediate rule update to unblock the site
    await updateBlockingRules();

    return { success: true, expiry };
  } catch (error) {
    console.error('Error adding temporary unblock:', error);
    return { success: false, error: error.message };
  }
}
