import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { BarChart3, TrendingUp, HelpCircle, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';

interface StatsType {
  totalSolved: number;
  difficultyStats: { Easy: number; Medium: number; Hard: number };
  platformStats: Record<string, number>;
  topicStats: Record<string, number>;
  heatmap: Array<{ date: string; count: number }>;
}

const COLORS = {
  Easy: '#10b981',   // Emerald Green
  Medium: '#f59e0b', // Amber Yellow
  Hard: '#ef4444'     // Rose Red
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsView: React.FC = () => {
  const { token, backendUrl } = useAuth();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${backendUrl}/api/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setStats(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token, backendUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-300">Loading Analytics...</h3>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">Failed to load statistics.</p>
      </div>
    );
  }

  // 1. Difficulty distribution data
  const diffData = [
    { name: 'Easy', value: stats.difficultyStats.Easy },
    { name: 'Medium', value: stats.difficultyStats.Medium },
    { name: 'Hard', value: stats.difficultyStats.Hard }
  ].filter(d => d.value > 0);

  // 2. Platform Solve Share data
  const platformData = Object.entries(stats.platformStats).map(([name, value]) => ({
    name,
    value
  }));

  // 3. Topic data (sort to show most practiced first)
  const topicData = Object.entries(stats.topicStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Show top 10

  // 4. Monthly Solve Progression (Group heatmap data by month)
  // Let's create a list of the last 6 months dynamically
  const monthlyMap: Record<string, number> = {};
  stats.heatmap.forEach(item => {
    const d = new Date(item.date);
    const monthStr = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + item.count;
  });

  // Convert map to array and sort chronologically (since it's a sliding 365 days window, sort by Date object)
  const monthOrder = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const trendData = Object.entries(monthlyMap)
    .map(([month, count]) => {
      const [mName, yNum] = month.split(' ');
      const mIdx = monthOrder.indexOf(mName);
      const year = parseInt(yNum);
      const sortingVal = year * 12 + mIdx;
      return { month, count, sortingVal };
    })
    .sort((a, b) => a.sortingVal - b.sortingVal)
    .map(item => ({ month: item.month, Solved: item.count }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">Progress Analytics</h2>
        <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          Interactive charts detailing your algorithmic strength and patterns.
        </p>
      </div>

      {/* Main Grid: Difficulty and Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Distribution */}
        <div className="glass p-6 rounded-2xl border border-dark-border flex flex-col justify-between">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <HelpCircle className="w-4.5 h-4.5 text-indigo-400" />
            Difficulty Breakdown
          </h3>
          {diffData.length > 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diffData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {diffData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs font-semibold w-full">
                {diffData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[d.name as keyof typeof COLORS] }}></span>
                    <span className="text-gray-300">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-500 text-xs py-12">
              Sync a problem to view difficulty stats.
            </div>
          )}
        </div>

        {/* Monthly Solve Trend */}
        <div className="glass p-6 rounded-2xl border border-dark-border lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
            Monthly Progress Trend
          </h3>
          {trendData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Solved" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSolved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-xs">
              No historic trends available yet.
            </div>
          )}
        </div>
      </div>

      {/* Topics and Platforms Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Practiced Topics */}
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-indigo-400" />
            Top 10 Practiced Topics
          </h3>
          {topicData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500 text-xs">
              Categorized solutions will appear here.
            </div>
          )}
        </div>

        {/* Platform Share Split */}
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            Platform Volume Split
          </h3>
          {platformData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                    {platformData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500 text-xs">
              No platform statistics logged.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
