// Options page script for FocusGuard extension

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  attachEventListeners();
  updateTempUnblocksList();
  setInterval(updateTempUnblocksList, 1000); // Update every second

  // Listen for storage changes to update immediately
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.temporaryUnblocks) {
      console.log('[FocusGuard Options] Temporary unblocks changed, updating list');
      updateTempUnblocksList();
    }
  });
}

function attachEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
  document.getElementById('destroyAllBtn').addEventListener('click', destroyAll);
  document.getElementById('savePasswordBtn').addEventListener('click', savePassword);
  document.getElementById('newSitePattern').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });

  // Toggle redirect URL input visibility
  document.querySelectorAll('input[name="blockMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const redirectGroup = document.getElementById('redirectUrlGroup');
      redirectGroup.style.display = radio.value === 'redirect' ? 'block' : 'none';
    });
  });
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    'blockMode',
    'redirectUrl',
    'challengeType',
    'waitDuration',
    'blockedSites',
    'deletePassword'
  ]);

  // Load block mode
  const blockMode = data.blockMode || 'warning';
  document.getElementById(`mode${blockMode.charAt(0).toUpperCase() + blockMode.slice(1)}`).checked = true;
  if (blockMode === 'redirect') {
    document.getElementById('redirectUrlGroup').style.display = 'block';
  }

  // Load redirect URL
  document.getElementById('redirectUrl').value = data.redirectUrl || 'https://www.google.com';

  // Load challenge settings
  document.getElementById('challengeType').value = data.challengeType || 'math';
  document.getElementById('waitDuration').value = data.waitDuration || 30;

  // Load password
  const password = data.deletePassword || '';
  document.getElementById('deletePassword').value = '';

  // Show/hide old password field and update labels
  const oldPasswordGroup = document.getElementById('oldPasswordGroup');
  const newPasswordLabel = document.getElementById('newPasswordLabel');
  if (password) {
    // Password exists - show old password field
    oldPasswordGroup.style.display = 'block';
    newPasswordLabel.textContent = 'New Password:';
    document.getElementById('deletePassword').placeholder = 'Enter new password';
  } else {
    // No password - hide old password field
    oldPasswordGroup.style.display = 'none';
    newPasswordLabel.textContent = 'Password:';
    document.getElementById('deletePassword').placeholder = 'Set a password';
  }

  // Show password status
  const statusEl = document.getElementById('passwordStatus');
  if (password) {
    statusEl.innerHTML = '<span style="color: #10b981;">✓ Password is set (••••••)</span>';
  } else {
    statusEl.innerHTML = '<span style="color: #ef4444;">⚠ No password set - delete/disable protection disabled</span>';
  }

  // Load blocked sites
  loadBlockedSites();
}

async function savePassword() {
  const newPassword = document.getElementById('deletePassword').value.trim();
  const oldPasswordInput = document.getElementById('oldPassword').value.trim();
  const statusEl = document.getElementById('passwordStatus');

  // Check if there's an existing password
  const data = await chrome.storage.local.get(['deletePassword']);
  const currentPassword = data.deletePassword || '';

  // If password exists, verify old password first
  if (currentPassword) {
    if (!oldPasswordInput) {
      statusEl.innerHTML = '<span style="color: #ef4444;">❌ Please enter your current password!</span>';
      return;
    }

    if (oldPasswordInput !== currentPassword) {
      statusEl.innerHTML = '<span style="color: #ef4444;">❌ Current password is incorrect!</span>';
      document.getElementById('oldPassword').value = '';
      return;
    }
  }

  // Validate new password
  if (!newPassword) {
    statusEl.innerHTML = '<span style="color: #ef4444;">❌ New password cannot be empty!</span>';
    return;
  }

  if (newPassword.length < 4) {
    statusEl.innerHTML = '<span style="color: #ef4444;">❌ Password must be at least 4 characters!</span>';
    return;
  }

  // Save the new password
  await chrome.storage.local.set({ deletePassword: newPassword });

  // Clear input fields
  document.getElementById('deletePassword').value = '';
  document.getElementById('oldPassword').value = '';

  statusEl.innerHTML = '<span style="color: #10b981;">✓ Password saved successfully!</span>';

  // Reload settings to update UI
  setTimeout(async () => {
    await loadSettings();
  }, 1500);
}

async function loadBlockedSites() {
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const container = document.getElementById('sitesTable');

  if (blockedSites.length === 0) {
    container.innerHTML = '<div class="empty-state">No blocked sites yet. Add one above!</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Pattern</th>
          <th>Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${blockedSites.map(site => createSiteRowHTML(site)).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;

  // Attach event listeners
  blockedSites.forEach(site => {
    const toggleBtn = document.getElementById(`toggle-${site.id}`);
    const deleteBtn = document.getElementById(`delete-${site.id}`);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => toggleSite(site.id));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteSite(site.id));
    }
  });
}

