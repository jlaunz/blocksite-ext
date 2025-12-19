// Options page script for FocusGuard extension

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  attachEventListeners();
  updateTempUnblocksList();
  setInterval(updateTempUnblocksList, 1000); // Update every second
}

function attachEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
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
    'blockedSites'
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

  // Load blocked sites
  loadBlockedSites();
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

async function toggleSite(id) {
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const site = blockedSites.find(s => s.id === id);
  if (site) {
    site.enabled = !site.enabled;
    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();
    showStatus(`Site ${site.enabled ? 'enabled' : 'disabled'}`, 'success');
  }
}

async function deleteSite(id) {
  if (!confirm('Are you sure you want to delete this site?')) {
    return;
  }

  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const filtered = blockedSites.filter(s => s.id !== id);
  await chrome.storage.local.set({ blockedSites: filtered });
  await loadBlockedSites();
  showStatus('Site deleted successfully', 'success');
}

async function saveSettings() {
  const blockMode = document.querySelector('input[name="blockMode"]:checked').value;
  const redirectUrl = document.getElementById('redirectUrl').value;
  const challengeType = document.getElementById('challengeType').value;
  const waitDuration = parseInt(document.getElementById('waitDuration').value);

  await chrome.storage.local.set({
    blockMode,
    redirectUrl,
    challengeType,
    waitDuration
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

  const container = document.getElementById('tempUnblocksList');
  const now = Date.now();

  const activeUnblocks = Object.entries(temporaryUnblocks)
    .filter(([_, expiry]) => now < expiry)
    .sort(([_, a], [__, b]) => a - b);

  if (activeUnblocks.length === 0) {
    container.innerHTML = '<div class="empty-state">No active temporary unblocks</div>';
    return;
  }

  container.innerHTML = activeUnblocks.map(([url, expiry]) => {
    const remaining = expiry - now;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const safeUrl = escapeHtml(url);

    return `
      <div class="temp-unblock-item">
        <div>
          <div class="temp-unblock-url">${escapeHtml(new URL(url).hostname)}</div>
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
