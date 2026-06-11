import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  CalendarDays, 
  Trophy, 
  FileText, 
  Github, 
  LogOut, 
  Settings, 
  Globe, 
  Menu, 
  X, 
  Copy, 
  Check, 
  RefreshCw 
} from 'lucide-react';

import DashboardView from './components/Dashboard';
import AnalyticsView from './components/Analytics';
import PlannerView from './components/Planner';
import ContestsView from './components/Contests';
import ResumeView from './components/Resume';
import PortfolioView from './components/Portfolio';

// --- AUTH CONTEXT ---
interface AuthContextType {
  token: string | null;
  username: string | null;
  repoName: string | null;
  backendUrl: string;
  login: (token: string, username: string, repoName: string) => void;
  logout: () => void;
  updateRepo: (newRepo: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- AUTH CALLBACK HANDLER ---
const AuthCallback: React.FC = () => {
  const { login, backendUrl } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code');
    if (code) {
      fetch(`${backendUrl}/api/auth/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          login(data.token, data.username, data.repoName);
          navigate('/');
        } else {
          alert('Auth failed: ' + (data.error || 'Unknown error'));
          navigate('/login');
        }
      })
      .catch(err => {
        console.error('OAuth Callback Error:', err);
        navigate('/login');
      });
    }
  }, [location, login, backendUrl, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold">Verifying GitHub Credentials...</h2>
      <p className="text-gray-400 text-sm mt-1">Please wait while we connect your account</p>
    </div>
  );
};

// --- MAIN LAYOUT SHELL ---
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { username, repoName, logout, updateRepo, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [repoInput, setRepoInput] = useState(repoName || 'DSA-Sync-Solutions');
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (repoName) setRepoInput(repoName);
  }, [repoName]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Planner', path: '/planner', icon: CalendarDays },
    { name: 'Contest Tracker', path: '/contests', icon: Trophy },
    { name: 'Resume Mode', path: '/resume', icon: FileText }
  ];

  const handleSaveRepo = async () => {
    const success = await updateRepo(repoInput);
    if (success) {
      setIsSettingsOpen(false);
      alert('Repository target updated!');
    } else {
      alert('Failed to update repository target.');
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#05070f]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-dark-border text-gray-200">
        <div className="p-6 border-b border-dark-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            🔄
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-white font-outfit">DSA Sync</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Platform Tracker</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/10 text-white border-l-2 border-indigo-500 pl-3.5' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold">
              {username?.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{username}</div>
              <div className="text-xs text-indigo-400 font-semibold truncate flex items-center gap-1">
                <Github className="w-3.5 h-3.5" />
                {repoName}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/5"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center justify-center p-2 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 glass border-b border-dark-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <span className="font-bold text-white font-outfit">DSA Sync</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 glass-panel border-r border-dark-border text-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg text-white font-outfit">DSA Sync</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500 pl-3.5' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t border-dark-border">
              <div className="text-sm font-bold text-white mb-2">{username}</div>
              <button 
                onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false); }}
                className="w-100 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Extension Setup & Target Repo) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md glass border border-dark-border rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white font-outfit">Account Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Target Repo */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">GitHub Sync Repository</label>
                <input 
                  type="text" 
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/35 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. My-DSA-Solutions"
                />
                <p className="text-[10px] text-gray-500 mt-1">If the repository does not exist on your profile, we will automatically initialize it.</p>
              </div>

              {/* Extension Connection */}
              <div className="p-4 rounded-xl bg-white/5 border border-dark-border">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Extension Connection</h4>
                <p className="text-xs text-gray-400 mb-3">Copy your authentication token and paste it inside the extension configuration panel to pair them.</p>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={token || ''}
                    readOnly
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-dark-border text-gray-300 text-xs font-mono outline-none"
                  />
                  <button 
                    onClick={handleCopyToken}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Public Portfolio link */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Public Portfolio Page</label>
                <a 
                  href={`/portfolio/${username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-indigo-300 font-semibold hover:text-indigo-200 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  View Public Scorecard: /portfolio/{username}
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-border">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="py-2 px-4 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRepo}
                className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- AUTH / LOGIN PAGE ---
const LoginView: React.FC = () => {
  const { backendUrl, login } = useAuth();
  const [mockName, setMockName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGithubLogin = () => {
    // Standard GitHub OAuth initiation with environment variables
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI;
    
    if (!clientId) {
      alert('GitHub Client ID not configured. Please check your .env file.');
      return;
    }
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
    console.log('Redirecting to GitHub:', githubAuthUrl);
    window.location.href = githubAuthUrl;
  };

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockName.trim()) return;

    setIsLoading(true);
    fetch(`${backendUrl}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: mockName.trim() })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        login(data.token, data.username, data.repoName);
        navigate('/');
      } else {
        alert('Mock login failed');
      }
    })
    .catch(err => {
      console.error(err);
      alert('Network error during mock auth');
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass border border-dark-border rounded-2xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-500/25 text-2xl mb-3">
            🔄
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit">Welcome to DSA Sync</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">Automatically track code solutions and compile your dashboard</p>
        </div>

        <button 
          onClick={handleGithubLogin}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-500/25 mb-6 text-sm"
        >
          <Github className="w-5 h-5" />
          Connect with GitHub OAuth
        </button>

        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-dark-border"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-xs font-semibold uppercase tracking-wider">or test offline mode</span>
          <div className="flex-grow border-t border-dark-border"></div>
        </div>

        <form onSubmit={handleMockLogin} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Developer Mock Username</label>
            <input 
              type="text" 
              required
              value={mockName}
              onChange={(e) => setMockName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. CodeExplorer"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center"
          >
            {isLoading ? 'Processing...' : 'Access via Developer Mock'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ROUTE GUARDS ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    // If not authenticated, redirect to login
    return <LoginView />;
  }
  return <MainLayout>{children}</MainLayout>;
};

// --- PROVIDER ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('github_username'));
  const [repoName, setRepoName] = useState<string | null>(localStorage.getItem('repo_name'));
  const backendUrl = 'http://localhost:5000'; // Standard API Host

  const login = (jwtToken: string, gUser: string, rName: string) => {
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('github_username', gUser);
    localStorage.setItem('repo_name', rName);
    setToken(jwtToken);
    setUsername(gUser);
    setRepoName(rName);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('github_username');
    localStorage.removeItem('repo_name');
    setToken(null);
    setUsername(null);
    setRepoName(null);
  };

  const updateRepo = async (newRepo: string) => {
    if (!token) return false;
    try {
      const res = await fetch(`${backendUrl}/api/user/repo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repoName: newRepo })
      });
      if (res.ok) {
        localStorage.setItem('repo_name', newRepo);
        setRepoName(newRepo);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ token, username, repoName, backendUrl, login, logout, updateRepo }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/github/callback" element={<AuthCallback />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/portfolio/:username" element={<PortfolioView />} />
          
          <Route path="/" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsView /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute><PlannerView /></ProtectedRoute>} />
          <Route path="/contests" element={<ProtectedRoute><ContestsView /></ProtectedRoute>} />
          <Route path="/resume" element={<ProtectedRoute><ResumeView /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
