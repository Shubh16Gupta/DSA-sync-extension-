import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { CalendarDays, Plus, Check, Trash2, CheckSquare, ListTodo, RefreshCw, Calendar } from 'lucide-react';

interface TaskType {
  id: number;
  task_description: string;
  target_date: string;
  is_completed: boolean;
}

const PlannerView: React.FC = () => {
  const { token, backendUrl } = useAuth();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [descInput, setDescInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks
  const fetchTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/planner`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, backendUrl]);

  // Toggle completion
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descInput.trim() || !dateInput) return;

    try {
      const res = await fetch(`${backendUrl}/api/planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: descInput.trim(),
          date: dateInput
        })
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask].sort((a, b) => a.target_date.localeCompare(b.target_date)));
        setDescInput('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/planner/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-300">Loading Planner...</h3>
      </div>
    );
  }

  // Segment tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.target_date === todayStr);
  const upcomingTasks = tasks.filter(t => t.target_date > todayStr);
  const pastTasks = tasks.filter(t => t.target_date < todayStr);

  const completedToday = todayTasks.filter(t => t.is_completed).length;
  const progressPercent = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">Daily Planner</h2>
        <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-indigo-400" />
          Define practice agendas, track milestones, and maintain coding schedules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planner controls / Add goal */}
        <div className="glass p-6 rounded-2xl border border-dark-border h-fit">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-outfit">
            <ListTodo className="w-5 h-5 text-indigo-400" />
            Create Target Goal
          </h3>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <input 
                type="text" 
                required
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Solve 2 binary search problems"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Date</label>
              <input 
                type="date" 
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 border border-dark-border text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Target to List
            </button>
          </form>
          
          {/* Today's Stats Progress */}
          {todayTasks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-dark-border space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Today's Progress</span>
                <span className="text-indigo-400">{completedToday} / {todayTasks.length} Done ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Task Lists (Today, Upcoming, History) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <div className="glass p-6 rounded-2xl border border-dark-border">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-indigo-400" />
              Today's Targets ({todayTasks.length})
            </h3>
            <div className="space-y-2.5">
              {todayTasks.length > 0 ? (
                todayTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                      task.is_completed 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-500 line-through' 
                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div 
                      onClick={() => handleToggleTask(task.id, task.is_completed)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border cursor-pointer ${
                        task.is_completed 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-gray-500 hover:border-indigo-400'
                      }`}
                    >
                      {task.is_completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-sm font-medium flex-grow truncate">{task.task_description}</span>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">No tasks scheduled for today. Add a goal to start practicing!</p>
              )}
            </div>
          </div>

          {/* Upcoming & History split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Targets */}
            <div className="glass p-5 rounded-2xl border border-dark-border">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Upcoming Targets
              </h3>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map(task => (
                    <div key={task.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-300 truncate">{task.task_description}</span>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-semibold">{new Date(task.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">No upcoming tasks scheduled.</p>
                )}
              </div>
            </div>

            {/* History logs */}
            <div className="glass p-5 rounded-2xl border border-dark-border">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-gray-500" />
                History Checklist
              </h3>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {pastTasks.length > 0 ? (
                  pastTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                        task.is_completed 
                          ? 'bg-emerald-500/5 border-emerald-500/10 text-gray-500 line-through' 
                          : 'bg-red-500/5 border-red-500/10 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border ${
                          task.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-500'
                        }`}>
                          {task.is_completed && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="text-xs truncate font-medium">{task.task_description}</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-semibold flex-shrink-0">
                        {new Date(task.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">No past planner entries.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerView;
