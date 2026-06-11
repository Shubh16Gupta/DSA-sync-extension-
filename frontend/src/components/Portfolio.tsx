import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Github, 
  Layers, 
  Code, 
  Calendar, 
  Cpu, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface PortfolioDataType {
  username: string;
  repoName: string;
  joinedAt: string;
  totalSolved: number;
  difficultyStats: { Easy: number; Medium: number; Hard: number };
  platformStats: Record<string, number>;
  topicStats: Record<string, number>;
  recentSolutions: Array<{
    id: number;
    platform: string;
    problem_id: string;
    problem_title: string;
    problem_url: string;
    difficulty: string;
    language: string;
    solved_at: string;
  }>;
  heatmap: Array<{ date: string; count: number }>;
}

const COLORS = {
  Easy: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5',
  Medium: 'text-amber-400 border-amber-500/25 bg-amber-500/5',
  Hard: 'text-red-400 border-red-500/25 bg-red-500/5'
};

const PortfolioView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<PortfolioDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = 'http://localhost:5000'; // Standard API Host

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    
    fetch(`${backendUrl}/api/portfolio/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Profile not found or server offline.');
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  // Heatmap rendering logic
  const renderHeatmap = () => {
    if (!data) return null;

    const solvedMap: Record<string, number> = {};
    data.heatmap.forEach(h => {
      const dStr = new Date(h.date).toISOString().split('T')[0];
      solvedMap[dStr] = h.count;
    });

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const tempDate = new Date(startDate);
    const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

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
      if (weeks.length > 53) break;
    }

    return (
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-[700px] select-none">
          <div className="grid grid-rows-7 text-[10px] text-gray-500 font-semibold pr-2 pt-4 justify-between h-[110px] w-8">
            {dayLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                {week.map((day, dIdx) => {
                  let colorClass = 'bg-[#181d2d]'; 
                  if (day.count === 1) colorClass = 'bg-indigo-950/80 border border-indigo-800/30';
                  else if (day.count === 2) colorClass = 'bg-indigo-800/50';
                  else if (day.count === 3) colorClass = 'bg-indigo-600/70';
                  else if (day.count >= 4) colorClass = 'bg-indigo-500';

                  return (
                    <div
                      key={dIdx}
                      className={`w-[13px] h-[13px] rounded-[2px] ${colorClass}`}
                      title={`${day.dateStr}: ${day.count} solved`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070f] text-gray-200">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold">Loading public portfolio scorecard...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070f] text-center px-4">
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 mb-4 text-2xl">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-white font-outfit">Portfolio Not Found</h3>
        <p className="text-gray-400 text-sm mt-1">{error || 'This user profile has not been initialized or the backend server is offline.'}</p>
        <a href="/" className="mt-6 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
          Go to Dashboard
        </a>
      </div>
    );
  }

  const joinDate = new Date(data.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-[#05070f] text-gray-100 py-10 px-4 md:px-8 relative">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="glass p-6 md:p-8 rounded-2xl border border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-indigo-500/30 text-white text-2xl font-bold font-outfit shadow-lg shadow-indigo-500/15">
              {data.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight leading-none">{data.username}</h1>
              <span className="text-xs text-indigo-400 font-semibold mt-2 block tracking-wider uppercase">DSA Coding Portfolio</span>
              <span className="text-[10px] text-gray-500 font-semibold block mt-1">Tracking solutions since {joinDate}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a 
              href={`https://github.com/${data.username}/${data.repoName}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Github className="w-4 h-4" />
              <span>Verify Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Scorecard Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Solved</span>
              <span className="text-2xl font-extrabold text-white block mt-1 font-outfit">{data.totalSolved}</span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Code className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Easy Solves</span>
              <span className="text-2xl font-extrabold text-emerald-400 block mt-1 font-outfit">{data.difficultyStats.Easy}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Medium Solves</span>
              <span className="text-2xl font-extrabold text-amber-500 block mt-1 font-outfit">{data.difficultyStats.Medium}</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Hard Solves</span>
              <span className="text-2xl font-extrabold text-red-400 block mt-1 font-outfit">{data.difficultyStats.Hard}</span>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-outfit uppercase tracking-wider">
            <Calendar className="w-4.5 h-4.5 text-indigo-400" />
            Yearly Coding Heatmap
          </h3>
          {renderHeatmap()}
        </div>

        {/* Bottom Split: Platforms, Topics & Recent Solutions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Platforms & Topics */}
          <div className="lg:col-span-1 space-y-6">
            {/* Platforms */}
            <div className="glass p-6 rounded-2xl border border-dark-border">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-outfit uppercase tracking-wider">
                <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                Platforms Split
              </h3>
              <div className="space-y-3">
                {Object.entries(data.platformStats).length > 0 ? (
                  Object.entries(data.platformStats).map(([plat, count]) => (
                    <div key={plat} className="flex justify-between items-center text-xs p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="font-semibold text-gray-300">{plat}</span>
                      <span className="font-bold text-indigo-400">{count} solved</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">No platform counts synced.</p>
                )}
              </div>
            </div>

            {/* Topics */}
            <div className="glass p-6 rounded-2xl border border-dark-border">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-outfit uppercase tracking-wider">
                <Layers className="w-4.5 h-4.5 text-indigo-400" />
                Expertise Tags
              </h3>
              <div className="space-y-3 text-xs">
                {Object.entries(data.topicStats).length > 0 ? (
                  Object.entries(data.topicStats).slice(0, 5).map(([name, count]) => {
                    const percentage = Math.min(Math.round((count / 15) * 100), 100);
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-300">{name}</span>
                          <span className="font-bold text-indigo-400">{percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">No tags recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Recent Solutions */}
          <div className="lg:col-span-2 glass p-6 rounded-2xl border border-dark-border">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-outfit uppercase tracking-wider">
              <Code className="w-4.5 h-4.5 text-indigo-400" />
              Recent Synced Solutions
            </h3>
            
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {data.recentSolutions.length > 0 ? (
                data.recentSolutions.map(sol => (
                  <div key={sol.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] px-2 py-0.5 rounded-full border bg-white/5 text-gray-400 border-white/10 uppercase font-semibold">
                          {sol.platform}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${COLORS[sol.difficulty as keyof typeof COLORS] || 'text-gray-400'}`}>
                          {sol.difficulty}
                        </span>
                      </div>
                      <a 
                        href={sol.problem_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-white hover:text-indigo-300 flex items-center gap-1 transition-colors mt-1"
                      >
                        <span className="truncate">{sol.problem_title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <span className="text-[10px] text-gray-500 block font-semibold">Code Language: {sol.language}</span>
                    </div>

                    <span className="text-[10px] text-gray-500 font-semibold self-end sm:self-center">
                      {new Date(sol.solved_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-6 text-center">No recent solutions logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-600 pt-6">
          DSA Sync public scores page. Built for developers.
        </div>
      </div>
    </div>
  );
};

export default PortfolioView;
