import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { FileText, Download, Award, ShieldAlert, Cpu, Sparkles, RefreshCw, Github } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface StatsType {
  githubUsername: string;
  repoName: string;
  totalSolved: number;
  difficultyStats: { Easy: number; Medium: number; Hard: number };
  platformStats: Record<string, number>;
  topicStats: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
}

const ResumeView: React.FC = () => {
  const { token, backendUrl } = useAuth();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  // Export card to PDF
  const handleExportPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      setIsExporting(true);
      // Wait a moment for any render processes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090d16',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;
      
      // Center image in PDF
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(imgData, 'PNG', x, y, width, height);
      pdf.save(`DSA_Sync_${stats?.githubUsername}_Resume.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Could not export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-300">Compiling Scorecard Resume...</h3>
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

  // Dynamic achievement badges based on solved metrics
  const achievements = [];
  if (stats.totalSolved >= 1) achievements.push({ title: 'Initiated Solver', desc: 'Solved first DSA problem', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' });
  if (stats.totalSolved >= 50) achievements.push({ title: 'Algorithmic Knight', desc: 'Solved 50+ problems', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' });
  if (stats.totalSolved >= 150) achievements.push({ title: 'Grandmaster Codebase', desc: 'Solved 150+ problems', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' });
  
  if (stats.longestStreak >= 7) achievements.push({ title: 'Weekly Warrior', desc: 'Maintained a 7-day streak', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' });
  if (stats.longestStreak >= 30) achievements.push({ title: 'Streak Paragon', desc: 'Maintained a 30-day streak', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' });

  // Topic masteries check
  const dpCount = stats.topicStats['Dynamic Programming'] || stats.topicStats['DP'] || 0;
  if (dpCount >= 5) achievements.push({ title: 'DP Architect', desc: 'Solved 5+ Dynamic Programming targets', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' });

  const graphCount = stats.topicStats['Graph'] || stats.topicStats['Graphs'] || 0;
  if (graphCount >= 5) achievements.push({ title: 'Graph Oracle', desc: 'Solved 5+ Graph targets', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' });

  if (achievements.length === 0) {
    achievements.push({ title: 'Getting Started', desc: 'Solve questions to unlock achievements', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">Resume Mode</h2>
          <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            Generate a standardized developer scorecard of your coding credentials.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? 'Generating PDF...' : 'Download Coding Resume'}
        </button>
      </div>

      {/* Center PDF Preview Card */}
      <div className="flex justify-center py-4">
        {/* We restrict the width to look exactly like an A4 layout */}
        <div 
          ref={printRef}
          className="w-full max-w-[700px] bg-[#090d16] border border-dark-border rounded-2xl p-8 shadow-2xl space-y-6 text-gray-300 font-sans"
          id="resume-pdf-card"
        >
          {/* Resume Header */}
          <div className="flex justify-between items-start border-b border-dark-border pb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white font-outfit leading-none tracking-tight">{stats.githubUsername}</h1>
              <span className="text-xs text-indigo-400 font-semibold mt-1.5 block tracking-wider uppercase">DSA Coding Portfolio</span>
              
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3 font-semibold">
                <Github className="w-3.5 h-3.5" />
                <span>github.com/{stats.githubUsername}/{stats.repoName}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-bold text-white font-outfit">🔄 DSA Sync</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mt-1">Verified Coding Scorecard</div>
            </div>
          </div>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-3 gap-4 border-b border-dark-border pb-6">
            <div className="text-center p-3.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Solved</span>
              <span className="text-2xl font-extrabold text-white block mt-0.5 font-outfit">{stats.totalSolved}</span>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Current Streak</span>
              <span className="text-2xl font-extrabold text-orange-400 block mt-0.5 font-outfit">{stats.currentStreak}d</span>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Longest Streak</span>
              <span className="text-2xl font-extrabold text-indigo-300 block mt-0.5 font-outfit">{stats.longestStreak}d</span>
            </div>
          </div>

          {/* Difficulty and Platform Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-dark-border pb-6">
            {/* Difficulty */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-outfit">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                Difficulty Index
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">Easy</span>
                  <span className="font-bold text-white">{stats.difficultyStats.Easy}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.totalSolved ? (stats.difficultyStats.Easy / stats.totalSolved) * 100 : 0}%` }}></div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-amber-500 font-semibold">Medium</span>
                  <span className="font-bold text-white">{stats.difficultyStats.Medium}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.totalSolved ? (stats.difficultyStats.Medium / stats.totalSolved) * 100 : 0}%` }}></div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-red-500 font-semibold">Hard</span>
                  <span className="font-bold text-white">{stats.difficultyStats.Hard}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${stats.totalSolved ? (stats.difficultyStats.Hard / stats.totalSolved) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-outfit">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Coding Platforms Split
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(stats.platformStats).length > 0 ? (
                  Object.entries(stats.platformStats).map(([plat, val]) => (
                    <div key={plat} className="p-2 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center">
                      <span className="font-semibold text-gray-400">{plat}</span>
                      <span className="font-bold text-white">{val}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 col-span-2">No platforms logged.</p>
                )}
              </div>
            </div>
          </div>

          {/* Topic Mastery and Skill Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-dark-border pb-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-outfit">
                <Award className="w-4 h-4 text-indigo-400" />
                Topic Mastery Index
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.entries(stats.topicStats).length > 0 ? (
                  Object.entries(stats.topicStats).slice(0, 6).map(([name, count]) => {
                    const percentage = Math.min(Math.round((count / 15) * 100), 100);
                    return (
                      <div key={name} className="flex flex-col gap-1 py-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-gray-400 truncate max-w-[80px]">{name}</span>
                          <span className="font-bold text-white">{percentage}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 col-span-2">No topics logged.</p>
                )}
              </div>
            </div>

            {/* Achievements badges */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-outfit">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Verified Achievements
              </h3>
              <div className="flex flex-wrap gap-2">
                {achievements.map((ach, idx) => (
                  <div 
                    key={idx} 
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex flex-col ${ach.color}`}
                  >
                    <span>{ach.title}</span>
                    <span className="text-[8px] opacity-70 mt-0.5 font-medium">{ach.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
            Generated automatically via DSA Sync platform tracker &bull; verified credentials
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeView;