function createSiteRowHTML(site) {
  const typeLabels = {
    exact: 'Exact',
    wildcard: 'Wildcard',
    keyword: 'Keyword'
  };

  const typeBadgeClass = `badge-${site.type}`;
  const statusBadgeClass = site.enabled ? 'badge-enabled' : 'badge-disabled';

  return `
    <tr>
      <td class="site-pattern">${escapeHtml(site.pattern)}</td>
      <td><span class="badge ${typeBadgeClass}">${typeLabels[site.type]}</span></td>
      <td><span class="badge ${statusBadgeClass}">${site.enabled ? 'Enabled' : 'Disabled'}</span></td>
      <td>
        <div class="table-actions">
          <button id="toggle-${site.id}" class="btn btn-primary btn-small">
            ${site.enabled ? 'Disable' : 'Enable'}
          </button>
          <button id="delete-${site.id}" class="btn btn-danger btn-small">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

async function addSite() {
  const patternInput = document.getElementById('newSitePattern');
  const pattern = patternInput.value.trim();
  const type = document.getElementById('newSiteType').value;

  if (!pattern) {
    showStatus('Please enter a URL pattern', 'error');
    return;
  }

  const site = {
    id: Date.now().toString(),
    pattern: pattern.toLowerCase(),
    type: type,
    enabled: true,
    addedAt: Date.now()
  };

  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];
  blockedSites.push(site);

  await chrome.storage.local.set({ blockedSites });
  await loadBlockedSites();

  patternInput.value = '';
  showStatus('Site added successfully!', 'success');
}

// Track delete/disable countdowns
const deleteCountdowns = {};
const toggleCountdowns = {};

async function toggleSite(id) {
  const data = await chrome.storage.local.get(['blockedSites', 'deletePassword']);
  const blockedSites = data.blockedSites || [];
  const password = data.deletePassword;
  const site = blockedSites.find(s => s.id === id);

  if (!site) return;

  // If enabling (site is currently disabled), allow immediately
  if (!site.enabled) {
    site.enabled = true;
    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();
    showStatus('Site enabled', 'success');
    return;
  }

  // If disabling (site is currently enabled), require protection
  if (!password) {
    alert('Please set a delete password in settings first!');
    return;
  }

  // Check if countdown already started for this site
  if (toggleCountdowns[id]) {
    alert('Disable countdown already in progress for this site!');
    return;
  }

  // Start 5 minute countdown
  const countdown = 300; // 5 minutes in seconds
  toggleCountdowns[id] = {
    remaining: countdown,
    startTime: Date.now()
  };

  // Update UI to show countdown
  updateToggleCountdown(id);

  const countdownInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - toggleCountdowns[id].startTime) / 1000);
    toggleCountdowns[id].remaining = countdown - elapsed;

    if (toggleCountdowns[id].remaining <= 0) {
      clearInterval(countdownInterval);
      // Show password prompt
      promptPasswordAndToggle(id, password);
    } else {
      updateToggleCountdown(id);
    }
  }, 1000);
}

function updateToggleCountdown(id) {
  const btn = document.getElementById(`toggle-${id}`);
  if (!btn || !toggleCountdowns[id]) return;

  const remaining = toggleCountdowns[id].remaining;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  btn.textContent = `Wait ${minutes}:${seconds.toString().padStart(2, '0')}`;
  btn.disabled = true;
  btn.style.opacity = '0.6';
}

async function promptPasswordAndToggle(id, correctPassword) {
  const enteredPassword = prompt('Enter your password to disable this site:');

  if (!enteredPassword) {
    delete toggleCountdowns[id];
    await loadBlockedSites();
    showStatus('Disable cancelled', 'error');
    return;
  }

  if (enteredPassword !== correctPassword) {
    delete toggleCountdowns[id];
    await loadBlockedSites();
    showStatus('Incorrect password! Disable cancelled.', 'error');
    return;
  }

  // Password correct, disable the site
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];
  const site = blockedSites.find(s => s.id === id);

  if (site) {
    site.enabled = false;
    await chrome.storage.local.set({ blockedSites });
    delete toggleCountdowns[id];
    await loadBlockedSites();
    showStatus('Site disabled', 'success');
  }
}

async function deleteSite(id) {
  const data = await chrome.storage.local.get(['deletePassword', 'blockedSites']);
  const password = data.deletePassword;

  if (!password) {
    alert('Please set a delete password in settings first!');
    return;
  }

  // Check if countdown already started for this site
  if (deleteCountdowns[id]) {
    alert('Delete countdown already in progress for this site!');
    return;
  }

  // Start 5 minute countdown
  const countdown = 300; // 5 minutes in seconds
  deleteCountdowns[id] = {
    remaining: countdown,
    startTime: Date.now()
  };

  // Update UI to show countdown
  updateDeleteCountdown(id);

  const countdownInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - deleteCountdowns[id].startTime) / 1000);
    deleteCountdowns[id].remaining = countdown - elapsed;

    if (deleteCountdowns[id].remaining <= 0) {
      clearInterval(countdownInterval);
      // Show password prompt
      promptPasswordAndDelete(id, password);
    } else {
      updateDeleteCountdown(id);
    }
  }, 1000);
}

function updateDeleteCountdown(id) {
  const btn = document.getElementById(`delete-${id}`);
  if (!btn || !deleteCountdowns[id]) return;

  const remaining = deleteCountdowns[id].remaining;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  btn.textContent = `Wait ${minutes}:${seconds.toString().padStart(2, '0')}`;
  btn.disabled = true;
  btn.style.opacity = '0.6';
}

async function promptPasswordAndDelete(id, correctPassword) {
  const enteredPassword = prompt('Enter your delete password:');

  if (!enteredPassword) {
    delete deleteCountdowns[id];
    await loadBlockedSites();
    showStatus('Delete cancelled', 'error');
    return;
  }

  if (enteredPassword !== correctPassword) {
    delete deleteCountdowns[id];
    await loadBlockedSites();
    showStatus('Incorrect password! Delete cancelled.', 'error');
    return;
  }

  // Password correct, delete the site
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];
  const filtered = blockedSites.filter(s => s.id !== id);

  await chrome.storage.local.set({ blockedSites: filtered });
  delete deleteCountdowns[id];
  await loadBlockedSites();
  showStatus('Site deleted successfully', 'success');
}

async function destroyAll() {
  if (!confirm('⚠️ WARNING: This will delete ALL blocked sites AND remove the password!\n\nAre you absolutely sure?')) {
    return;
  }

  if (!confirm('This action cannot be undone. Reset everything?')) {
    return;
  }

  // Clear both blocked sites and password
  await chrome.storage.local.set({
    blockedSites: [],
    deletePassword: ''
  });

  await loadBlockedSites();
  await loadSettings(); // Reload to update password UI
  showStatus('All blocked sites and password cleared!', 'success');
}

async function saveSettings() {
  const blockMode = document.querySelector('input[name="blockMode"]:checked').value;
  const redirectUrl = document.getElementById('redirectUrl').value;
  const challengeType = document.getElementById('challengeType').value;
  const waitDuration = parseInt(document.getElementById('waitDuration').value);
  const deletePassword = document.getElementById('deletePassword').value;

  await chrome.storage.local.set({
    blockMode,
    redirectUrl,
    challengeType,
    waitDuration,
    deletePassword
  });

  showStatus('Settings saved successfully!', 'success');
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This will not delete your blocked sites.')) {
    return;
  }

  await chrome.storage.local.set({
    blockMode: 'warning',
    redirectUrl: 'https://www.google.com',
    challengeType: 'math',
    waitDuration: 30
  });

  await loadSettings();
  showStatus('Settings reset to defaults', 'success');
}

async function updateTempUnblocksList() {
  const data = await chrome.storage.local.get(['temporaryUnblocks']);
  const temporaryUnblocks = data.temporaryUnblocks || {};

  console.log('[FocusGuard Options] Temporary unblocks:', temporaryUnblocks);

  const container = document.getElementById('tempUnblocksList');
  const now = Date.now();

  const activeUnblocks = Object.entries(temporaryUnblocks)
    .filter(([_, expiry]) => now < expiry)
    .sort(([_, a], [__, b]) => a - b);

  console.log('[FocusGuard Options] Active unblocks count:', activeUnblocks.length);

  if (activeUnblocks.length === 0) {
    container.innerHTML = '<div class="empty-state">No active temporary unblocks</div>';
    return;
  }

  container.innerHTML = activeUnblocks.map(([url, expiry]) => {
    const remaining = expiry - now;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const safeUrl = escapeHtml(url);

    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      console.error('[FocusGuard] Invalid URL in temporary unblocks:', url);
      hostname = url;
    }

    return `
      <div class="temp-unblock-item">
        <div>
          <div class="temp-unblock-url">${escapeHtml(hostname)}</div>
          <div class="temp-unblock-expiry">Expires in ${minutes}m ${seconds}s</div>
        </div>
        <button class="btn btn-danger btn-small" data-url="${safeUrl}">Revoke</button>
      </div>
    `;
  }).join('');

  // Attach event listeners to revoke buttons
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      removeUnblock(url);
    });
  });
}

async function removeUnblock(url) {
  const data = await chrome.storage.local.get(['temporaryUnblocks']);
  const temporaryUnblocks = data.temporaryUnblocks || {};

  delete temporaryUnblocks[url];
  await chrome.storage.local.set({ temporaryUnblocks });

  // Force update blocking rules in background
  chrome.runtime.sendMessage({ action: 'forceUpdateRules' });

  updateTempUnblocksList();
  showStatus('Temporary unblock revoked', 'success');
}


function showStatus(message, type) {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = message;
  statusEl.className = `save-status ${type}`;

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
