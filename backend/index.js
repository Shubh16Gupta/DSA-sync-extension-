import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { query, initDb, isPostgres } from './db.js';
import { generateNotes } from './gemini.js';
import { syncToGithub } from './github.js';

dotenv.config();

// ===== ENVIRONMENT VALIDATION =====
function validateEnvironment() {
  const required = ['JWT_SECRET'];
  const recommended = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI', 'GEMINI_API_KEY'];
  
  const missing = required.filter(env => !process.env[env]);
  const missingRecommended = recommended.filter(env => !process.env[env]);

  if (missing.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these in your .env file');
    process.exit(1);
  }

  if (missingRecommended.length > 0) {
    console.warn(`⚠️  WARNING: Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    console.warn('GitHub OAuth and AI features will be disabled');
    console.warn('Set these in your .env file to enable full functionality');
  }

  console.log(`✅ Environment validated`);
  if (isPostgres) {
    console.log(`✅ Using PostgreSQL database`);
  } else {
    console.log(`⚠️  Using SQLite database (recommended for development only)`);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dsa_sync_fallback_secret_123';

app.use(cors());
app.use(express.json());

// Validate environment on startup
validateEnvironment();

// Initialize Database on Startup
initDb().catch(err => {
  console.error('Fatal database initialization error:', err);
});

// Helper for formatting README with attractive design
function formatReadme(title, platform, url, description, constraints, examples, notes, language, submittedAt, metrics = {}) {
  const observationsMd = Array.isArray(notes.observations) 
    ? notes.observations.map(obs => `- ${obs}`).join('\n') 
    : '- Observed standard problem parameters.';
  
  const conceptsMd = Array.isArray(notes.concepts) 
    ? notes.concepts.join(', ') 
    : 'DSA';

  const submissionDate = submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString();

  // Build metrics section if available
  let metricsHtml = '';
  if (metrics && Object.keys(metrics).length > 0) {
    metricsHtml = `
## 🎯 Submission Results

| Metric | Value |
|--------|-------|`;
    
    if (metrics.testCasesPassed) {
      metricsHtml += `\n| ✅ Test Cases Passed | ${metrics.testCasesPassed} |`;
    }
    if (metrics.accuracy) {
      metricsHtml += `\n| 🎯 Accuracy | ${metrics.accuracy}% |`;
    }
    if (metrics.pointsScored) {
      metricsHtml += `\n| 🏆 Points Scored | ${metrics.pointsScored} |`;
    }
    if (metrics.timeTaken) {
      metricsHtml += `\n| ⏱️ Time Taken | ${metrics.timeTaken} |`;
    }
    if (metrics.memory) {
      metricsHtml += `\n| 💾 Memory | ${metrics.memory} |`;
    }
    
    metricsHtml += '\n\n---\n';
  }

  return `# ${title}

<div align="center">

![Platform](https://img.shields.io/badge/Platform-${platform}-blue?style=for-the-badge&logo=leetcode)
![Difficulty](https://img.shields.io/badge/Difficulty-Medium-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Solved-success?style=for-the-badge)

**Submitted:** ${submissionDate}

[🔗 View on ${platform}](${url})

</div>

---

## 📋 Problem Description

${description && description.length > 0 ? description : '> Problem statement not captured. Please refer to the link above.'}

---

## 📝 Constraints

${constraints && constraints.length > 0 ? constraints : '> Constraints not captured. Please check the problem link.'}

---

## 💡 Examples

${examples && examples.length > 0 ? examples : '> Examples not captured. Please check the problem link.'}

---

## 🧠 Solution Approach

### Algorithm
> ${notes.approach}

### Key Observations
${observationsMd}

### Related Concepts
\`\`\`
${conceptsMd}
\`\`\`

---

## ⏱️ Complexity Analysis

| Metric | Complexity | Details |
|--------|-----------|---------|
| **Time** | ${notes.timeComplexity} | Efficient iteration through data |
| **Space** | ${notes.spaceComplexity} | Minimal extra space required |

---

${metricsHtml}

<div align="center">

**Created with ❤️ by DSA Sync**

</div>
`;
}


// Authentication Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date(),
    database: isPostgres ? 'PostgreSQL' : 'SQLite',
    githubOAuthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Configuration Info (public, for debugging)
app.get('/api/info', (req, res) => {
  res.json({
    name: 'DSA Sync Backend',
    version: '1.0.0',
    database: isPostgres ? 'PostgreSQL' : 'SQLite',
    features: {
      githubOAuth: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      geminiAI: !!process.env.GEMINI_API_KEY,
      autoSync: true
    }
  });
});

// 1. Mock Login (for testing without GitHub OAuth setup)
app.post('/api/auth/mock-login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    // Check if user exists
    let userRes = await query('SELECT * FROM users WHERE github_username = $1', [username]);
    let user = userRes.rows[0];

    if (!user) {
      // Create user
      const insertRes = await query(
        'INSERT INTO users (github_username, github_token, repo_name) VALUES ($1, $2, $3)',
        [username, 'mock_token_12345', 'DSA-Sync-Solutions']
      );
      // Retrieve new user id
      userRes = await query('SELECT * FROM users WHERE github_username = $1', [username]);
      user = userRes.rows[0];
    }

    const token = jwt.sign({ id: user.id, username: user.github_username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.github_username, repoName: user.repo_name });
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// 2. Real GitHub OAuth Login
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'OAuth code missing' });

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI
    }, {
      headers: { 'Accept': 'application/json' }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Failed to retrieve access token from GitHub' });
    }

    // 2. Fetch user profile info
    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'DSA-Sync'
      }
    });

    const username = userProfileResponse.data.login;

    // 3. Save or update user in database
    let userRes = await query('SELECT * FROM users WHERE github_username = $1', [username]);
    let user = userRes.rows[0];

    if (user) {
      await query('UPDATE users SET github_token = $1 WHERE id = $2', [accessToken, user.id]);
    } else {
      await query('INSERT INTO users (github_username, github_token, repo_name) VALUES ($1, $2, $3)', [
        username,
        accessToken,
        'DSA-Sync-Solutions'
      ]);
      userRes = await query('SELECT * FROM users WHERE github_username = $1', [username]);
      user = userRes.rows[0];
    }

    // 4. Generate JWT
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username, repoName: user.repo_name });
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    res.status(500).json({ error: 'GitHub Authentication failed' });
  }
});

