import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Trophy, Plus, RefreshCw, BarChart2, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ContestType {
  id: number;
  platform: string;
  contest_name: string;
  rank: number;
  rating_after: number | null;
  solved_count: number | null;
  contest_date: string;
}

const ContestsView: React.FC = () => {
  const { token, backendUrl } = useAuth();
  const [contests, setContests] = useState<ContestType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [platform, setPlatform] = useState('Codeforces');
  const [contestName, setContestName] = useState('');
  const [rank, setRank] = useState('');
  const [ratingAfter, setRatingAfter] = useState('');
  const [solvedCount, setSolvedCount] = useState('');
  const [contestDate, setContestDate] = useState(new Date().toISOString().split('T')[0]);

  const [activePlatformFilter, setActivePlatformFilter] = useState('All');

  // Fetch contests
  const fetchContests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/contests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, [token, backendUrl]);

  // Log contest
  const handleLogContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestName.trim() || !rank) return;

    try {
      const res = await fetch(`${backendUrl}/api/contests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          contestName: contestName.trim(),
          rank: parseInt(rank),
          ratingAfter: ratingAfter ? parseInt(ratingAfter) : null,
          solvedCount: solvedCount ? parseInt(solvedCount) : null,
          contestDate
        })
      });
      if (res.ok) {
        const newContest = await res.json();
        setContests(prev => [newContest, ...prev].sort((a, b) => b.contest_date.localeCompare(a.contest_date)));
        // Reset form
        setContestName('');
        setRank('');
        setRatingAfter('');
        setSolvedCount('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-300">Loading Contest History...</h3>
      </div>
    );
  }

  // Filtered contests
  const filteredContests = contests.filter(c => 
    activePlatformFilter === 'All' ? true : c.platform === activePlatformFilter
  );

  // Generate chart data: Sort contests chronologically, filter out entries without ratings
  const chartData = [...contests]
    .filter(c => c.rating_after !== null && (activePlatformFilter === 'All' ? true : c.platform === activePlatformFilter))
    .sort((a, b) => a.contest_date.localeCompare(b.contest_date))
    .map(c => ({
      name: c.contest_name.slice(0, 15) + (c.contest_name.length > 15 ? '...' : ''),
      Rating: c.rating_after,
      date: new Date(c.contest_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

  const platforms = ['Codeforces', 'CodeChef', 'LeetCode', 'AtCoder'];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">Contest Tracking</h2>
        <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-indigo-400" />
          Log contest performances and monitor rating progressions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log contest card */}
        <div className="glass p-6 rounded-2xl border border-dark-border h-fit">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
            <Plus className="w-5 h-5 text-indigo-400" />
            Log Contest Results
          </h3>
          <form onSubmit={handleLogContest} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Platform</label>
              <select 
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              >
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Contest Name</label>
              <input 
                type="text" 
                required
                value={contestName}
                onChange={(e) => setContestName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Weekly Contest 392"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Your Rank</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 240"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Solved Count</label>
                <input 
                  type="number" 
                  min={0}
                  value={solvedCount}
                  onChange={(e) => setSolvedCount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 3"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Rating After</label>
                <input 
                  type="number" 
                  value={ratingAfter}
                  onChange={(e) => setRatingAfter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 1850"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Contest Date</label>
                <input 
                  type="date" 
                  required
                  value={contestDate}
                  onChange={(e) => setContestDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4.5 h-4.5" />
              Log Contest Record
            </button>
          </form>
        </div>

        {/* Chart and Table grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rating progression chart */}
          <div className="glass p-6 rounded-2xl border border-dark-border">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                Rating History Graph
              </h3>
              
              {/* Filter Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-semibold">
                {['All', ...platforms].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActivePlatformFilter(tab)}
                    className={`py-1.5 px-3 rounded-lg transition-colors ${
                      activePlatformFilter === tab 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="Rating" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs text-center py-12">
                <p>No contest ratings to plot.</p>
                <span className="text-[10px] text-gray-600 mt-1">Make sure you log contest records and input "Rating After" values.</span>
              </div>
            )}
          </div>

          {/* Table of past contests */}
          <div className="glass p-6 rounded-2xl border border-dark-border">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-400" />
              Contest History Records
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                    <th className="pb-3 pr-2">Platform</th>
                    <th className="pb-3 pr-2">Contest Name</th>
                    <th className="pb-3 pr-2 text-center">Rank</th>
                    <th className="pb-3 pr-2 text-center">Solved</th>
                    <th className="pb-3 pr-2 text-center">New Rating</th>
                    <th className="pb-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-xs">
                  {filteredContests.length > 0 ? (
                    filteredContests.map(c => {
                      let tagColor = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                      if (c.platform === 'Codeforces') tagColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      else if (c.platform === 'CodeChef') tagColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                      else if (c.platform === 'LeetCode') tagColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      else if (c.platform === 'AtCoder') tagColor = 'bg-red-500/10 text-red-400 border-red-500/20';

                      return (
                        <tr key={c.id} className="text-gray-300 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 pr-2">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${tagColor}`}>
                              {c.platform}
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 font-semibold text-white max-w-[200px] truncate" title={c.contest_name}>
                            {c.contest_name}
                          </td>
                          <td className="py-3.5 pr-2 text-center font-bold">{c.rank}</td>
                          <td className="py-3.5 pr-2 text-center text-gray-400">{c.solved_count ?? '-'}</td>
                          <td className="py-3.5 pr-2 text-center text-indigo-400 font-bold">{c.rating_after ?? '-'}</td>
                          <td className="py-3.5 text-right text-gray-500 font-semibold">
                            {new Date(c.contest_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No logged contests match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestsView;
