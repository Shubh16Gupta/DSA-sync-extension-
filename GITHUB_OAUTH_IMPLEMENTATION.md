# GitHub OAuth Implementation Guide for DSA Sync Frontend

## 🔐 GitHub OAuth Flow

The application uses GitHub OAuth for authentication. Here's how to implement it:

### 1. GitHub OAuth App Setup

1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name:** DSA Sync
   - **Homepage URL:** `http://localhost:3000` (or your domain)
   - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
4. Copy `Client ID` and generate `Client Secret`
5. Add to backend `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
   ```

---

## 🔄 OAuth Flow Sequence

```
User clicks "Login with GitHub"
           ↓
Frontend redirects to GitHub authorization URL
           ↓
User grants permission on GitHub
           ↓
GitHub redirects back to /auth/github/callback with code
           ↓
Frontend receives code parameter
           ↓
Frontend sends code to backend /api/auth/github endpoint
           ↓
Backend exchanges code for access token
           ↓
Backend returns JWT token to frontend
           ↓
Frontend stores JWT and redirects to dashboard
```

---

## 💻 Implementation Steps

### Step 1: Add GitHub Login Button

In your React component (e.g., `pages/Login.tsx`):

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    // If we have a code from GitHub redirect
    if (code) {
      exchangeCodeForToken(code);
    }
  }, [code]);

  const handleGitHubLogin = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_GITHUB_REDIRECT_URI;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo&allow_signup=true`;
    
    window.location.href = githubAuthUrl;
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      if (data.token) {
        // Store token
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('github_username', data.username);
        localStorage.setItem('repo_name', data.repoName);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        alert('Login failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to exchange code for token: ' + error);
    }
  };

  return (
    <div className="login-container">
      <h1>DSA Sync Login</h1>
      
      <button onClick={handleGitHubLogin} className="btn-github">
        🔐 Login with GitHub
      </button>

      <p>Grant access to your repositories to auto-sync your DSA solutions.</p>
    </div>
  );
}
```

### Step 2: Create OAuth Callback Route

In your main `App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/github/callback" element={<Login />} />
        
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 3: Create Private Route Component

```tsx
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('jwt_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Step 4: Create Token Management Hook

```tsx
// hooks/useAuth.ts
import { useCallback } from 'react';

export function useAuth() {
  const token = localStorage.getItem('jwt_token');
  const username = localStorage.getItem('github_username');
  const repoName = localStorage.getItem('repo_name');

  const isAuthenticated = !!token;

  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('github_username');
    localStorage.removeItem('repo_name');
    window.location.href = '/login';
  }, []);

  return {
    token,
    username,
    repoName,
    isAuthenticated,
    getAuthHeaders,
    logout
  };
}
```

### Step 5: Update API Calls with Token

```tsx
// Example: Fetching dashboard stats
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/dashboard/stats',
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="dashboard">
      {/* Render stats */}
    </div>
  );
}
```

### Step 6: Environment Variables

Create `.env` in frontend:

```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_GITHUB_CLIENT_ID=your_client_id
REACT_APP_GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
```

---

## 🔒 Security Best Practices

### 1. Never Expose Client Secret
- ✅ Client Secret should ONLY be in backend `.env`
- ✅ Frontend only needs Client ID (which is public)
- ✅ Never commit `.env` files to Git

### 2. Secure Token Storage
```tsx
// ✅ Good: Use secure storage methods
localStorage.setItem('jwt_token', token); // For simplicity, but consider:
// - sessionStorage (cleared on browser close)
// - Secure HTTP-only cookies (best for production)

// ❌ Avoid: Storing in global variables (vulnerable to XSS)
```

### 3. Token Refresh
```tsx
// Implement token refresh for production
export async function refreshToken() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('jwt_token', data.token);
      return data.token;
    } else {
      // Token expired, redirect to login
      window.location.href = '/login';
    }
  } catch (error) {
    window.location.href = '/login';
  }
}
```

### 4. CORS Configuration
Ensure backend allows frontend domain:

In `backend/index.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

---

## 🧪 Testing OAuth Flow

### 1. Test GitHub OAuth URL
Generate the URL and open in browser:
```
https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/github/callback&scope=repo
```

### 2. Verify Code Exchange
```bash
curl -X POST http://localhost:5000/api/auth/github \
  -H "Content-Type: application/json" \
  -d '{"code":"github_auth_code_here"}'
```

### 3. Check Token Validation
```bash
TOKEN="your_jwt_token"
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## ❌ Common Issues & Solutions

### Issue: "Invalid client_id"
- [ ] Check Client ID is correct
- [ ] Check GitHub OAuth app still exists
- [ ] Verify app scope includes `repo`

### Issue: "Redirect URI mismatch"
- [ ] Must match EXACTLY in GitHub app settings
- [ ] Check for trailing slashes
- [ ] Verify protocol (http vs https)

### Issue: Token not working
- [ ] Check token is in Authorization header correctly: `Bearer <token>`
- [ ] Verify JWT_SECRET in backend matches
- [ ] Check token hasn't expired (valid for 7 days)

### Issue: CORS errors
- [ ] Backend CORS must allow frontend origin
- [ ] Check credentials: true if needed
- [ ] Verify headers are correct

---

## 📚 References

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [React Router Documentation](https://reactrouter.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## ✅ Checklist

- [ ] GitHub OAuth app created
- [ ] Client ID and Secret copied
- [ ] Environment variables set
- [ ] Login button implemented
- [ ] OAuth callback route created
- [ ] Private route component working
- [ ] Token storage implemented
- [ ] API calls include Authorization header
- [ ] Logout functionality works
- [ ] Tested full OAuth flow
