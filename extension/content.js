// DSA Sync - Content Script

console.log('DSA Sync content script injected successfully.');

// --- PLATFORM CONFIGURATIONS & SCRApERS ---

const PLATFORMS = {
  LEETCODE: 'LeetCode',
  GEEKSFORGEEKS: 'GeeksForGeeks',
  CODEFORCES: 'Codeforces',
  CODECHEF: 'CodeChef',
  ATCODER: 'AtCoder',
  HACKERRANK: 'HackerRank',
  OTHER: 'Others'
};

function getPlatform() {
  const url = window.location.href;
  if (url.includes('leetcode.com')) return PLATFORMS.LEETCODE;
  if (url.includes('geeksforgeeks.org')) return PLATFORMS.GEEKSFORGEEKS;
  if (url.includes('codeforces.com')) return PLATFORMS.CODEFORCES;
  if (url.includes('codechef.com')) return PLATFORMS.CODECHEF;
  if (url.includes('atcoder.jp')) return PLATFORMS.ATCODER;
  if (url.includes('hackerrank.com')) return PLATFORMS.HACKERRANK;
  return PLATFORMS.OTHER;
}

// Scrape code from various editors - improved to get complete code
function scrapeCode(platform) {
  let code = '';
  
  if (platform === PLATFORMS.LEETCODE) {
    // Try multiple methods to get code from Monaco Editor
    // Method 1: Monaco view-lines
    const lines = Array.from(document.querySelectorAll('.monaco-editor .view-line'));
    if (lines.length > 0) {
      code = lines.map(line => line.textContent).join('\n');
    }
    
    // Method 2: If Method 1 failed, try getting from the textarea or contenteditable
    if (!code) {
      const editorArea = document.querySelector('.monaco-editor');
      if (editorArea) {
        const editorContent = editorArea.innerText;
        if (editorContent) code = editorContent;
      }
    }
  } else if (platform === PLATFORMS.GEEKSFORGEEKS) {
    // Method 1: CodeMirror
    const cmLines = Array.from(document.querySelectorAll('.CodeMirror-line'));
    if (cmLines.length > 0) {
      code = cmLines.map(line => line.textContent).join('\n');
    }
    
    // Method 2: ACE editor
    if (!code) {
      const aceLines = Array.from(document.querySelectorAll('.ace_line'));
      if (aceLines.length > 0) {
        code = aceLines.map(line => line.textContent).join('\n');
      }
    }
  } else if (platform === PLATFORMS.CODEFORCES) {
    // Check textareas or specific code viewer elements
    const codeArea = document.querySelector('#sourceCodeTextarea') || 
                      document.querySelector('.source-code') ||
                      document.querySelector('textarea');
    if (codeArea) {
      code = codeArea.value || codeArea.textContent;
    }
  } else {
    // Generic fallback for other platforms
    // Try multiple editor types
    const lines = Array.from(document.querySelectorAll('.CodeMirror-line, .view-line, .ace_line, pre code'));
    if (lines.length > 0) {
      code = lines.map(line => line.textContent).join('\n');
    }
    
    // Last resort: try any textarea
    if (!code) {
      const textarea = document.querySelector('textarea[class*="code"], textarea[class*="editor"], textarea');
      if (textarea) {
        code = textarea.value;
      }
    }
  }
  
  return code.trim();
}

// Scrape language
function scrapeLanguage(platform) {
  let lang = 'C++'; // Default fallback
  
  if (platform === PLATFORMS.LEETCODE) {
    // Find language dropdown text
    const langBtn = document.querySelector('button[id^="headlessui-listbox-button-"]');
    if (langBtn) lang = langBtn.textContent.trim();
  } else if (platform === PLATFORMS.GEEKSFORGEEKS) {
    const langSelect = document.querySelector('.divider.text, .problems_language_dropdown__');
    if (langSelect) lang = langSelect.textContent.trim();
  } else if (platform === PLATFORMS.CODEFORCES) {
    const langText = document.querySelector('td.parameter-value');
    if (langText) lang = langText.textContent.trim();
  }
  
  // Format common display labels
  const lower = lang.toLowerCase();
  if (lower.includes('cpp') || lower.includes('c++')) return 'C++';
  if (lower.includes('python')) return 'Python';
  if (lower.includes('java')) return 'Java';
  if (lower.includes('javascript') || lower.includes('js')) return 'JavaScript';
  if (lower.includes('typescript') || lower.includes('ts')) return 'TypeScript';
  
  return lang;
}

