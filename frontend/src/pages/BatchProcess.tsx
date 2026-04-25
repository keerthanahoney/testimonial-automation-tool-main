import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, ArrowLeft, Image as ImageIcon, X, Sparkles, FileText, Code } from 'lucide-react';
import { extractFeedbackFromImage } from '../lib/gemini';
import { templateMap } from '../components/TestimonialTemplates';
import type { TestimonialData, TemplateName } from '../types/testimonial';
import { useTestimonialStore } from '../store/testimonialStore';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const BatchProcess: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { addToHistory, addToDownloadHistory, checkDuplicateHash } = useTestimonialStore();

  const generateHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  useEffect(() => {
    if (user && (!user.businessName || !user.businessType)) {
      const isOriginalAccount = user.email === 'thavishisahithiiiii@gmail.com';
      const hasHistory = localStorage.getItem(`testimonial_history_${user.id}`) || (isOriginalAccount && localStorage.getItem('testimonial_history'));
      
      if (!hasHistory) {
        toast.error("Please complete your business details to start batch processing!");
        navigate('/settings', { replace: true, state: { missingInfo: true } });
      }
    }
  }, [user, navigate]);

  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [batchData, setBatchData] = useState<{ id: string; image: string; data: TestimonialData }[]>([]);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  
  const [globalTemplate, setGlobalTemplate] = useState<TemplateName>('minimal');
  const [customization, setCustomization] = useState({
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    customBackgroundColor: '',
    customTextColor: '',
  });

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleQueueFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setQueuedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFileFromQueue = (index: number) => {
    setQueuedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const executeBatchExtraction = async () => {
    if (queuedFiles.length === 0) {
       toast.error("Please upload images first!");
       return;
    }
    
    setIsProcessing(true);
    setStep(1);
    
    const results = [];
    
    for (let i = 0; i < queuedFiles.length; i++) {
       const file = queuedFiles[i];
       setProgressMsg(`AI is analyzing image ${i + 1} of ${queuedFiles.length}...`);
       
       try {
         const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
         });

         const hash = generateHash(base64);
         if (checkDuplicateHash(hash)) {
            toast.info(`Image ${i + 1} skipped - already processed!`);
            continue;
         }

         const result = await extractFeedbackFromImage(base64, file.type || "image/png");
         const itemId = `testimonial_batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
         
         results.push({
           id: itemId,
           image: base64,
           data: {
             feedback: result.feedback || 'No text extracted',
             time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
             date: result.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
             name: result.name || `Customer ${i + 1}`,
             role: result.role || '',
             company: result.company || '',
             websiteUrl: '',
             linkedinUrl: '',
             socialLink: '',
             profileImage: null,
             tone: result.tone || 'Friendly',
             rating: result.rating || 5,
             tag: 'testimonial',
             id: itemId,
             imageHash: hash,
             ...customization
           } as TestimonialData
         });
       } catch (err) {
         console.error("Batch Gemini extraction failed", err);
       }
    }
    
    setBatchData(results);
    setIsProcessing(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateAllData = (partialCustom: any) => {
     setCustomization(prev => ({ ...prev, ...partialCustom }));
  };

  const handleDataEdit = (id: string, partial: Partial<TestimonialData>) => {
     setBatchData(prev => prev.map(item => item.id === id ? { ...item, data: { ...item.data, ...partial } } : item));
  };

  const getMergedData = (localData: TestimonialData) => {
     return { ...localData, ...customization };
  };

  const validateItem = (data: TestimonialData, index?: number) => {
    const requiredFields = [
      { key: 'feedback', label: 'Feedback' },
      { key: 'name', label: 'Name' },
      { key: 'company', label: 'Company' },
      { key: 'role', label: 'Role' }
    ];
    const missing = requiredFields.filter(f => !data[f.key as keyof TestimonialData]);
    if (missing.length > 0) {
      const msg = index !== undefined 
        ? `Testimonial #${index + 1} is missing: ${missing.map(m => m.label).join(', ')}`
        : `Missing: ${missing.map(m => m.label).join(', ')}`;
      toast.error(msg);
      return false;
    }
    return true;
  };

  const handleExportAll = async () => {
    // Check all items first
    for (let i = 0; i < batchData.length; i++) {
      if (!validateItem(batchData[i].data, i)) return;
    }

    const zip = new JSZip();
    toast.info("Generating ZIP file...");
    
    for (const item of batchData) {
      const ref = cardRefs.current[item.id];
      if (ref) {
        const canvas = await html2canvas(ref, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`${item.data.name || 'testimonial'}_${item.id}.png`, imgData, { base64: true });
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, "testimonials_batch.zip");
    addToDownloadHistory(`Batch (${batchData.length} items)`, "ZIP");
    toast.success("Batch export complete!");
  };

  const handleSaveAll = () => {
    // Check all items first
    for (let i = 0; i < batchData.length; i++) {
      if (!validateItem(batchData[i].data, i)) return;
    }

    batchData.forEach(item => {
      const finalData = { ...getMergedData(item.data), isExported: true }; // Mark as exported for history tracking
      addToHistory(finalData);
    });
    toast.success(`Successfully saved all ${batchData.length} testimonials!`);
    navigate('/history');
  };

  const handleIndividualExport = async (id: string, format: 'png' | 'pdf' | 'html') => {
    const ref = cardRefs.current[id];
    if (!ref) return;
    const item = batchData.find(b => b.id === id);
    if (!item) return;

    if (!validateItem(item.data)) return;

    const data = getMergedData(item.data);
    // ... rest of export logic same

    if (format === 'html') {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Testimonial - ${data.name || 'Anonymous'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .testimonial-container { width: 100%; max-width: 600px; }
  </style>
</head>
<body>
  <div class="testimonial-container">
    ${ref.innerHTML}
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      saveAs(blob, `${data.name || 'testimonial'}.html`);
      toast.success("HTML Exported!");
      return;
    }

    const canvas = await html2canvas(ref, { scale: 2, useCORS: true });
    
    if (format === 'png') {
      const imgData = canvas.toDataURL('image/png');
      saveAs(imgData, `${data.name || 'testimonial'}.png`);
    } else if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${data.name || 'testimonial'}.pdf`);
    }
    toast.success(`${format.toUpperCase()} Exported!`);
    addToDownloadHistory(data.name, format, data.id);
  };

  const fontFamilies = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Serif', value: 'Merriweather, serif' },
    { name: 'Monospace', value: "'Fira Code', monospace" },
    { name: 'Rounded', value: "'Quicksand', sans-serif" },
    { name: 'Bookman', value: '"Bookman Old Style", serif' },
    { name: 'Cambria', value: 'Cambria, serif' },
    { name: 'High Tower', value: '"High Tower Text", serif' },
    { name: 'Britannic', value: '"Britannic Bold", sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Palatino', value: '"Palatino Linotype", serif' },
    { name: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  ];

  const TemplateComponent = templateMap[globalTemplate];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between mb-8">
         <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Batch Process Screenshots</h1>
         {step === 1 && !isProcessing && (
            <button
               onClick={() => { setStep(0); setBatchData([]); setQueuedFiles([]); }}
               className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground bg-card border border-border px-4 py-2 rounded-md transition-colors shadow-sm"
            >
               <ArrowLeft className="w-4 h-4" /> Start Over
            </button>
         )}
      </div>

      {step === 0 ? (
        <div className="max-w-4xl mx-auto mt-6 bg-card p-8 rounded-xl border border-border shadow-sm transition-all">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Transform <span className="text-blue-600">hundreds</span> of reviews
            </h2>
            <p className="text-muted-foreground">Pick multiple screenshots and proceed to extraction when ready.</p>
          </div>
          
          <div 
             className="relative border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-blue-500 transition-all cursor-pointer bg-muted/50 hover:bg-blue-50/30"
             onClick={() => document.getElementById('batchInput')?.click()}
          >
             <input
               id="batchInput"
               type="file"
               multiple
               accept="image/*"
               onChange={(e) => handleQueueFiles(e.target.files)}
               className="hidden"
             />
             <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                   <ImageIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                   <p className="text-lg font-medium text-foreground">Drop multiple screenshots here</p>
                   {queuedFiles.length > 0 ? (
                      <p className="text-sm text-blue-600 font-bold mt-1">Ready for Extraction</p>
                   ) : (
                      <p className="text-sm text-muted-foreground mt-1">Select 2 to 50 images at once</p>
                   )}
                </div>
             </div>
          </div>

          {queuedFiles.length > 0 && (
             <div className="mt-8 space-y-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                   {queuedFiles.map((file, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-md border border-border overflow-hidden bg-accent transition-all hover:ring-2 hover:ring-blue-400">
                         <img src={URL.createObjectURL(file)} alt="queued" className="w-full h-full object-cover" />
                         <button 
                            onClick={(e) => { e.stopPropagation(); removeFileFromQueue(idx); }}
                            className="absolute top-1 right-1 bg-slate-900/40 hover:bg-slate-900/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                </div>

                <div className="flex justify-center pt-4">
                   <button 
                      onClick={executeBatchExtraction}
                      disabled={isProcessing}
                      className={`w-full max-w-sm py-4 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/5 dark:shadow-white/5 ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-95'
                      }`}
                   >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Extract {queuedFiles.length} Images with AI
                        </>
                      )}
                   </button>
                </div>
             </div>
          )}

          {queuedFiles.length === 0 && (
             <button 
                onClick={() => document.getElementById('batchInput')?.click()}
                className="w-full mt-4 py-4 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
             >
                <Upload className="w-4 h-4" />
                Browse Files
             </button>
          )}
        </div>
      ) : isProcessing ? (
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
           <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
           <h3 className="text-2xl font-bold text-foreground">Batch Magic in Progress...</h3>
           <p className="text-muted-foreground animate-pulse text-lg">{progressMsg}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
           <div className="lg:sticky lg:top-6 space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="font-bold text-foreground text-lg border-b border-border pb-4">Global Styling</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Template</label>
                    <select 
                      value={globalTemplate} 
                      onChange={(e) => setGlobalTemplate(e.target.value as TemplateName)}
                      className="w-full px-3 py-2.5 rounded-md bg-accent border border-border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="dark-premium">Dark Premium</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="glassmorphism">Glassmorphism</option>
                      <option value="geometric">Geometric</option>
                      <option value="happy-bubble">Happy Bubble</option>
                      <option value="deep-burgundy">Deep Burgundy</option>
                      <option value="classic-parchment">Classic Parchment</option>
                      <option value="corporate-grid">Corporate Grid</option>
                      <option value="azure-bubble">Azure Bubble</option>
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fonts</label>
                    <div className="grid grid-cols-2 gap-2">
                      {fontFamilies.map(font => (
                         <button
                           key={font.value}
                           onClick={() => updateAllData({ fontFamily: font.value })}
                           className={`text-xs px-3 py-2.5 rounded-md transition-all border ${
                              customization.fontFamily === font.value ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-md' : 'bg-accent text-foreground border-border hover:border-blue-300'
                           }`}
                           style={{ fontFamily: font.value }}
                         >
                           {font.name}
                         </button>
                      ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bg Color</label>
                       <div className="flex gap-2 items-center bg-accent p-2 rounded-md border border-border">
                          <input 
                             type="color" 
                             value={customization.customBackgroundColor || '#FFFFFF'} 
                             onChange={(e) => updateAllData({ customBackgroundColor: e.target.value })}
                             className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{customization.customBackgroundColor || '#FFF'}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Text Color</label>
                       <div className="flex gap-2 items-center bg-accent p-2 rounded-md border border-border">
                          <input 
                             type="color" 
                             value={customization.customTextColor || '#000000'} 
                             onChange={(e) => updateAllData({ customTextColor: e.target.value })}
                             className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{customization.customTextColor || '#000'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-border space-y-3">
                 <p className="text-sm font-medium text-muted-foreground mb-1">Ready to export {batchData.length} cards.</p>
                 <button 
                    onClick={handleExportAll}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-md transition-all flex justify-center items-center gap-2 shadow-xl shadow-black/5 dark:shadow-white/5 hover:scale-[1.01]"
                 >
                    <Download className="w-5 h-5"/> Export All as ZIP 
                 </button>
                 <button 
                    onClick={handleSaveAll}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3.5 rounded-md transition-all flex justify-center items-center gap-2 shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                 >
                    <Sparkles className="w-5 h-5"/> Save All to Wall of Love 
                 </button>
              </div>
           </div>

           <div className="space-y-8">
              {batchData.map((item, index) => (
                 <div key={item.id} className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col xl:flex-row gap-6 hover:shadow-md transition-shadow">
                    <div className="xl:w-64 flex-shrink-0 space-y-4">
                       <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">#{index + 1}</span>
                          <span className="text-sm font-bold text-foreground uppercase tracking-wider">Editor</span>
                       </div>
                       <input 
                          type="text" 
                          value={item.data.name} 
                          onChange={(e) => handleDataEdit(item.id, { name: e.target.value })}
                          className="w-full text-sm px-3 py-2.5 rounded-md bg-accent border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Name *"
                       />
                       <input 
                          type="text" 
                          value={item.data.role} 
                          onChange={(e) => handleDataEdit(item.id, { role: e.target.value })}
                          className="w-full text-sm px-3 py-2.5 rounded-md bg-accent border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Role *"
                       />
                       <textarea 
                          value={item.data.feedback} 
                          onChange={(e) => handleDataEdit(item.id, { feedback: e.target.value })}
                          rows={4}
                          className="w-full text-sm px-3 py-2.5 rounded-md bg-accent border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-40"
                          placeholder="Feedback *"
                       />
                       
                       <div className="pt-2 grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleIndividualExport(item.id, 'png')}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          >
                            <Download className="w-3 h-3" /> PNG
                          </button>
                          <button 
                            onClick={() => handleIndividualExport(item.id, 'pdf')}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          >
                            <FileText className="w-3 h-3" /> PDF
                          </button>
                          <button 
                            onClick={() => handleIndividualExport(item.id, 'html')}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          >
                            <Code className="w-3 h-3" /> HTML
                          </button>
                          <button 
                            onClick={() => {
                              addToHistory(getMergedData(item.data));
                              toast.success("Saved to Wall of Love!");
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-all"
                          >
                            <Sparkles className="w-3 h-3" /> Save
                          </button>
                       </div>
                    </div>
                    <div className="flex-1 bg-muted/50 p-8 rounded-xl border border-border flex items-center justify-center overflow-hidden min-h-[400px]">
                       <div className="w-full max-w-[480px]" ref={(el) => (cardRefs.current[item.id] = el)}>
                          <TemplateComponent data={getMergedData(item.data)} showWatermark={true} />
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcess;
