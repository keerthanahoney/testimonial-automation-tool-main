import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Plus, Inbox, Users, BarChart3, TrendingUp, Star, Search, 
  Calendar as CalendarIcon, Clock, Bell, Trash2, CheckCircle2, 
  ChevronLeft, ChevronRight, Filter, X, ChevronDown
} from "lucide-react";
import { useTestimonialStore } from "../store/testimonialStore";
import { useAuthStore } from "../store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import api from "../lib/axios";

const Dashboard: React.FC = () => {
  const { history, loadHistory } = useTestimonialStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date(2026, 3, 1)); // April 2026
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTotalCreatedModal, setShowTotalCreatedModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completedNotes, setCompletedNotes] = useState<Record<string, boolean>>({});
  const [isReminderEnabled, setIsReminderEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.id) {
      const isOriginalAccount = user.email === 'thavishisahithiiiii@gmail.com';
      
      // Notes
      let savedNotes = localStorage.getItem(`calendar_notes_${user.id}`);
      if (!savedNotes && isOriginalAccount) {
        savedNotes = localStorage.getItem('calendar_notes');
        if (savedNotes) localStorage.setItem(`calendar_notes_${user.id}`, savedNotes);
      }
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      
      // Completed Status
      let savedCompleted = localStorage.getItem(`calendar_completed_${user.id}`);
      if (!savedCompleted && isOriginalAccount) {
        savedCompleted = localStorage.getItem('calendar_completed');
        if (savedCompleted) localStorage.setItem(`calendar_completed_${user.id}`, savedCompleted);
      }
      if (savedCompleted) setCompletedNotes(JSON.parse(savedCompleted));
      
      // Reminders
      let savedReminders = localStorage.getItem(`calendar_reminders_${user.id}`);
      if (!savedReminders && isOriginalAccount) {
        savedReminders = localStorage.getItem('calendar_reminders');
        if (savedReminders) localStorage.setItem(`calendar_reminders_${user.id}`, savedReminders);
      }
      if (savedReminders) setIsReminderEnabled(JSON.parse(savedReminders));
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadHistory();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [loadHistory]);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const data = [];
    const startDate = new Date(2026, 3, 20); // April 20, 2026
    
    let d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (d <= today) {
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const currentDay = d.getDate();
      const currentMonth = d.getMonth();
      const currentYear = d.getFullYear();

      const count = (history || []).filter(item => {
        const itemDate = new Date(item.date || item.createdAt || '');
        if (isNaN(itemDate.getTime())) return false;
        
        return itemDate.getDate() === currentDay && 
               itemDate.getMonth() === currentMonth && 
               itemDate.getFullYear() === currentYear;
      }).length;

      data.push({ name: dateStr, testimonials: count });
      d.setDate(d.getDate() + 1);
    }
    return data;
  }, [history]);

  const pieData = useMemo(() => {
    return [5, 4, 3, 2, 1].map(r => ({ 
      name: `${r} Stars`, 
      value: (history || []).filter(i => i.rating === r).length,
      color: r === 5 ? "#10b981" : r === 4 ? "#fbbf24" : r === 3 ? "#f97316" : "#ef4444"
    }));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return (history || []).filter(item => {
      const itemDate = item.createdAt ? new Date(item.createdAt) : new Date(item.date || '');
      const matchesYear = filterYear === "all" || itemDate.getFullYear().toString() === filterYear;
      const matchesMonth = filterMonth === "all" || (itemDate.getMonth() + 1).toString() === filterMonth;
      const matchesRating = filterRating === "all" || (item.rating || "").toString() === filterRating;
      const matchesStatus = filterStatus === "all" || (filterStatus === "exported" ? item.isExported : !item.isExported);
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.name || "").toLowerCase().includes(query) || 
        (item.role || "").toLowerCase().includes(query) ||
        (item.company || "").toLowerCase().includes(query) ||
        (item.feedback || "").toLowerCase().includes(query);
      return matchesYear && matchesMonth && matchesRating && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date || '').getTime();
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date || '').getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [history, filterYear, filterMonth, filterRating, filterStatus, searchQuery, sortBy]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const avgRating = history?.length > 0 ? (history.reduce((a, b) => a + (b.rating || 0), 0) / history.length).toFixed(1) : '0.0';

  const resetFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterRating("all");
    setFilterStatus("all");
    setSortBy("newest");
  };

  const toggleReminder = (dateKey: string) => {
    const newReminders = { ...isReminderEnabled, [dateKey]: !isReminderEnabled[dateKey] };
    setIsReminderEnabled(newReminders);
    if (user?.id) localStorage.setItem(`calendar_reminders_${user.id}`, JSON.stringify(newReminders));
    toast.success(newReminders[dateKey] ? "Email reminder set! ✉️" : "Reminder disabled");
  };

  const toggleTaskStatus = (dateKey: string) => {
    const newCompleted = { ...completedNotes, [dateKey]: !completedNotes[dateKey] };
    setCompletedNotes(newCompleted);
    if (user?.id) localStorage.setItem(`calendar_completed_${user.id}`, JSON.stringify(newCompleted));
    toast.success(newCompleted[dateKey] ? "Task completed! 🎉" : "Task pending 📝");
  };

  const handleCloseModal = () => {
    if (selectedDate !== null) {
      const dateKey = new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString();
      const originalNote = notes[dateKey] || "";
      
      if (noteText !== originalNote) {
        if (!window.confirm("Changes may not be saved. Are you sure you want to close?")) {
          return;
        }
      }
    }
    setShowNoteModal(false);
    setSelectedDate(null);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDate !== null) {
          handleCloseModal();
        } else {
          setShowTotalCreatedModal(false);
          setShowFilters(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedDate, noteText, notes]);

  const handleSavePlanner = async () => {
    if (selectedDate === null) return;

    const dateKey = new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString();
    const newNotes = { ...notes, [dateKey]: noteText };
    setNotes(newNotes);
    if (user?.id) localStorage.setItem(`calendar_notes_${user.id}`, JSON.stringify(newNotes));

    // Real-time Email Alert
    if (isReminderEnabled[dateKey] && noteText.trim()) {
      const toastId = toast.loading("Dispatching email reminder...");
      try {
        await api.post("/reminders/send", { 
          email: user?.email, 
          note: noteText 
        });
        toast.success("Email reminder sent! ✉️", { id: toastId });
      } catch (err) {
        console.error("Email dispatch failed:", err);
        toast.error("Schedule saved, but email dispatch failed.", { id: toastId });
      }
    } else {
      toast.success("Schedule updated successfully! 📅");
    }

    handleCloseModal();
  };


  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-slate-950 px-8 py-4 lg:px-16 lg:py-6 transition-colors">
      {/* Filters Sidebar */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[380px] bg-white dark:bg-slate-900 shadow-2xl z-[70] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-6 h-6 text-blue-600" /> Filters
                </h2>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Time Period</p>
                   <div className="grid grid-cols-2 gap-3">
                      <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20">
                         <option value="all">All Years</option>
                         {Array.from({ length: 12 }, (_, i) => 2026 + i).map(y => (
                           <option key={y} value={y.toString()}>{y}</option>
                         ))}
                      </select>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20">
                         <option value="all">All Months</option>
                         {months.map((m, i) => (
                           <option key={m} value={i + 1} disabled={filterYear === "2026" && i < 3}>{m}</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Rating & Status</p>
                   <div className="grid grid-cols-2 gap-3">
                      <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20">
                         <option value="all">Any Rating</option>
                         {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                      </select>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20">
                         <option value="all">Any Status</option>
                         <option value="exported">Exported</option>
                         <option value="pending">Pending</option>
                      </select>
                   </div>
                </div>

                <div>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Sort By</p>
                   <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                      <button onClick={() => setSortBy("newest")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === "newest" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Newest</button>
                      <button onClick={() => setSortBy("oldest")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === "oldest" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Oldest</button>
                   </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5">
                <button onClick={resetFilters} className="w-full py-4 text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors">Reset All Filters</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Total Created Sidebar */}
      <AnimatePresence>
        {showTotalCreatedModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTotalCreatedModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[450px] bg-white dark:bg-slate-900 shadow-2xl z-[70] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Inbox className="w-7 h-7 text-blue-600" /> Testimonials
                </h2>
                <button onClick={() => setShowTotalCreatedModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-4">
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <div 
                      key={`total-item-${idx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs uppercase">
                              {item.name?.[0] || '?'}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{item.name || 'Anonymous'}</p>
                               <p className="text-[10px] font-medium text-slate-500">{item.role || 'Contributor'}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Apr 20')}
                            </p>
                            <p className="text-[9px] font-bold text-blue-500 mt-0.5">{item.time || '10:00 AM'}</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                          ))}
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                          item.isExported 
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                          {item.isExported ? 'Exported' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <p className="text-slate-500 font-bold">No testimonials created yet.</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={() => { setShowTotalCreatedModal(false); navigate('/wall'); }}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-xl shadow-black/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  View in Wall of Love
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, {user?.name || 'User'}</h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Here's what's happening with your testimonials today.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative z-50">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search testimonials..." 
                className="pl-11 pr-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-md text-sm font-bold text-slate-700 dark:text-white w-64 focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    document.getElementById('recent-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              />
              {searchQuery && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  {filteredHistory.length > 0 ? (
                    <div className="py-2">
                      <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50">
                        {filteredHistory.length} Results Found
                      </div>
                      {filteredHistory.map((item, idx) => (
                        <div 
                          key={`search-${item.id || idx}`}
                          onClick={() => document.getElementById('recent-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 cursor-pointer text-left w-full"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-black text-xs uppercase shrink-0">
                            {item.name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-[10px] font-medium text-slate-500 truncate">{item.role || 'Contributor'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm font-bold text-slate-500">
                      No results found
                    </div>
                  )}
                </div>
              )}
           </div>
           <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><Filter className="w-4 h-4" /> Filters</button>
           <Link to="/create" className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-lg font-bold shadow-xl shadow-black/5 dark:shadow-white/5 transition-all active:scale-95"><Plus className="w-4 h-4" /> Create Testimonial</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { id: 'total', label: "Total Created", value: (history?.length || 0).toString(), status: "Testimonials", color: "text-blue-500", icon: <Inbox className="w-5 h-5" /> },
            { id: 'pending', label: "Pending Review", value: (history || []).filter(i => !i.isExported).length.toString(), status: "Action Needed", color: "text-rose-500", icon: <Clock className="w-5 h-5" />, path: '/history' },
            { id: 'exported', label: "Exported Assets", value: (history || []).filter(i => i.isExported).length.toString(), status: "Completed", color: "text-emerald-500", icon: <CheckCircle2 className="w-5 h-5" />, path: '/settings', state: { activeTab: 'Download History' } },
            { id: 'schedules', label: "Active Schedules", value: Object.keys(notes).filter(k => notes[k] && !completedNotes[k]).length.toString(), status: "Upcoming", color: "text-amber-500", icon: <CalendarIcon className="w-5 h-5" />, scrollId: 'calendar-section' },
          ].map((stat, i) => (
            <div 
              key={i} 
              onClick={() => {
                if (stat.id === 'total') {
                  setShowTotalCreatedModal(true);
                } else if (stat.scrollId) {
                  document.getElementById(stat.scrollId)?.scrollIntoView({ behavior: 'smooth' });
                } else if (stat.path) {
                  navigate(stat.path, { state: stat.state });
                }
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-100 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                 <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 ${stat.color}`}>
                   {stat.icon}
                 </div>
                 <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
              
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
              
              <div className="mt-4 flex justify-end">
                 <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md ${stat.color.replace('text-', 'bg-').replace('500', '50/10')} ${stat.color}`}>
                   {stat.status}
                 </span>
              </div>
           </div>
         ))}
      </div>

      {/* Middle Row: Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-xl shadow-sm flex flex-col h-[380px]">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Growth Analytics</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Daily testimonial trends</p>
              </div>
              <div className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase">Since Apr 20</div>
           </div>
           <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="testimonials" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTrend)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-xl shadow-sm flex flex-col h-[380px]">
           <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center lg:text-left">Rating Distribution</h2>
           <div className="flex-1 flex flex-row items-center justify-center gap-10">
              <div className="w-[180px] h-[180px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                           {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                     <span className="text-2xl font-black text-slate-900 dark:text-white">{avgRating}</span>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Average</span>
                  </div>
              </div>
              
              <div className="flex flex-col gap-3">
                 {[5, 4, 3, 2, 1].map(r => (
                   <div key={r} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ backgroundColor: r >= 4 ? "#10b981" : r === 3 ? "#fbbf24" : "#ef4444" }} />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 w-5">{r}★</span>
                      <span className="text-[10px] font-bold text-slate-400">({(history || []).filter(i => i.rating === r).length} entries)</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Row: Activity and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div id="recent-activity" className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-8 shadow-sm h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-black text-slate-900 dark:text-white">
                 {searchQuery ? "Search Results" : "Recent Activity"}
               </h2>
               {searchQuery && (
                 <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full">
                   {filteredHistory.length} found
                 </span>
               )}
            </div>
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                        <th className="pb-4 pl-4">Name / Title</th>
                        <th className="pb-4">Date</th>
                        <th className="pb-4 text-right pr-4">Visit</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                     {(searchQuery ? filteredHistory : filteredHistory.slice(0, 10)).map((item, index) => {
                        const isPending = !item.isExported;
                        return (
                          <tr 
                            key={`history-${item.id || index}`} 
                            className={`group transition-all duration-300 border-l-4 ${
                              isPending 
                                ? "bg-red-50/20 dark:bg-red-500/5 border-red-500" 
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent"
                            }`}
                          >
                             <td className="py-4 pl-4">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] uppercase transition-colors ${
                                     isPending 
                                       ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-500/20" 
                                       : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                   }`}>
                                     {item.name?.[0] || '?'}
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                                        {isPending && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[8px] font-black uppercase tracking-tighter">Pending</span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 font-medium">{item.role || 'Contributor'}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                                {item.createdAt 
                                  ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : (item.date || 'Apr 20, 2026')}
                             </td>
                             <td className="py-4 text-right pr-4">
                                <Link to="/history" className={`inline-block p-2 rounded-lg transition-all ${
                                  isPending ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                }`}>
                                  <ChevronRight className="w-5 h-5" />
                                </Link>
                             </td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
               {searchQuery && filteredHistory.length === 0 && (
                 <div className="text-center py-12">
                   <p className="text-slate-500 dark:text-slate-400 font-medium">No testimonials found matching "{searchQuery}"</p>
                 </div>
               )}
            </div>
         </div>

         <div id="calendar-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-8 shadow-sm h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-black text-slate-900 dark:text-white">Calendar</h2>
               <div className="flex items-center gap-2">
                  <div className="relative">
                    <select 
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-3 py-1.5 pr-8 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
                      value={displayDate.getMonth()}
                      onChange={(e) => setDisplayDate(new Date(displayDate.getFullYear(), parseInt(e.target.value), 1))}
                    >
                       {months.map((m, i) => (
                         <option key={m} value={i} disabled={displayDate.getFullYear() === 2026 && i < 3}>{m}</option>
                       ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-3 py-1.5 pr-8 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
                      value={displayDate.getFullYear()}
                      onChange={(e) => setDisplayDate(new Date(parseInt(e.target.value), displayDate.getMonth(), 1))}
                    >
                       {Array.from({ length: 10 }, (_, i) => 2026 + i).map(y => (
                         <option key={y} value={y}>{y}</option>
                       ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6 font-black text-xs">
               <Clock className="w-4 h-4" /> {formattedTime}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`day-${i}`} className="text-[10px] font-black text-slate-400 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1">
               {Array.from({ length: firstDayOfMonth(displayDate.getFullYear(), displayDate.getMonth()) }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
               {Array.from({ length: daysInMonth(displayDate.getFullYear(), displayDate.getMonth()) }).map((_, i) => {
                 const d = i + 1;
                 const dateKey = new Date(displayDate.getFullYear(), displayDate.getMonth(), d).toDateString();
                 const hasNote = notes[dateKey];
                 const isCompleted = completedNotes[dateKey];
                 
                 const checkDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), d);
                 const today = new Date();
                 today.setHours(0,0,0,0);
                 const isPast = checkDate < today;

                 return (
                   <div 
                    key={d} 
                    onClick={() => { 
                      if (isPast) {
                        toast.error("You can only plan for today or future dates!");
                        return;
                      }
                      setSelectedDate(d); 
                      setNoteText(notes[dateKey] || ""); 
                      setShowNoteModal(true); 
                    }} 
                    className={`relative aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${isPast ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'} ${d === currentTime.getDate() && displayDate.getMonth() === currentTime.getMonth() ? 'bg-amber-100 text-amber-900 shadow-sm shadow-amber-200/50' : selectedDate === d ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}
                   >
                     {d}
                     <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${hasNote ? (isCompleted ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
                   </div>
                 );
               })}
            </div>
         </div>
      </div>

      {/* Unified Activity Sidebar (Attached to Right) */}
      <AnimatePresence>
        {selectedDate !== null && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-[55] pointer-events-auto"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[450px] bg-white dark:bg-slate-900 shadow-[-20px_0_60px_rgba(0,0,0,0.1)] border-l border-slate-100 dark:border-white/10 z-[65] p-10 flex flex-col pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Activity Planner</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{months[displayDate.getMonth()]} {selectedDate}, {displayDate.getFullYear()}</p>
                  </div>
                </div>
                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-thin">
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Task Details</p>
                  <textarea 
                    value={noteText} onChange={(e) => setNoteText(e.target.value)} 
                    placeholder="Describe your activity or set a goal..." 
                    className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-xl p-8 text-base font-bold text-slate-700 dark:text-white outline-none resize-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Notifications & Status</p>
                  
                  {/* Email Toggle */}
                  {!completedNotes[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${isReminderEnabled[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Email Reminder</p>
                          <p className="text-[11px] text-slate-400 font-medium">Get a ping in your inbox</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleReminder(new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString())}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isReminderEnabled[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isReminderEnabled[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </motion.div>
                  )}

                  {/* Mark Completed Toggle */}
                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${completedNotes[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Mark Completed</p>
                        <p className="text-[11px] text-slate-400 font-medium">Finished this task?</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleTaskStatus(new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString())}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${completedNotes[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${completedNotes[new Date(displayDate.getFullYear(), displayDate.getMonth(), selectedDate).toDateString()] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-10">
                <button 
                  onClick={handleSavePlanner}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-base shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6" /> Save Activity Plan
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
