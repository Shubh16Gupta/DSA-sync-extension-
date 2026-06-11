// Helper to generate a notification icon data URL dynamically
async function getIconDataUrl() {
  try {
    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    
    // Draw background circle
    ctx.fillStyle = '#6366f1'; // Modern Indigo
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, 2 * Math.PI);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DSA', 64, 64);

    const blob = await canvas.convertToBlob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // Basic transparent 1x1 PNG data URL fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// Show native browser notification
async function showNotification(title, message) {
  const iconUrl = await getIconDataUrl();
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    priority: 2
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUBMIT_PROBLEM') {
    (async () => {
      try {
        const { jwt_token, backend_url = 'http://localhost:5000' } = await chrome.storage.local.get(['jwt_token', 'backend_url']);

        if (!jwt_token) {
          await showNotification(
            'DSA Sync — Not Authenticated',
            'Please log in to your DSA Sync dashboard to upload your solution.'
          );
          sendResponse({ success: false, error: 'Not authenticated' });
          return;
        }

        console.log(`Sending solution for ${request.payload.title} to backend...`);
        const response = await fetch(`${backend_url}/api/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt_token}`
          },
          body: JSON.stringify(request.payload)
        });

        const data = await response.json();
        if (response.ok && data.success) {
          // Check GitHub sync status
          const githubSync = data.githubSync || {};
          
          if (githubSync.synced) {
            await showNotification(
              'DSA Sync — Solution Saved ✓',
              `Successfully synced "${request.payload.title}" to GitHub!`
            );
          } else if (githubSync.error === 'NO_GITHUB_TOKEN') {
            await showNotification(
              'DSA Sync — Saved (GitHub Not Connected)',
              `Saved to database, but GitHub sync not configured. Auth to enable auto-sync.`
            );
          } else {
            await showNotification(
              'DSA Sync — Saved (GitHub Sync Failed)',
              `Saved to database, but GitHub sync failed: ${githubSync.message || 'Unknown error'}`
            );
          }
          
          sendResponse({ success: true, data });
        } else {
          await showNotification(
            'DSA Sync — Sync Error',
            data.error || 'Failed to save solution to database.'
          );
          sendResponse({ success: false, error: data.error });
        }
      } catch (err) {
        console.error('Background worker fetch error:', err);
        await showNotification(
          'DSA Sync — Sync Failed',
          'Could not reach the DSA Sync backend server. Check if it\'s running on ' + 
          (await chrome.storage.local.get('backend_url')).backend_url
        );
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
