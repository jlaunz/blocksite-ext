// Popup script for FocusGuard extension

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadCurrentSite();
  await loadBlockedSites();
  attachEventListeners();
}

function attachEventListeners() {
  document.getElementById('blockCurrentBtn').addEventListener('click', blockCurrentSite);
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
  document.getElementById('openOptionsBtn').addEventListener('click', openOptions);
  document.getElementById('siteInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });
}

async function loadCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const hostname = url.hostname;

    document.getElementById('currentUrl').textContent = hostname;

    // Check if already blocked
    const data = await chrome.storage.local.get(['blockedSites']);
    const blockedSites = data.blockedSites || [];
    const isBlocked = blockedSites.some(site =>
      site.enabled && (site.pattern === hostname || site.pattern === '*.* + hostname)
    );

    const btn = document.getElementById('blockCurrentBtn');
    if (isBlocked) {
      btn.textContent = 'Already Blocked';
      btn.disabled = true;
      btn.style.background = '#9ca3af';
    }
  } catch (error) {
    document.getElementById('currentUrl').textContent = 'Cannot block this page';
    document.getElementById('blockCurrentBtn').disabled = true;
  }
}

async function blockCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const hostname = url.hostname;

    const site = {
      id: Date.now().toString(),
      pattern: hostname,
      type: 'exact',
      enabled: true,
      addedAt: Date.now()
    };

    const data = await chrome.storage.local.get(['blockedSites']);
    const blockedSites = data.blockedSites || [];
    blockedSites.push(site);

    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();

    document.getElementById('blockCurrentBtn').textContent = 'Blocked!';
    document.getElementById('blockCurrentBtn').disabled = true;
  } catch (error) {
    console.error('Error blocking current site:', error);
    alert('Failed to block site: ' + error.message);
  }
}

async function addSite() {
  const input = document.getElementById('siteInput');
  const pattern = input.value.trim();
  const type = document.getElementById('ruleType').value;

  if (!pattern) {
    alert('Please enter a URL pattern');
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

  input.value = '';
}

async function loadBlockedSites() {
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const container = document.getElementById('blockedSitesList');
  const countEl = document.getElementById('blockedCount');

  countEl.textContent = blockedSites.filter(s => s.enabled).length;

  if (blockedSites.length === 0) {
    container.innerHTML = '<div class="empty-state">No blocked sites yet</div>';
    return;
  }

  container.innerHTML = blockedSites
    .sort((a, b) => b.addedAt - a.addedAt)
    .map(site => createBlockedItemHTML(site))
    .join('');

  // Attach event listeners to buttons
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

function createBlockedItemHTML(site) {
  const typeLabels = {
    exact: 'Exact',
    wildcard: 'Wildcard',
    keyword: 'Keyword'
  };

  return `
    <div class="blocked-item ${site.enabled ? '' : 'disabled'}">
      <div class="site-info">
        <div class="site-pattern">${escapeHtml(site.pattern)}</div>
        <div class="site-type">${typeLabels[site.type]}</div>
      </div>
      <div class="item-actions">
        <button id="toggle-${site.id}" class="toggle-btn" title="${site.enabled ? 'Disable' : 'Enable'}">
          ${site.enabled ? '✓' : '○'}
        </button>
        <button id="delete-${site.id}" class="btn btn-danger">×</button>
      </div>
    </div>
  `;
}

async function toggleSite(id) {
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const site = blockedSites.find(s => s.id === id);
  if (site) {
    site.enabled = !site.enabled;
    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();
  }
}

async function deleteSite(id) {
  const data = await chrome.storage.local.get(['blockedSites']);
  const blockedSites = data.blockedSites || [];

  const filtered = blockedSites.filter(s => s.id !== id);
  await chrome.storage.local.set({ blockedSites: filtered });
  await loadBlockedSites();
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
