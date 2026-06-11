# DSA Sync - Setup and Troubleshooting Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- npm or yarn
- PostgreSQL 12+ (recommended) or SQLite (for development)
- GitHub account

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

3. **Configure GitHub OAuth:**

   a. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
   
   b. Click "New OAuth App" and fill in:
   - **Application name:** DSA Sync
   - **Homepage URL:** `http://localhost:3000` (or your frontend URL)
   - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
   
   c. Copy `Client ID` and `Client Secret` to your `.env` file:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
   ```

4. **Get Gemini API Key:**
   - Go to [Google AI Studio](https://ai.google.dev/)
   - Create a new API key
   - Add to `.env`:
   ```
   GEMINI_API_KEY=your_gemini_key
   ```

5. **Database Setup:**

   **Option A: PostgreSQL (Recommended)**
   ```bash
   # Create database
   createdb dsa_sync
   
   # Update .env
   DATABASE_URL=postgresql://username:password@localhost:5432/dsa_sync
   ```

   **Option B: SQLite (Development)**
   - Leave `DATABASE_URL` commented out
   - Database will be created as `dsa_sync.db`

6. **Start the backend:**
```bash
npm start
```

You should see:
```
============================================================
🚀 DSA Sync Backend Server Started
============================================================
📍 Server: http://localhost:5000
🗄️  Database: PostgreSQL/SQLite
🔐 JWT Secret: ✓ Configured
🔑 GitHub OAuth: ✓ Configured
� Gemini AI: ✓ Configured
============================================================
```

---

## 🔧 Common Issues and Solutions

### ❌ "GitHub token is not configured"

**Problem:** Solutions appear to sync but don't show up on GitHub.

**Solution:**
1. Make sure you're using **GitHub OAuth login**, not mock login
2. Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env`
3. Verify the GitHub OAuth app is created correctly
4. Check backend logs for specific error messages

### ❌ Database errors

**Problem:** `DATABASE_URL not set` but I want to use PostgreSQL

**Solution:**
```bash
# Create database first
createdb dsa_sync

# Update .env with connection string
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/dsa_sync

# Restart backend
npm start
```

### ❌ "Could not reach DSA Sync backend server"

**Problem:** Extension can't connect to backend

**Solution:**
1. Make sure backend is running: `npm start`
2. Check if running on port 5000: `lsof -i :5000`
3. Update extension popup with correct backend URL
4. If using different port, update in `.env` and `.env.example`

### ❌ "Gemini API rate limited"

**Problem:** Too many API calls to Gemini

**Solution:**
1. Check your Gemini API quotas at [ai.google.dev](https://ai.google.dev/)
2. Default notes will be used if Gemini is unavailable
3. You can disable Gemini features by leaving `GEMINI_API_KEY` empty

---

## 🧪 Testing the Setup

### Test 1: Backend Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "PostgreSQL",
  "githubOAuthConfigured": true,
  "geminiConfigured": true
}
```

### Test 2: Mock Login
```bash
curl -X POST http://localhost:5000/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "username": "testuser",
  "repoName": "DSA-Sync-Solutions"
}
```

### Test 3: Verify GitHub Token
Use the token from Test 2 to check dashboard stats:
```bash
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer <your_token>"
```

---

## 📋 GitHub Sync Workflow

1. **User solves problem on LeetCode/GFG/etc**
2. **Extension detects success** → Sends payload to backend
3. **Backend validates GitHub token** → If invalid, returns error
4. **Backend generates README** with AI notes via Gemini
5. **Backend creates GitHub repo** (if not exists)
6. **Backend pushes 3 files:**
   - `solution.cpp` (or other language)
   - `README.md` (with problem details and notes)
   - `metadata.json` (for future analytics)
7. **Response sent to extension** with sync status
8. **Notification shown** to user with result

### Example GitHub structure after sync:
```
DSA-Sync-Solutions/
├── LeetCode/
│   ├── 1-two-sum/
│   │   ├── README.md
│   │   ├── solution.cpp
│   │   └── metadata.json
│   └── 2-add-two-numbers/
│       ├── README.md
│       ├── solution.py
│       └── metadata.json
├── GeeksForGeeks/
└── Codeforces/
```

---

## 🔍 Debugging Tips

### 1. Check Backend Logs
The backend will print detailed logs:
```
GitHub: Repo username/DSA-Sync-Solutions exists.
GitHub: Syncing files for problem 1832 to LeetCode/1832-check-if-the-sentence-is-pangram
GitHub: File LeetCode/1832-check-if-the-sentence-is-pangram/solution.cpp successfully pushed.
GitHub: Problem successfully synced.
```

### 2. Check Extension Console
Open DevTools → Extensions tab → Click "background page" for extension logs

### 3. Test Token Validity
```bash
curl https://api.github.com/user \
  -H "Authorization: token YOUR_GITHUB_TOKEN"
```

If valid, you'll see your GitHub profile info.

### 4. Monitor Database
**PostgreSQL:**
```bash
psql dsa_sync
SELECT * FROM submissions; -- View all submissions
SELECT * FROM users; -- View users
```

**SQLite:**
```bash
sqlite3 dsa_sync.db
SELECT * FROM submissions;
```

---

## 📚 Environment Variables Explained

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No | Server port (default: 5000) |
| `JWT_SECRET` | **Yes** | Secret key for JWT tokens |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | **For OAuth** | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | **For OAuth** | OAuth app secret |
| `GITHUB_REDIRECT_URI` | **For OAuth** | OAuth callback URL |
| `GEMINI_API_KEY` | No | For AI-generated notes |
| `NODE_ENV` | No | Environment (development/production) |
| `FRONTEND_URL` | No | Frontend base URL |

---

## 🚀 Production Deployment

### Before deploying:
1. ✅ Use strong `JWT_SECRET` (not the default)
2. ✅ Use PostgreSQL with strong password
3. ✅ Set `NODE_ENV=production`
4. ✅ Use HTTPS for GitHub OAuth callback URL
5. ✅ Store all secrets in environment variables (never commit `.env`)
6. ✅ Enable rate limiting on API endpoints

### Recommended hosting:
- Backend: Railway, Heroku, DigitalOcean, AWS
- Database: AWS RDS, Railway, Heroku Postgres
- Frontend: Vercel, Netlify

---

## 💡 Need Help?

- Check backend logs: `npm start` output
- Check extension logs: DevTools → Application tab
- Verify GitHub OAuth setup: [GitHub Developer Settings](https://github.com/settings/developers)
- Test API endpoints manually with curl or Postman
- Check network tab in DevTools for API errors