// 3. Update Repository Name Config
app.put('/api/user/repo', authenticateToken, async (req, res) => {
  const { repoName } = req.body;
  if (!repoName) return res.status(400).json({ error: 'Repo name is required' });

  try {
    await query('UPDATE users SET repo_name = $1 WHERE id = $2', [repoName, req.user.id]);
    res.json({ success: true, repoName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update repo name' });
  }
});

// 4. Receive solved problem from Extension
app.post('/api/submissions', authenticateToken, async (req, res) => {
  const {
    platform,
    problemId,
    title,
    url,
    difficulty,
    language,
    code,
    description,
    constraints,
    examples,
    tags = [],
    metrics = {}
  } = req.body;

  if (!platform || !problemId || !title || !code) {
    return res.status(400).json({ error: 'Missing required submission fields' });
  }

  try {
    // 1. Fetch user data (especially GitHub token)
    const userRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Generate AI Notes via Gemini
    const notes = await generateNotes(title, platform, difficulty, tags, description, code, language);
    const submittedAt = new Date().toISOString();
    const readmeContent = formatReadme(title, platform, url, description, constraints, examples, notes, language, submittedAt, metrics);

    // 3. Push to GitHub 
    let githubSyncResult = {
      success: false,
      synced: false,
      message: 'Not synced',
      error: null,
      repoUrl: null
    };

    if (user.github_token && !user.github_token.startsWith('mock_')) {
      const metadata = {
        platform,
        title,
        problemId,
        url,
        difficulty,
        language,
        tags,
        solvedAt: new Date().toISOString()
      };

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      githubSyncResult = await syncToGithub({
        token: user.github_token,
        username: user.github_username,
        repo: user.repo_name,
        platform,
        problemId,
        problemSlug: slug,
        language,
        code,
        readme: readmeContent,
        metadata
      });

      if (!githubSyncResult.success) {
        console.error(`GitHub Sync failed for ${title}:`, githubSyncResult.message);
      }
    } else {
      githubSyncResult = {
        success: false,
        synced: false,
        message: 'GitHub token not configured. Please authenticate via GitHub OAuth to enable automatic syncing.',
        error: 'NO_GITHUB_TOKEN'
      };
      console.log(`GitHub Sync skipped for ${user.github_username}: ${githubSyncResult.message}`);
    }

    // 4. Insert submission record in DB
    const insertSubRes = await query(
      `INSERT INTO submissions (user_id, platform, problem_id, problem_title, problem_url, difficulty, language, code, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [user.id, platform, problemId, title, url, difficulty, language, code, JSON.stringify(notes)]
    );
    
    // SQLite returns database ID differently sometimes, query handles returning list
    const submissionId = insertSubRes.rows[0] ? insertSubRes.rows[0].id : insertSubRes.lastID;

    // 5. Insert tags
    for (const tag of tags) {
      await query('INSERT INTO tags (submission_id, tag_name) VALUES ($1, $2)', [submissionId, tag]);
    }

    res.json({
      success: true,
      submissionId,
      githubSync: {
        synced: githubSyncResult.synced,
        success: githubSyncResult.success,
        message: githubSyncResult.message,
        error: githubSyncResult.error,
        repoUrl: githubSyncResult.repoUrl
      },
      notes
    });
  } catch (error) {
    console.error('Error handling submission:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// 5. Fetch Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch user details
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Total Solved
    const totalSolvedRes = await query('SELECT COUNT(*) as count FROM submissions WHERE user_id = $1', [userId]);
    const totalSolved = parseInt(totalSolvedRes.rows[0].count);

    // Difficulty breakdown
    const diffRes = await query(
      'SELECT difficulty, COUNT(*) as count FROM submissions WHERE user_id = $1 GROUP BY difficulty',
      [userId]
    );
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    diffRes.rows.forEach(r => {
      // Support matching case-insensitively
      const key = r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1).toLowerCase();
      if (key in difficultyStats) {
        difficultyStats[key] = parseInt(r.count);
      } else {
        // Fallback for other platform rating strings or values
        if (r.difficulty.toLowerCase() === 'easy') difficultyStats.Easy += parseInt(r.count);
        else if (r.difficulty.toLowerCase() === 'medium') difficultyStats.Medium += parseInt(r.count);
        else if (r.difficulty.toLowerCase() === 'hard') difficultyStats.Hard += parseInt(r.count);
        else difficultyStats.Medium += parseInt(r.count); // Default fallback
      }
    });

    // Platform statistics
    const platRes = await query(
      'SELECT platform, COUNT(*) as count FROM submissions WHERE user_id = $1 GROUP BY platform',
      [userId]
    );
    const platformStats = {};
    platRes.rows.forEach(r => {
      platformStats[r.platform] = parseInt(r.count);
    });

    // Topic/Tag statistics
    const topicRes = await query(
      `SELECT t.tag_name, COUNT(*) as count 
       FROM tags t 
       JOIN submissions s ON t.submission_id = s.id 
       WHERE s.user_id = $1 
       GROUP BY t.tag_name`,
      [userId]
    );
    const topicStats = {};
    topicRes.rows.forEach(r => {
      topicStats[r.tag_name] = parseInt(r.count);
    });

    // Submissions today, this week, this month
    const todayRes = await query(
      `SELECT COUNT(*) as count FROM submissions 
       WHERE user_id = $1 AND DATE(solved_at) = CURRENT_DATE`,
      [userId]
    );
    const solvedToday = parseInt(todayRes.rows[0].count);

    // Week calculation - handle both SQLite and PostgreSQL
    let weekQueryText;
    if (isPostgres) {
      weekQueryText = `SELECT COUNT(*) as count FROM submissions 
       WHERE user_id = $1 AND solved_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else {
      weekQueryText = `SELECT COUNT(*) as count FROM submissions 
       WHERE user_id = $1 AND solved_at >= date('now', '-7 days')`;
    }
    const weekRes = await query(weekQueryText, [userId]);
    let solvedThisWeek = weekRes.rows[0] ? parseInt(weekRes.rows[0].count) : 0;

    // Heatmap: Solved questions per day (last 1 year)
    let heatmapQueryText;
    if (isPostgres) {
      heatmapQueryText = `SELECT DATE(solved_at) as date, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = $1 AND solved_at >= CURRENT_DATE - INTERVAL '365 days'
       GROUP BY DATE(solved_at)
       ORDER BY DATE(solved_at) ASC`;
    } else {
      heatmapQueryText = `SELECT DATE(solved_at) as date, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = $1 AND solved_at >= date('now', '-365 days')
       GROUP BY DATE(solved_at)
       ORDER BY DATE(solved_at) ASC`;
    }
    const heatmapRes = await query(heatmapQueryText, [userId]);
    const heatmap = heatmapRes.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count)
    }));

    // Dynamic Streak Calculation
    const datesRes = await query(
      `SELECT DISTINCT DATE(solved_at) as date 
       FROM submissions 
       WHERE user_id = $1 
       ORDER BY DATE(solved_at) DESC`,
      [userId]
    );
    const dates = datesRes.rows.map(r => {
      // Handle SQLite vs Postgres date formats
      const d = new Date(r.date);
      return d.toISOString().split('T')[0];
    });

    let currentStreak = 0;
    let longestStreak = 0;

    if (dates.length > 0) {
      // Calculate current streak
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (dates[0] === todayStr || dates[0] === yesterdayStr) {
        currentStreak = 1;
        let lastDate = new Date(dates[0]);
        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(dates[i]);
          const diffTime = Math.abs(lastDate - currentDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreak++;
            lastDate = currentDate;
          } else if (diffDays === 0) {
            continue; // Same day, ignore
          } else {
            break; // Streak broken
          }
        }
      }

      // Calculate longest streak
      let tempStreak = 1;
      let lastDate = new Date(dates[0]);
      longestStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i]);
        const diffTime = Math.abs(lastDate - currentDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          lastDate = currentDate;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else if (diffDays === 0) {
          continue;
        } else {
          tempStreak = 1;
          lastDate = currentDate;
        }
      }
    }

    res.json({
      githubUsername: user.github_username,
      repoName: user.repo_name,
      totalSolved,
      solvedToday,
      solvedThisWeek,
      difficultyStats,
      platformStats,
      topicStats,
      currentStreak,
      longestStreak,
      heatmap
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

// 6. Daily Planner API
app.get('/api/planner', authenticateToken, async (req, res) => {
  try {
    const tasksRes = await query(
      'SELECT * FROM daily_planner WHERE user_id = $1 ORDER BY target_date ASC, id ASC',
      [req.user.id]
    );
    res.json(tasksRes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch planner tasks' });
  }
});

app.post('/api/planner', authenticateToken, async (req, res) => {
  const { description, date } = req.body;
  if (!description || !date) return res.status(400).json({ error: 'Missing task details' });

  try {
    const insertRes = await query(
      'INSERT INTO daily_planner (user_id, task_description, target_date, is_completed) VALUES ($1, $2, $3, false) RETURNING *',
      [req.user.id, description, date]
    );
    const newTask = insertRes.rows[0] || { id: insertRes.lastID, user_id: req.user.id, task_description: description, target_date: date, is_completed: false };
    res.json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/planner/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { isCompleted } = req.body;

  try {
    await query(
      'UPDATE daily_planner SET is_completed = $1 WHERE id = $2 AND user_id = $3',
      [isCompleted, taskId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/planner/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;

  try {
    await query(
      'DELETE FROM daily_planner WHERE id = $1 AND user_id = $2',
      [taskId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// 7. Contest Tracker API
app.get('/api/contests', authenticateToken, async (req, res) => {
  try {
    const contestsRes = await query(
      'SELECT * FROM contests WHERE user_id = $1 ORDER BY contest_date DESC',
      [req.user.id]
    );
    res.json(contestsRes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

app.post('/api/contests', authenticateToken, async (req, res) => {
  const { platform, contestName, rank, ratingAfter, solvedCount, contestDate } = req.body;
  if (!platform || !contestName || rank === undefined) {
    return res.status(400).json({ error: 'Missing contest details' });
  }

  try {
    const insertRes = await query(
      `INSERT INTO contests (user_id, platform, contest_name, rank, rating_after, solved_count, contest_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, platform, contestName, rank, ratingAfter, solvedCount, contestDate]
    );
    const newContest = insertRes.rows[0] || { id: insertRes.lastID, user_id: req.user.id, platform, contest_name: contestName, rank, rating_after: ratingAfter, solved_count: solvedCount, contest_date: contestDate };
    res.json(newContest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save contest details' });
  }
});

// 8. Public Portfolio API (No authentication needed!)
app.get('/api/portfolio/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1. Get user by username
    const userRes = await query('SELECT * FROM users WHERE github_username = $1', [username]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User profile not found' });

    // 2. Fetch total solved
    const totalSolvedRes = await query('SELECT COUNT(*) as count FROM submissions WHERE user_id = $1', [user.id]);
    const totalSolved = parseInt(totalSolvedRes.rows[0].count);

    // 3. Difficulty stats
    const diffRes = await query(
      'SELECT difficulty, COUNT(*) as count FROM submissions WHERE user_id = $1 GROUP BY difficulty',
      [user.id]
    );
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    diffRes.rows.forEach(r => {
      const key = r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1).toLowerCase();
      if (key in difficultyStats) difficultyStats[key] = parseInt(r.count);
    });

    // 4. Platform stats
    const platRes = await query(
      'SELECT platform, COUNT(*) as count FROM submissions WHERE user_id = $1 GROUP BY platform',
      [user.id]
    );
    const platformStats = {};
    platRes.rows.forEach(r => {
      platformStats[r.platform] = parseInt(r.count);
    });

    // 5. Topic stats
    const topicRes = await query(
      `SELECT t.tag_name, COUNT(*) as count 
       FROM tags t 
       JOIN submissions s ON t.submission_id = s.id 
       WHERE s.user_id = $1 
       GROUP BY t.tag_name`,
      [user.id]
    );
    const topicStats = {};
    topicRes.rows.forEach(r => {
      topicStats[r.tag_name] = parseInt(r.count);
    });

    // 6. Recent 10 solutions
    const recentRes = await query(
      `SELECT id, platform, problem_id, problem_title, problem_url, difficulty, language, solved_at 
       FROM submissions 
       WHERE user_id = $1 
       ORDER BY solved_at DESC LIMIT 10`,
      [user.id]
    );

    // 7. Heatmap
    const heatmapRes = await query(
      `SELECT DATE(solved_at) as date, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = $1 AND solved_at >= CURRENT_DATE - INTERVAL '365 days'
       GROUP BY DATE(solved_at)
       ORDER BY DATE(solved_at) ASC`,
      [user.id]
    );
    const heatmap = heatmapRes.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count)
    }));

    res.json({
      username: user.github_username,
      repoName: user.repo_name,
      joinedAt: user.created_at,
      totalSolved,
      difficultyStats,
      platformStats,
      topicStats,
      recentSolutions: recentRes.rows,
      heatmap
    });
  } catch (error) {
    console.error('Error fetching public portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch public portfolio data' });
  }
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DSA Sync Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🗄️  Database: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Using fallback'}`);
  console.log(`🔑 GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
  console.log('='.repeat(60) + '\n');
  console.log('📚 API Endpoints:');
  console.log('  - POST   /api/auth/mock-login');
  console.log('  - POST   /api/auth/github');
  console.log('  - POST   /api/submissions');
  console.log('  - GET    /api/dashboard/stats');
  console.log('  - GET    /api/portfolio/:username');
  console.log('  - GET    /api/health');
  console.log('  - GET    /api/info');
  console.log('');
});