// Scrape general metadata (title, id, difficulty, tags, description)
function scrapeMetadata(platform) {
  let title = document.title;
  let problemId = '0';
  let difficulty = 'Medium';
  let tags = [];
  let description = '';
  let constraints = '';
  let examples = '';

  const url = window.location.href;

  if (platform === PLATFORMS.LEETCODE) {
    // Title
    const titleEl = document.querySelector('.elfjS, [data-cy="question-title"]');
    if (titleEl) {
      const txt = titleEl.textContent.trim();
      const match = txt.match(/^(\d+)\.\s*(.*)$/);
      if (match) {
        problemId = match[1];
        title = match[2];
      } else {
        title = txt;
      }
    }

    // Difficulty
    const diffEl = document.querySelector('.text-pink-60, .text-yellow-60, .text-emerald-60, .text-pink, .text-yellow, .text-green');
    if (diffEl) difficulty = diffEl.textContent.trim();

    // Tags
    const tagEls = Array.from(document.querySelectorAll('a[href^="/tag/"]'));
    tags = tagEls.map(el => el.textContent.trim()).filter(Boolean);

    // Description & Constraints & Examples
    const descContainer = document.querySelector('[data-track-load="description_content"], [data-key="description-content"]');
    if (descContainer) {
      const allText = descContainer.innerText;
      // Try to separate description from constraints and examples
      const lines = allText.split('\n');
      description = lines.slice(0, Math.min(10, lines.length)).join('\n');
      constraints = lines.slice(0, Math.min(20, lines.length)).join('\n');
    }

  } else if (platform === PLATFORMS.GEEKSFORGEEKS) {
    // Title
    const titleEl = document.querySelector('h1.text-xl, h1.problems_header_title__, h1');
    if (titleEl) title = titleEl.textContent.trim();

    // Difficulty
    const diffEl = document.querySelector('[class*="difficulty"], .problems_header_difficulty__');
    if (diffEl) difficulty = diffEl.textContent.trim();

    // Description - capture full problem statement
    const descEl = document.querySelector('.problems__content, .problem-statement, main article, [class*="description"]');
    if (descEl) {
      description = descEl.innerText.substring(0, 500); // First 500 chars of description
      constraints = descEl.innerText.substring(500, 1000); // Next portion for constraints
    }

  } else if (platform === PLATFORMS.CODEFORCES) {
    // Title & ID
    const titleEl = document.querySelector('.problem-statement .header .title');
    if (titleEl) {
      title = titleEl.textContent.trim();
      const urlParts = url.split('/');
      const contestId = urlParts[urlParts.indexOf('contest') + 1] || '0';
      const problemLetter = urlParts[urlParts.indexOf('problem') + 1] || 'A';
      problemId = `${contestId}${problemLetter}`;
    }
    
    // Description
    const descEl = document.querySelector('.problem-statement');
    if (descEl) description = descEl.innerText.substring(0, 800);
  }

  // Fallbacks
  if (!problemId || problemId === '0') {
    // Try to extract numbers from URL slug
    const matches = url.match(/\/problems\/([a-zA-Z0-9-]+)/) || url.match(/\/problem\/([a-zA-Z0-9-]+)/);
    problemId = matches ? matches[1] : 'problem';
  }

  return {
    platform,
    problemId,
    title,
    url,
    difficulty,
    tags,
    description: description.trim(),
    constraints: constraints.trim(),
    examples: examples.trim()
  };
}

// Detect submission results and capture metrics
function checkAccepted(platform) {
  let isAccepted = false;
  let metrics = {};

  if (platform === PLATFORMS.LEETCODE) {
    // Check if the toast or success text contains 'Accepted'
    const successText = document.querySelector('[data-e2e-locator="submission-result"], .text-success, .text-green-s, .text-emerald-s');
    if (successText && successText.textContent.includes('Accepted')) {
      isAccepted = true;
      // Capture LeetCode metrics
      const resultsPanel = document.querySelector('[class*="result"]');
      if (resultsPanel) {
        const text = resultsPanel.innerText;
        // Extract runtime and memory if available
        metrics.timeTaken = extractMetric(text, /(\d+\.?\d*)\s*ms/);
        metrics.memory = extractMetric(text, /(\d+\.?\d*)\s*MB/);
      }
    }
  } else if (platform === PLATFORMS.GEEKSFORGEEKS) {
    // Check for success banner
    const banner = document.querySelector('.problems_header_success__, .modal-body, .toast');
    if (banner && (banner.textContent.includes('Problem Solved Successfully') || banner.textContent.includes('Correct Answer'))) {
      isAccepted = true;
      // Capture GeeksForGeeks metrics
      const modalBody = document.querySelector('.modal-body');
      if (modalBody) {
        const text = modalBody.innerText;
        // Extract test cases passed, accuracy, time taken, points
        metrics.testCasesPassed = extractMetric(text, /(\d+)\s*\/\s*\d+/);
        metrics.accuracy = extractMetric(text, /(\d+\.?\d*)\s*%/);
        metrics.timeTaken = extractMetric(text, /(\d+\.?\d*)\s*(s|ms)/);
        metrics.pointsScored = extractMetric(text, /(\d+)\s*\/\s*\d+\s*Points/);
      }
    }
  } else if (platform === PLATFORMS.CODEFORCES) {
    const verdict = document.querySelector('.verdict-accepted, .verdict-ok');
    if (verdict) isAccepted = true;
  } else if (platform === PLATFORMS.CODECHEF) {
    const tick = document.querySelector('.tick, .correct-answer');
    if (tick) isAccepted = true;
  } else if (platform === PLATFORMS.ATCODER) {
    const ac = document.querySelector('.label-success');
    if (ac && ac.textContent.includes('AC')) isAccepted = true;
  } else if (platform === PLATFORMS.HACKERRANK) {
    const success = document.querySelector('.success-msg, .congrats-msg');
    if (success && success.textContent.includes('passed all test cases')) isAccepted = true;
  }
  
  return { isAccepted, metrics };
}

