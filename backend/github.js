import axios from 'axios';

/**
 * Checks if a GitHub repository exists, and creates it if it doesn't.
 * 
 * @param {string} token GitHub OAuth token
 * @param {string} username GitHub username
 * @param {string} repoName Repository name
 */
export async function ensureRepoExists(token, username, repoName) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DSA-Sync'
  };

  try {
    // Check if repo exists
    await axios.get(`https://api.github.com/repos/${username}/${repoName}`, { headers });
    console.log(`GitHub: Repo ${username}/${repoName} exists.`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`GitHub: Repo ${username}/${repoName} not found. Creating it...`);
      // Create repo
      await axios.post(
        'https://api.github.com/user/repos',
        {
          name: repoName,
          description: 'My DSA Solutions synced automatically by DSA Sync',
          private: false,
          auto_init: true
        },
        { headers }
      );
      console.log(`GitHub: Repo ${username}/${repoName} created successfully.`);
    } else {
      console.error(`GitHub: Error verifying/creating repository ${repoName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Creates or updates a file in a GitHub repository.
 * 
 * @param {string} token GitHub OAuth token
 * @param {string} username GitHub username
 * @param {string} repoName Repository name
 * @param {string} filePath Repository file path (e.g. 'LeetCode/1832-check-pangram/solution.cpp')
 * @param {string} content Raw file text content
 * @param {string} commitMessage Commit message
 */
export async function upsertFile(token, username, repoName, filePath, content, commitMessage) {
  const url = `https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DSA-Sync'
  };

  const base64Content = Buffer.from(content, 'utf-8').toString('base64');
  let sha = undefined;

  try {
    // Check if file already exists to get its SHA
    const fileRes = await axios.get(url, { headers });
    sha = fileRes.data.sha;
  } catch (error) {
    // 404 is expected if file is new; ignore other errors
    if (!error.response || error.response.status !== 404) {
      console.warn(`GitHub: Warning retrieving file SHA for ${filePath}:`, error.message);
    }
  }

  const body = {
    message: commitMessage,
    content: base64Content,
    branch: 'main'
  };

  if (sha) {
    body.sha = sha;
  }

  await axios.put(url, body, { headers });
  console.log(`GitHub: File ${filePath} successfully pushed.`);
}

/**
 * Commits a solution to the GitHub repository.
 * 
 * @param {Object} params Solution parameters
 * @param {string} params.token User's GitHub access token
 * @param {string} params.username User's GitHub username
 * @param {string} params.repo User's chosen sync repository name
 * @param {string} params.platform Platform (e.g. 'LeetCode')
 * @param {string} params.problemId Problem ID (e.g. '1832')
 * @param {string} params.problemSlug Problem slug (e.g. 'check-if-the-sentence-is-pangram')
 * @param {string} params.language Language (e.g. 'C++', 'Python')
 * @param {string} params.code Source code
 * @param {string} params.readme README content
 * @param {Object} params.metadata Metadata object
 * @returns {Promise<Object>} Result with success status and message
 */
export async function syncToGithub({ token, username, repo, platform, problemId, problemSlug, language, code, readme, metadata }) {
  try {
    // Validate token is not a mock token
    if (!token || token.startsWith('mock_')) {
      return {
        success: false,
        synced: false,
        message: 'GitHub token is not configured. Please authenticate with GitHub OAuth.',
        error: 'MOCK_TOKEN'
      };
    }

    const cleanPlatform = platform.replace(/\s+/g, ''); // LeetCode, GeeksForGeeks, etc.
    const cleanSlug = problemSlug ? problemSlug : problemId;
    // Include problem number in folder name for better organization
    const folderName = `${problemId}-${cleanSlug}`.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    
    const basePath = `${cleanPlatform}/${folderName}`;
    const extensionMap = {
      'c++': 'cpp',
      'cpp': 'cpp',
      'java': 'java',
      'python': 'py',
      'python3': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'c': 'c',
      'c#': 'cs',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'php': 'php',
      'html': 'html'
    };

    const cleanLang = language.toLowerCase().trim();
    const ext = extensionMap[cleanLang] || 'txt';
    const solutionPath = `${basePath}/solution.${ext}`;
    const readmePath = `${basePath}/README.md`;

    // Ensure repo exists
    await ensureRepoExists(token, username, repo);

    // Push files (README and solution only - no metadata.json)
    console.log(`GitHub: Syncing files for problem ${problemId} to ${basePath}`);
    await upsertFile(token, username, repo, solutionPath, code, `Add solution for ${metadata.title} (${platform})`);
    await upsertFile(token, username, repo, readmePath, readme, `Add documentation for ${metadata.title} (${platform})`);
    
    console.log('GitHub: Problem successfully synced.');
    return {
      success: true,
      synced: true,
      message: `Successfully synced to GitHub at ${username}/${repo}/${basePath}`,
      repoUrl: `https://github.com/${username}/${repo}/tree/main/${basePath}`
    };
  } catch (error) {
    console.error('GitHub Sync Error:', error.message);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error during GitHub sync';
    return {
      success: false,
      synced: false,
      message: errorMessage,
      error: error.response?.status ? `HTTP_${error.response.status}` : 'NETWORK_ERROR'
    };
  }
}
