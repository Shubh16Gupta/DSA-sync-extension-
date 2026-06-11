// DSA Sync - Popup Script

const DEFAULT_BACKEND = 'http://localhost:5000';
const DEFAULT_FRONTEND = 'http://localhost:5173';

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  
  const connectedState = document.getElementById('connected-state');
  const disconnectedState = document.getElementById('disconnected-state');
  
  const usernameDisplay = document.getElementById('username-display');
  const repoDisplay = document.getElementById('repo-display');
  const solvedVal = document.getElementById('solved-val');
  const streakVal = document.getElementById('streak-val');
  
  const backendInput = document.getElementById('backend-url-input');
  const tokenInput = document.getElementById('token-input');
  
  const saveBtn = document.getElementById('save-config-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  const openDashboardLoginBtn = document.getElementById('open-dashboard-login-btn');

  // Load saved config
  const storage = await chrome.storage.local.get(['jwt_token', 'backend_url', 'frontend_url']);
  const backendUrl = storage.backend_url || DEFAULT_BACKEND;
  const frontendUrl = storage.frontend_url || DEFAULT_FRONTEND;
  
  backendInput.value = backendUrl;
  
  // Try verifying connection
  if (storage.jwt_token) {
    await verifyConnection(storage.jwt_token, backendUrl, frontendUrl);
  } else {
    showDisconnected();
  }

  // Save Config Clicked
  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const url = backendInput.value.trim() || DEFAULT_BACKEND;
    
    if (!token) {
      alert('Please enter a valid authentication token.');
      return;
    }

    saveBtn.textContent = 'Connecting...';
    saveBtn.disabled = true;

    await chrome.storage.local.set({ jwt_token: token, backend_url: url });
    const verified = await verifyConnection(token, url, frontendUrl);
    
    saveBtn.textContent = 'Save & Connect';
    saveBtn.disabled = false;

    if (!verified) {
      alert('Failed to connect to the backend. Please verify the server address and token.');
    }
  });

  // Disconnect Clicked
  disconnectBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to disconnect your account?')) {
      await chrome.storage.local.remove(['jwt_token']);
      tokenInput.value = '';
      showDisconnected();
    }
  });

  // Open Dashboard Clicked
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: frontendUrl });
  });

  openDashboardLoginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: frontendUrl });
  });

  async function verifyConnection(token, bUrl, fUrl) {
    try {
      const res = await fetch(`${bUrl}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const stats = await res.json();
        
        // Show Connected UI
        showConnected();
        
        usernameDisplay.textContent = stats.githubUsername || 'Unknown User';
        solvedVal.textContent = stats.totalSolved ?? 0;
        streakVal.textContent = `${stats.currentStreak ?? 0}d`;
        
        if (stats.repoName) {
          repoDisplay.textContent = `${stats.githubUsername}/${stats.repoName}`;
          repoDisplay.href = `https://github.com/${stats.githubUsername}/${stats.repoName}`;
          // Set in storage so content script can access it if needed
          await chrome.storage.local.set({ github_username: stats.githubUsername, repo_name: stats.repoName });
        } else {
          repoDisplay.textContent = 'Setup repository on dashboard';
          repoDisplay.href = fUrl;
        }

        return true;
      } else {
        showDisconnected();
        return false;
      }
    } catch (err) {
      console.error('Popup verification error:', err);
      showDisconnected();
      return false;
    }
  }

  function showConnected() {
    statusBadge.className = 'status-badge status-connected';
    statusText.textContent = 'Online';
    connectedState.classList.remove('hidden');
    disconnectedState.classList.add('hidden');
  }

  function showDisconnected() {
    statusBadge.className = 'status-badge status-disconnected';
    statusText.textContent = 'Offline';
    connectedState.classList.add('hidden');
    disconnectedState.classList.remove('hidden');
  }
});