// Helper to extract numeric metrics from text
function extractMetric(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : null;
}

// Scrape all data
function getPayload(platform) {
  const meta = scrapeMetadata(platform);
  const code = scrapeCode(platform);
  const language = scrapeLanguage(platform);
  const { isAccepted, metrics } = checkAccepted(platform);

  return {
    ...meta,
    code,
    language,
    isAccepted,
    metrics
  };
}

// --- UI WIDGET (FLOATING BUTTON) ---

function createFloatingButton() {
  const platform = getPlatform();
  if (platform === PLATFORMS.OTHER) return; // Don't show on unsupported domains

  // Check if button already exists
  if (document.getElementById('dsa-sync-floating-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'dsa-sync-floating-btn';
  
  // Set beautiful styling (Glassmorphism, gradients, hover micro-animations)
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '99999';
  btn.style.padding = '12px 20px';
  btn.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)';
  btn.style.backdropFilter = 'blur(8px)';
  btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  btn.style.borderRadius = '50px';
  btn.style.color = '#ffffff';
  btn.style.fontFamily = "'Inter', sans-serif";
  btn.style.fontSize = '14px';
  btn.style.fontWeight = '600';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.gap = '8px';
  btn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  
  btn.innerHTML = `
    <span style="display:inline-block; width:8px; height:8px; background-color:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
    <span>DSA Sync</span>
  `;

  // Hover animations
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-3px) scale(1.03)';
    btn.style.boxShadow = '0 12px 40px 0 rgba(99, 102, 241, 0.5)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0) scale(1)';
    btn.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
  });

  // Action: click to trigger force sync
  btn.addEventListener('click', async () => {
    btn.innerHTML = '<span>⚡</span> <span>Scraping...</span>';
    btn.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.9) 100%)';

    const payload = getPayload(platform);
    if (!payload.code) {
      alert('DSA Sync: Code editor was empty or could not be scraped. Ensure code is visible on the screen!');
      resetButton();
      return;
    }

    btn.innerHTML = '<span>🚀</span> <span>Syncing...</span>';
    
    chrome.runtime.sendMessage({
      type: 'SUBMIT_PROBLEM',
      payload
    }, (response) => {
      if (response && response.success) {
        btn.innerHTML = '<span>✅</span> <span>Synced!</span>';
        btn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)';
        setTimeout(resetButton, 3000);
      } else {
        btn.innerHTML = '<span>❌</span> <span>Failed</span>';
        btn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)';
        setTimeout(resetButton, 3000);
      }
    });
  });

  function resetButton() {
    btn.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; background-color:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
      <span>DSA Sync</span>
    `;
    btn.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)';
  }

  document.body.appendChild(btn);
}

// --- AUTO-DETECTION LOOP ---

let lastSubmittedUrl = '';

function startAutoDetector() {
  const platform = getPlatform();
  if (platform === PLATFORMS.OTHER) return;

  setInterval(() => {
    const { isAccepted } = checkAccepted(platform);
    const currentUrl = window.location.href;

    if (isAccepted && currentUrl !== lastSubmittedUrl) {
      lastSubmittedUrl = currentUrl;
      console.log('DSA Sync: Successful submission detected! Syncing...');
      
      const payload = getPayload(platform);
      if (payload.code) {
        chrome.runtime.sendMessage({
          type: 'SUBMIT_PROBLEM',
          payload
        }, (response) => {
          if (response && response.success) {
            console.log('DSA Sync: Submission synced successfully.');
          } else {
            console.error('DSA Sync: Submission sync failed:', response ? response.error : 'No response');
          }
        });
      }
    }
  }, 2000); // Check every 2 seconds
}

// Initialize on page load
createFloatingButton();
startAutoDetector();
