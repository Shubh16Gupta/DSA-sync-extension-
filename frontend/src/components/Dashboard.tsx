import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Trophy, 
  Flame, 
  Layers, 
  Calendar, 
  CheckSquare, 
  TrendingUp, 
  Plus, 
  Sparkles, 
  Code,
  RefreshCw,
  Github,
  Check
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface StatsType {
  githubUsername: string;
  repoName: string;
  totalSolved: number;
  solvedToday: number;
  solvedThisWeek: number;
  difficultyStats: { Easy: number; Medium: number; Hard: number };
  platformStats: Record<string, number>;
  topicStats: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  heatmap: Array<{ date: string; count: number }>;
}

interface TaskType {
  id: number;
  task_description: string;
  target_date: string;
  is_completed: boolean;
}

const DashboardView: React.FC = () => {
  const { token, backendUrl } = useAuth();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all dashboard stats & planner tasks
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch stats
      const statsRes = await fetch(`${backendUrl}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch tasks
      const tasksRes = await fetch(`${backendUrl}/api/planner`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, backendUrl]);

  // Handle planner task toggle
  const handleToggleTask = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${backendUrl}/api/planner/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
        // Refresh stats (solved counts today could update if a task is linked, or just general)
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${backendUrl}/api/planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: newTaskText.trim(),
          date: today
        })
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
        setNewTaskText('');
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  // Heatmap generation logic (dynamic calendar grid)
  const renderHeatmap = () => {
    if (!stats) return null;

    // Create a map of date strings to solve counts
    const solvedMap: Record<string, number> = {};
    stats.heatmap.forEach(h => {
      // Normalize date string (format YYYY-MM-DD)
      const dStr = new Date(h.date).toISOString().split('T')[0];
      solvedMap[dStr] = h.count;
    });

    const today = new Date();
    // Go back 364 days to get exactly 365 days (52 weeks + leftover)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    // Adjust start date to start on a Sunday for clean grid columns
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const tempDate = new Date(startDate);
    const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

    // Group dates by week
    const weeks: Array<Array<{ dateStr: string; count: number }>> = [];
    let currentWeek: Array<{ dateStr: string; count: number }> = [];

    while (tempDate <= today || currentWeek.length > 0) {
      const dateStr = tempDate.toISOString().split('T')[0];
      const count = solvedMap[dateStr] || 0;
      
      currentWeek.push({ dateStr, count });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      tempDate.setDate(tempDate.getDate() + 1);
      
      // Safety exit
      if (weeks.length > 53) break;
    }

    return (
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-[720px] select-none">
          {/* Day Names Column */}
          <div className="grid grid-rows-7 text-[10px] text-gray-500 font-semibold pr-2 pt-4 justify-between h-[110px] w-8">
            {dayLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                {week.map((day, dIdx) => {
                  let colorClass = 'bg-[#181d2d]'; // 0 solves
                  if (day.count === 1) colorClass = 'bg-indigo-950/80 border border-indigo-800/30';
                  else if (day.count === 2) colorClass = 'bg-indigo-800/50';
                  else if (day.count === 3) colorClass = 'bg-indigo-600/70';
                  else if (day.count >= 4) colorClass = 'bg-indigo-500';

                  const showDayTooltip = `${day.dateStr}: ${day.count} solved`;

                  return (
                    <div
                      key={dIdx}
                      className={`w-[13px] h-[13px] rounded-[2px] transition-all hover:scale-125 cursor-pointer ${colorClass}`}
                      title={showDayTooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex justify-end items-center gap-1.5 text-[10px] text-gray-500 mt-3 font-semibold pr-2">
          <span>Less</span>
          <div className="w-[11px] h-[11px] rounded-[1px] bg-[#181d2d]"></div>
          <div className="w-[11px] h-[11px] rounded-[1px] bg-indigo-950/80 border border-indigo-800/30"></div>
          <div className="w-[11px] h-[11px] rounded-[1px] bg-indigo-800/50"></div>
          <div className="w-[11px] h-[11px] rounded-[1px] bg-indigo-600/70"></div>
          <div className="w-[11px] h-[11px] rounded-[1px] bg-indigo-500"></div>
          <span>More</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-300">Loading Dashboard stats...</h3>
      </div>
    );
  }

  // Fallback default values
  const totalSolved = stats?.totalSolved ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const solvedToday = stats?.solvedToday ?? 0;
  const solvedThisWeek = stats?.solvedThisWeek ?? 0;
  
  // Format platform data for simple bar chart
  const platformChartData = stats?.platformStats 
    ? Object.entries(stats.platformStats).map(([name, value]) => ({ name, value }))
    : [];

  // Core DSA topics list to show mastery
  const coreTopics = [
    { name: 'Arrays', target: 30 },
    { name: 'Strings', target: 20 },
    { name: 'Hashing', target: 15 },
    { name: 'Trees', target: 25 },
    { name: 'Graphs', target: 25 },
    { name: 'Dynamic Programming', target: 35 },
    { name: 'Greedy', target: 20 },
    { name: 'Binary Search', target: 15 }
  ];

  // Map database tags matching topics
  const getMasteryPercentage = (topicName: string, targetCount: number) => {
    if (!stats?.topicStats) return 0;
    
    // Match keys case-insensitively
    const matchKey = Object.keys(stats.topicStats).find(
      key => key.toLowerCase() === topicName.toLowerCase()
    );
    
    const count = matchKey ? stats.topicStats[matchKey] : 0;
    const percentage = Math.round((count / targetCount) * 100);
    return Math.min(percentage, 100);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => t.target_date === todayStr);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6 rounded-2xl border border-dark-border relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">
            Welcome back, <span className="text-indigo-400">{stats?.githubUsername}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Your universal extension is active. Keep solving to grow your GitHub repo.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-dark-border text-center">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Solved Today</div>
            <div className="text-xl font-bold text-white mt-0.5">{solvedToday}</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-dark-border text-center">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">This Week</div>
            <div className="text-xl font-bold text-white mt-0.5">{solvedThisWeek}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Solved */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Solved</span>
            <span className="text-3xl font-extrabold text-white block mt-1 font-outfit">{totalSolved}</span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1">across all coding portals</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <Code className="w-6 h-6" />
          </div>
        </div>

        {/* Current Streak */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Current Streak</span>
            <span className="text-3xl font-extrabold text-orange-400 block mt-1 font-outfit flex items-baseline gap-1.5">
              {currentStreak}
              <span className="text-sm font-semibold text-gray-400">days</span>
            </span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1">keep solving to lock in today</span>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-orange-400 animate-pulse">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Longest Streak */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Longest Streak</span>
            <span className="text-3xl font-extrabold text-indigo-300 block mt-1 font-outfit flex items-baseline gap-1.5">
              {longestStreak}
              <span className="text-sm font-semibold text-gray-400">days</span>
            </span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1">your peak performance index</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-300">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Sync Status */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Git Synchronization</span>
            <span className="text-sm font-bold text-emerald-400 block mt-2 truncate max-w-[150px]">{stats?.repoName}</span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Auto-commits active
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
            <Github className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="glass p-6 rounded-2xl border border-dark-border">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
          <Calendar className="w-5 h-5 text-indigo-400" />
          Activity Heatmap
        </h3>
        {renderHeatmap()}
      </div>

      {/* Bottom Grid: Platform Split, Mastery & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic Mastery */}
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
            <Layers className="w-5 h-5 text-indigo-400" />
            Topic Mastery
          </h3>
          <div className="space-y-4">
            {coreTopics.map(topic => {
              const percentage = getMasteryPercentage(topic.name, topic.target);
              return (
                <div key={topic.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-300">{topic.name}</span>
                    <span className="font-bold text-indigo-400">{percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Share */}
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Platform Breakdown
          </h3>
          {platformChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs">
              No platform syncs logged yet.
            </div>
          )}
        </div>

        {/* Daily Planner Checklist */}
        <div className="glass p-6 rounded-2xl border border-dark-border flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            Today's Plan
          </h3>
          
          <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-grow px-3.5 py-2 rounded-xl bg-black/35 border border-dark-border text-white text-xs outline-none focus:border-indigo-500 transition-colors"
              placeholder="Add item (e.g. Solve 2 DP)..."
            />
            <button 
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/10"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="flex-grow space-y-2.5 overflow-y-auto max-h-[170px] pr-1">
            {pendingTasks.length > 0 ? (
              pendingTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.is_completed)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    task.is_completed 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-500 line-through' 
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                    task.is_completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-gray-500'
                  }`}>
                    {task.is_completed && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-medium truncate flex-grow">{task.task_description}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <p className="text-xs text-gray-500 font-medium">All tasks cleared for today!</p>
                <span className="text-[10px] text-indigo-400 font-semibold mt-1">Set goals to track streaks.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
