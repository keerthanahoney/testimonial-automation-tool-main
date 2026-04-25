import React from 'react';
import { useTestimonialStore } from '../store/testimonialStore';
import { Trash2, Edit, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const HistoryPage: React.FC = () => {
  const { history, removeFromHistory, updateData, setStep, loadHistory } = useTestimonialStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (item: any) => {
    // Populate store with item data
    updateData(item);
    setStep(1); // Go to edit step
    navigate('/create');
    toast.info("Editing testimonial...");
  };

  const handleDelete = (index: number) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      removeFromHistory(index);
      toast.success("Testimonial deleted");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">History</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and edit your previous testimonials.</p>
      </div>

      {history.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item, i) => {
            const isPending = !item.isExported;
            return (
              <div 
                key={i} 
                className={`group relative bg-card rounded-2xl border transition-all p-5 flex flex-col justify-between border-l-4 ${
                  isPending 
                    ? "border-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.1)] hover:bg-red-50/5 border-l-red-500" 
                    : "border-border hover:border-blue-300 hover:shadow-md border-l-emerald-500"
                }`}
              >
                <div>
                  <p className="text-sm italic text-foreground line-clamp-4 mb-4">"{item.feedback}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isPending ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{item.name || 'Anonymous'}</h4>
                      {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {item.isExported ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200">
                      Exported
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
                      Pending
                    </span>
                  )}
                </div>
              
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-300" /> {item.date || 'Apr 20, 2026'}
                    </div>
                    <div className="flex items-center gap-1 text-slate-200 dark:text-slate-700">•</div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" /> {item.time || '10:00 AM'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(i)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border text-center border-border border-dashed rounded-2xl p-12">
           <h3 className="text-lg font-medium text-foreground mb-2">No history found</h3>
           <p className="text-muted-foreground mb-6">You haven't created any testimonials yet!</p>
           <button onClick={() => navigate('/create')} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-50 transition-all font-bold shadow-xl shadow-black/5 dark:shadow-white/5">
             Create Now
           </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
