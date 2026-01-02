
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession, createSlug, deleteEvent, toggleEventStatus, savePaymentSettings, fetchPaymentSettings, updateEvent } from '../services/api';
import { generateEventDescription } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus, FormField, FormFieldType, PaymentSettings } from '../types';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';

// Time Picker Constants
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'registrations' | 'settings'>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCert, setProcessingCert] = useState<string | null>(null);
  const navigate = useNavigate();
  const session = getUserSession();
  
  // Custom Alert State
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "YA, LANJUTKAN") => {
    setAlertState({ isOpen: true, type: 'info', title, message, onConfirm, confirmText });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };

  // Registration Filter State
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  
  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ bankName: '', accountNumber: '', accountHolder: '', qrisUrl: '' });
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  // New/Edit Event Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track ID for editing
  const [wizardStep, setWizardStep] = useState(1);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    category: EventCategory.SEMINAR,
    price: 0,
    maxParticipants: 100,
    formFields: [],
    time: '09:00' // Default time
  });
  const [customCategory, setCustomCategory] = useState(''); // For "Other" input
  const [isCustomCat, setIsCustomCat] = useState(false);
  
  // Banner State
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  
  // Settings
  const [scriptUrl, setScriptUrl] = useState(getApiUrl());
  const [testingConnection, setTestingConnection] = useState(false);

  // Refs for auto-scrolling time picker
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || session.role !== 'ADMIN') {
        navigate('/login');
        return;
    }
    if (getApiUrl()) {
        loadData();
    }
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, regs, payment] = await Promise.all([fetchEvents(), fetchRegistrations(), fetchPaymentSettings()]);
      setEvents(evts || []);
      setRegistrations(regs || []);
      setPaymentSettings(payment || { bankName: '', accountNumber: '', accountHolder: '', qrisUrl: '' });
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- IMPROVED AI DESCRIPTION HANDLER ---
  const handleGenerateDescription = async () => {
    if (!newEvent.title) { 
        showAlert('error', 'Validasi Gagal', "Mohon isi 'Judul Acara' terlebih dahulu sebelum menggunakan AI."); 
        return; 
    }
    
    setGeneratingDesc(true);
    try {
        const categoryStr = isCustomCat ? customCategory : (newEvent.category || "Umum");
        const details = `Lokasi: ${newEvent.location || 'Online'}, Waktu: ${newEvent.time || 'TBA'}, Tanggal: ${newEvent.date || 'TBA'}`;
        
        const desc = await generateEventDescription(newEvent.title, categoryStr, details);
        
        setNewEvent(prev => ({...prev, description: desc}));
        showAlert('success', 'AI Generated', "Deskripsi berhasil dibuat oleh AI!");
    } catch (err: any) {
        showAlert('error', 'AI Error', "Gagal membuat deskripsi. Pastikan API Key valid atau coba lagi nanti.");
    } finally {
        setGeneratingDesc(false);
    }
  };

  // --- IMPROVED BANNER UPLOAD HANDLER ---
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate file size (max 5MB to be safe with GAS)
          if (file.size > 5 * 1024 * 1024) {
              showAlert('error', 'File Terlalu Besar', "Ukuran gambar maksimal 5MB.");
              return;
          }

          setBannerFile(file);
          
          // Create immediate preview
          const reader = new FileReader();
          reader.onloadend = () => {
              setBannerPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveBanner = (e: React.MouseEvent) => {
      e.preventDefault();
      setBannerFile(null);
      setBannerPreview(null);
  };

  const handleCreateOrUpdateEvent = async () => {
    // Basic validation
    if (!newEvent.title || !newEvent.date) { 
        showAlert('error', 'Validasi Gagal', "Judul dan Tanggal wajib diisi."); return; 
    }
    
    // For CREATE: Banner mandatory. For UPDATE: Optional (keep existing)
    if (!editingId && !bannerFile) { 
        showAlert('error', 'Validasi Gagal', "Gambar banner wajib diunggah untuk acara baru."); return; 
    }
    
    // Apply custom category if selected
    const finalEventData = { ...newEvent };
    if (isCustomCat && customCategory) {
        finalEventData.category = customCategory;
    }

    setIsSubmittingEvent(true);
    
    const submit = async (base64?: string) => {
        try {
            if (editingId) {
                // UPDATE MODE
                await updateEvent({ ...finalEventData, id: editingId }, base64);
            } else {
                // CREATE MODE
                if (!base64) throw new Error("Missing banner for create");
                await createEvent(finalEventData as any, base64);
            }
            
            // Add slight delay for animation effect
            setTimeout(() => {
                setIsSubmittingEvent(false);
                setShowCreateModal(false);
                resetWizard();
                loadData();
                showAlert('success', 'Berhasil', editingId ? "Acara berhasil diperbarui!" : "Acara berhasil dibuat!");
            }, 800);

        } catch (err: any) {
            setIsSubmittingEvent(false);
            showAlert('error', 'Terjadi Kesalahan', "Gagal proses: " + err.message);
        }
    };

    if (bannerFile) {
        // Read new file
        const reader = new FileReader();
        reader.readAsDataURL(bannerFile);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            submit(base64);
        };
        reader.onerror = () => {
            setIsSubmittingEvent(false);
            showAlert('error', 'File Error', "Gagal membaca file banner.");
        };
    } else {
        // No new file (only valid for update)
        submit(undefined);
    }
  };

  const resetWizard = () => {
      setWizardStep(1);
      setNewEvent({ category: EventCategory.SEMINAR, price: 0, maxParticipants: 100, formFields: [], time: '09:00' });
      setBannerFile(null);
      setBannerPreview(null);
      setCustomCategory('');
      setIsCustomCat(false);
      setEditingId(null);
  };

  const handleEditClick = (event: Event) => {
      setEditingId(event.id);
      setNewEvent({
          title: event.title,
          category: event.category,
          date: new Date(event.date).toISOString().split('T')[0], // YYYY-MM-DD
          time: event.time,
          location: event.location,
          description: event.description,
          price: event.price,
          maxParticipants: event.maxParticipants,
          formFields: event.formFields || []
      });
      setBannerPreview(event.bannerUrl);
      
      // Check if custom category
      const isStd = Object.values(EventCategory).includes(event.category as EventCategory);
      if (!isStd) {
          setIsCustomCat(true);
          setCustomCategory(event.category);
      } else {
          setIsCustomCat(false);
      }

      setShowCreateModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    showConfirm('Hapus Acara?', "Apakah Anda yakin ingin menghapus acara ini secara permanen? Data tidak bisa dikembalikan.", async () => {
        try {
            await deleteEvent(id);
            setEvents(events.filter(e => e.id !== id));
            showAlert('success', 'Terhapus', "Acara berhasil dihapus.");
        } catch(e) { 
            showAlert('error', 'Gagal', "Gagal menghapus acara."); 
        }
    }, "YA, HAPUS");
  };

  const handleToggleStatus = async (id: string) => {
    try {
        const res = await toggleEventStatus(id);
        setEvents(events.map(e => e.id === id ? {...e, isOpen: res.isOpen} : e));
        showAlert('success', 'Status Diubah', `Acara kini ${res.isOpen ? 'AKTIF (Publik)' : 'NON-AKTIF (Draft)'}`);
    } catch(e) { 
        showAlert('error', 'Gagal', "Gagal mengubah status."); 
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingPayment(true);
      let qrisBase64 = undefined;
      
      const submit = async () => {
          try {
              const res = await savePaymentSettings(paymentSettings, qrisBase64);
              if(res) {
                  setPaymentSettings(prev => ({...prev, qrisUrl: (res as any).qrisUrl}));
                  showAlert('success', 'Tersimpan', "Pengaturan pembayaran berhasil diperbarui!");
              }
          } catch(e) { showAlert('error', 'Gagal', "Gagal menyimpan pengaturan."); }
          finally { setSavingPayment(false); }
      };

      if (qrisFile) {
          const reader = new FileReader();
          reader.readAsDataURL(qrisFile);
          reader.onload = () => {
              qrisBase64 = (reader.result as string).split(',')[1];
              submit();
          };
      } else {
          submit();
      }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try {
        await updateRegistrationStatus(id, status);
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
        showAlert('error', 'Gagal', "Gagal memperbarui status");
    }
  };

  const handleSendCertificate = async (id: string) => {
    setProcessingCert(id);
    try {
      await sendCertificate(id);
      showAlert('success', 'Terkirim', "Sertifikat berhasil dikirim melalui email!");
    } catch (e: any) {
      showAlert('error', 'Gagal', "Gagal mengirim sertifikat: " + e.message);
    } finally {
      setProcessingCert(null);
    }
  };

  // Helper to handle time selection
  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
      const [currentH, currentM] = (newEvent.time || '09:00').split(':');
      let newTime = '';
      if (type === 'hour') {
          newTime = `${value}:${currentM}`;
      } else {
          newTime = `${currentH}:${value}`;
      }
      setNewEvent({...newEvent, time: newTime});
  };

  // --- WIZARD HANDLERS ---
  const addFormField = () => {
      const newField: FormField = {
          id: Date.now().toString(),
          label: '',
          type: 'text',
          required: false
      };
      setNewEvent({...newEvent, formFields: [...(newEvent.formFields || []), newField]});
  };

  const updateFormField = (index: number, field: Partial<FormField>) => {
      const updated = [...(newEvent.formFields || [])];
      updated[index] = { ...updated[index], ...field };
      setNewEvent({...newEvent, formFields: updated});
  };

  const removeFormField = (index: number) => {
      const updated = [...(newEvent.formFields || [])];
      updated.splice(index, 1);
      setNewEvent({...newEvent, formFields: updated});
  };

  // Render Time Picker Helper
  const [currentHour, currentMinute] = (newEvent.time || '09:00').split(':');

  const renderCreateEventWizard = () => (
      <div className="fixed inset-0 bg-[#2B427A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-4 border-[#DFFF00] animate-scale-up">
              
              {/* Wizard Header */}
              <div className="bg-gray-50 px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tight">{editingId ? 'Edit Acara' : 'Buat Acara Baru'}</h2>
                      <div className="flex gap-2 mt-2">
                          {[1,2,3,4].map(step => (
                              <div key={step} className={`h-2 w-12 rounded-full transition-all duration-300 ${step <= wizardStep ? 'bg-[#0B1CDE]' : 'bg-gray-200'}`} />
                          ))}
                      </div>
                  </div>
                  <button onClick={() => { setShowCreateModal(false); resetWizard(); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-8 h-8" /></button>
              </div>

              {/* Wizard Content */}
              <div className="p-8 overflow-y-auto flex-1 bg-white relative">
                  {/* Loading Overlay */}
                  {isSubmittingEvent && (
                      <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
                          <Loader className="w-16 h-16 text-[#2B427A] animate-spin mb-4" />
                          <p className="text-xl font-black text-[#2B427A] uppercase tracking-widest animate-pulse">Menyimpan Acara...</p>
                      </div>
                  )}

                  {wizardStep === 1 && (
                      <div className="space-y-6 animate-fade-in">
                          <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 1: Informasi Dasar</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label>
                                  <input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold" placeholder="Nama Event..." />
                              </div>
                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label>
                                  <select 
                                    value={isCustomCat ? 'OTHER' : newEvent.category} 
                                    onChange={(e) => {
                                        if (e.target.value === 'OTHER') {
                                            setIsCustomCat(true);
                                            setNewEvent({...newEvent, category: ''});
                                        } else {
                                            setIsCustomCat(false);
                                            setNewEvent({...newEvent, category: e.target.value});
                                        }
                                    }} 
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold bg-white"
                                  >
                                      {Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}
                                      <option value="OTHER">Lainnya (Custom)...</option>
                                  </select>
                                  {isCustomCat && (
                                      <div className="mt-3 animate-fade-in">
                                          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Masukkan Kategori Custom</label>
                                          <input 
                                            type="text" 
                                            value={customCategory} 
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                            className="w-full border-2 border-[#DFFF00] rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold bg-[#F8FAFC]" 
                                            placeholder="Contoh: Talkshow, Gathering, dll"
                                            autoFocus
                                          />
                                      </div>
                                  )}
                              </div>
                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label>
                                  <input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold" />
                              </div>
                              
                              {/* Custom Inline Time Picker */}
                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu (Jam : Menit)</label>
                                  <div className="flex h-48 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner relative">
                                      {/* Hours */}
                                      <div className="flex-1 flex flex-col items-center overflow-y-auto scroll-smooth snap-y snap-mandatory no-scrollbar" ref={hourRef} style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                                          <div className="sticky top-0 w-full text-center bg-gray-50 border-b border-gray-100 text-[10px] font-black py-1 text-gray-400 z-10">JAM</div>
                                          <div className="py-2 w-full">
                                              {HOURS.map(h => (
                                                  <div 
                                                    key={h} 
                                                    onClick={() => handleTimeChange('hour', h)}
                                                    className={`h-10 flex items-center justify-center cursor-pointer snap-center transition-all ${currentHour === h ? 'bg-[#2B427A] text-white font-black text-xl scale-110 shadow-lg my-1 rounded-lg mx-2' : 'text-gray-400 font-bold hover:text-[#2B427A] hover:bg-gray-50'}`}
                                                  >
                                                      {h}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                      
                                      {/* Separator */}
                                      <div className="w-8 flex items-center justify-center bg-gray-50 border-x border-gray-100 z-20 shadow-md">
                                          <span className="text-2xl font-black text-[#2B427A] animate-pulse">:</span>
                                      </div>

                                      {/* Minutes */}
                                      <div className="flex-1 flex flex-col items-center overflow-y-auto scroll-smooth snap-y snap-mandatory no-scrollbar" ref={minuteRef} style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                                          <div className="sticky top-0 w-full text-center bg-gray-50 border-b border-gray-100 text-[10px] font-black py-1 text-gray-400 z-10">MENIT</div>
                                          <div className="py-2 w-full">
                                              {MINUTES.map(m => (
                                                  <div 
                                                    key={m} 
                                                    onClick={() => handleTimeChange('minute', m)}
                                                    className={`h-10 flex items-center justify-center cursor-pointer snap-center transition-all ${currentMinute === m ? 'bg-[#DFFF00] text-[#2B427A] font-black text-xl scale-110 shadow-lg my-1 rounded-lg mx-2' : 'text-gray-400 font-bold hover:text-[#2B427A] hover:bg-gray-50'}`}
                                                  >
                                                      {m}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-center mt-2 font-bold text-[#0B1CDE] bg-blue-50 py-1 rounded-lg border border-blue-100">
                                      Terpilih: {currentHour}:{currentMinute}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {wizardStep === 2 && (
                      <div className="space-y-6 animate-fade-in">
                           <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 2: Detail & Media</h3>
                           <div>
                                <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label>
                                <input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold" placeholder="Tempat pelaksanaan..." />
                           </div>
                           <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-black text-[#2B427A] uppercase">Deskripsi</label>
                                    <button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs bg-[#DFFF00] px-3 py-1 rounded-lg font-black text-[#2B427A] border border-[#2B427A] flex items-center gap-1 hover:bg-white transition-colors shadow-sm">
                                        <Sparkles className="w-3 h-3"/> {generatingDesc ? 'MEMBUAT...' : 'AI GENERATE'}
                                    </button>
                                </div>
                                <textarea rows={6} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-medium text-sm leading-relaxed resize-none" placeholder="Jelaskan detail acara..."/>
                           </div>
                           
                           {/* Improved Banner Upload with Preview */}
                           <div>
                                <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Banner Acara</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-colors duration-200 group overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center">
                                    <input type="file" accept="image/*" onChange={handleBannerChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    
                                    {bannerPreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={bannerPreview} alt="Preview" className="max-h-[300px] w-full object-contain rounded-lg shadow-md" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Klik untuk ganti gambar</p>
                                            </div>
                                            <button onClick={handleRemoveBanner} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full z-20 hover:bg-red-600 shadow-lg" title="Hapus Gambar">
                                                <Trash className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                            <ImageIcon className="w-12 h-12 text-gray-400 mb-2 group-hover:text-[#0B1CDE]"/>
                                            <span className="font-bold text-gray-500 group-hover:text-[#2B427A]">Klik untuk unggah Banner (Max 5MB)</span>
                                            <span className="text-xs text-gray-400 mt-1">Format: JPG, PNG</span>
                                        </div>
                                    )}
                                </div>
                           </div>
                      </div>
                  )}

                  {wizardStep === 3 && (
                      <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center">
                              <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 3: Form Pendaftaran</h3>
                              <button onClick={addFormField} className="text-sm bg-[#0B1CDE] text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A] transition-transform active:scale-95"><PlusCircle className="w-4 h-4"/> TAMBAH FIELD</button>
                          </div>
                          <div className="bg-[#F0F9FF] p-4 rounded-xl border border-blue-100 text-sm text-[#2B427A] font-medium mb-4">
                              <span className="font-bold">Catatan:</span> Nama Lengkap dan Email sudah otomatis tersedia di setiap formulir. Tambahkan field lain sesuai kebutuhan (Misal: NIM, No HP, Asal Instansi).
                          </div>
                          
                          <div className="space-y-3">
                              {newEvent.formFields?.map((field, idx) => (
                                  <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 animate-scale-up">
                                      <div className="flex-1 space-y-3">
                                          <div className="grid grid-cols-2 gap-4">
                                              <input type="text" placeholder="Label (Misal: No WhatsApp)" value={field.label} onChange={e=>updateFormField(idx, {label: e.target.value})} className="border rounded-lg p-2 text-sm font-bold outline-none focus:border-blue-500" />
                                              <select value={field.type} onChange={e=>updateFormField(idx, {type: e.target.value as any})} className="border rounded-lg p-2 text-sm font-bold outline-none bg-white">
                                                  <option value="text">Teks Singkat</option>
                                                  <option value="number">Angka</option>
                                                  <option value="email">Email</option>
                                                  <option value="textarea">Teks Panjang</option>
                                                  <option value="select">Pilihan (Dropdown)</option>
                                              </select>
                                          </div>
                                          {field.type === 'select' && (
                                              <input type="text" placeholder="Opsi (pisahkan dengan koma)" value={field.options?.join(',')} onChange={e=>updateFormField(idx, {options: e.target.value.split(',')})} className="w-full border rounded-lg p-2 text-sm outline-none" />
                                          )}
                                          <div className="flex items-center gap-2">
                                              <input type="checkbox" checked={field.required} onChange={e=>updateFormField(idx, {required: e.target.checked})} id={`req-${idx}`} className="w-4 h-4"/>
                                              <label htmlFor={`req-${idx}`} className="text-sm font-bold text-gray-600">Wajib Diisi</label>
                                          </div>
                                      </div>
                                      <button onClick={()=>removeFormField(idx)} className="text-red-400 hover:text-red-600 p-2"><MinusCircle className="w-6 h-6"/></button>
                                  </div>
                              ))}
                              {(!newEvent.formFields || newEvent.formFields.length === 0) && (
                                  <div className="text-center py-8 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">Belum ada field tambahan.</div>
                              )}
                          </div>
                      </div>
                  )}

                  {wizardStep === 4 && (
                      <div className="space-y-6 animate-fade-in">
                          <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 4: Harga & Review</h3>
                          <div className="grid grid-cols-2 gap-6">
                              {/* CUSTOM PRICE INPUT */}
                              <div>
                                  <div className="flex justify-between items-center mb-2">
                                     <label className="block text-sm font-black text-[#2B427A] uppercase">Harga Tiket</label>
                                     <div className="flex items-center gap-2">
                                         <span className={`text-xs font-bold ${newEvent.price === 0 ? 'text-green-600' : 'text-gray-400'}`}>GRATIS?</span>
                                         <button 
                                            onClick={() => setNewEvent({...newEvent, price: newEvent.price === 0 ? 10000 : 0})}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${newEvent.price === 0 ? 'bg-green-500' : 'bg-gray-300'}`}
                                         >
                                             <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${newEvent.price === 0 ? 'left-6' : 'left-1'}`} />
                                         </button>
                                     </div>
                                  </div>
                                  <div className={`relative flex items-center border-2 rounded-xl overflow-hidden transition-all ${newEvent.price === 0 ? 'bg-gray-100 border-gray-200' : 'bg-white border-[#2B427A]'}`}>
                                      <div className={`px-4 py-3 font-black text-lg ${newEvent.price === 0 ? 'text-gray-400' : 'bg-[#2B427A] text-white'}`}>Rp</div>
                                      <input 
                                        type="number" 
                                        disabled={newEvent.price === 0}
                                        value={newEvent.price === 0 ? '' : newEvent.price} 
                                        onChange={e=>setNewEvent({...newEvent, price: Number(e.target.value)})} 
                                        className="w-full p-3 outline-none font-black text-xl text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder={newEvent.price === 0 ? "GRATIS" : "0"}
                                      />
                                  </div>
                                  {newEvent.price && newEvent.price > 0 ? (
                                      <p className="text-right text-xs font-bold text-[#0B1CDE] mt-1">
                                          {newEvent.price.toLocaleString('id-ID', {style: 'currency', currency: 'IDR'})}
                                      </p>
                                  ) : null}
                              </div>

                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kuota Peserta</label>
                                  <input type="number" value={newEvent.maxParticipants} onChange={e=>setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-black text-lg" />
                              </div>
                          </div>
                          
                          <div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-200 mt-4">
                              <h4 className="font-black text-[#2B427A] mb-2 uppercase">Ringkasan Acara {editingId && <span className="text-[#0B1CDE]">(EDIT MODE)</span>}</h4>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div>
                                      <p className="text-xs text-gray-500 font-bold uppercase">Judul</p>
                                      <p className="text-sm font-black text-[#0B1CDE]">{newEvent.title}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-500 font-bold uppercase">Kategori</p>
                                      <p className="text-sm font-bold text-gray-700">{isCustomCat ? customCategory : newEvent.category}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-500 font-bold uppercase">Jadwal</p>
                                      <p className="text-sm font-bold text-gray-700">{newEvent.date} @ {newEvent.time}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-500 font-bold uppercase">Lokasi</p>
                                      <p className="text-sm font-bold text-gray-700">{newEvent.location}</p>
                                  </div>
                              </div>
                              
                              {bannerPreview && (
                                  <div className="mt-4">
                                      <p className="text-xs text-gray-500 font-bold uppercase mb-1">Banner Preview</p>
                                      <img src={bannerPreview} alt="Banner" className="h-24 w-auto rounded border border-gray-300" />
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              {/* Wizard Footer */}
              <div className="p-6 bg-gray-50 border-t-2 border-gray-100 flex justify-between">
                  {wizardStep > 1 ? (
                      <button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2 transition-colors"><ChevronLeft className="w-5 h-5"/> KEMBALI</button>
                  ) : <div/>}
                  
                  {wizardStep < 4 ? (
                      <button onClick={()=>setWizardStep(prev=>prev+1)} className="px-6 py-3 rounded-xl font-black bg-[#2B427A] text-white hover:bg-[#0B1CDE] flex items-center gap-2 transition-all shadow-lg hover:translate-y-[-2px]">SELANJUTNYA <ChevronRight className="w-5 h-5"/></button>
                  ) : (
                      <button 
                        onClick={handleCreateOrUpdateEvent} 
                        disabled={isSubmittingEvent}
                        className="px-8 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:bg-white flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:shadow-[2px_2px_0px_0px_#2B427A] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} {editingId ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN ACARA'}
                      </button>
                  )}
              </div>
          </div>
      </div>
  );

  const renderPaymentSettings = () => (
      <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Pengaturan Pembayaran</h2>
          <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A]">
               <form onSubmit={handleSavePaymentSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Nama Bank</label>
                           <input type="text" value={paymentSettings.bankName} onChange={e=>setPaymentSettings({...paymentSettings, bankName: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold" placeholder="Contoh: BCA / MANDIRI" required />
                       </div>
                       <div>
                           <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Nomor Rekening</label>
                           <input type="text" value={paymentSettings.accountNumber} onChange={e=>setPaymentSettings({...paymentSettings, accountNumber: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold" placeholder="Nomor Rekening..." required />
                       </div>
                       <div>
                           <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Atas Nama</label>
                           <input type="text" value={paymentSettings.accountHolder} onChange={e=>setPaymentSettings({...paymentSettings, accountHolder: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold" placeholder="Nama Pemilik Rekening" required />
                       </div>
                   </div>
                   <div className="space-y-4">
                       <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">QRIS (Scan Payment)</label>
                       <div className="border-2 border-dashed border-[#2B427A]/30 rounded-xl p-6 text-center bg-gray-50 hover:bg-[#F0F9FF] cursor-pointer relative h-48 flex items-center justify-center">
                           <input type="file" accept="image/*" onChange={e=>setQrisFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                           {qrisFile ? (
                               <div className="text-green-600 font-bold">{qrisFile.name}</div>
                           ) : (
                               paymentSettings.qrisUrl ? <img src={paymentSettings.qrisUrl} alt="QRIS" className="h-full object-contain" /> : <div className="text-gray-400 font-bold"><Upload className="w-8 h-8 mx-auto mb-2"/>Upload QRIS Image</div>
                           )}
                       </div>
                   </div>
                   <div className="md:col-span-2">
                       <button type="submit" disabled={savingPayment} className="w-full py-4 bg-[#0B1CDE] text-white font-black rounded-xl hover:bg-[#2B427A] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#2B427A]">
                           {savingPayment ? <Loader className="animate-spin"/> : <CheckCircle/>} SIMPAN PENGATURAN PEMBAYARAN
                       </button>
                   </div>
               </form>
          </div>
      </div>
  );

  // Filter Registration Logic
  const filteredRegistrations = registrations.filter(r => 
      selectedEventFilter === 'ALL' ? true : r.eventId === selectedEventFilter
  );

  const renderRegistrations = () => (
     <div className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden animate-fade-in">
        <div className="p-6 border-b-2 border-[#2B427A] bg-[#F0F9FF] flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-black text-[#2B427A] uppercase tracking-tight">MANAJEMEN PENDAFTARAN</h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                    <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-500"/>
                    <select 
                        value={selectedEventFilter} 
                        onChange={(e) => setSelectedEventFilter(e.target.value)}
                        className="w-full md:w-64 pl-9 pr-4 py-2 border-2 border-[#2B427A] rounded-lg font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1CDE]/20"
                    >
                        <option value="ALL">Semua Acara</option>
                        {events.map(e => (
                            <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm font-bold bg-[#2B427A] text-white px-3 py-2 rounded-lg border-2 border-[#2B427A] whitespace-nowrap">
                    Total: {filteredRegistrations.length}
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-[#2B427A] text-white text-xs font-black uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Nama / Detail Form</th>
                        <th className="px-6 py-4">Acara</th>
                        <th className="px-6 py-4">Bukti</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#2B427A]/10">
                    {filteredRegistrations.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">
                                {selectedEventFilter === 'ALL' ? "Belum ada pendaftaran yang masuk." : "Belum ada pendaftar untuk acara ini."}
                            </td>
                        </tr>
                    ) : (
                        filteredRegistrations.map(r => {
                            let customDataObj = {};
                            try { customDataObj = r.customData ? JSON.parse(r.customData) : {}; } catch(e){}
                            
                            return (
                                <tr key={r.id} className="hover:bg-[#F0F9FF] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-black text-[#2B427A] text-base">{r.userName}</div>
                                        <div className="text-xs text-gray-500 font-bold mb-1">{r.userEmail}</div>
                                        {Object.keys(customDataObj).length > 0 && (
                                            <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                                                {Object.entries(customDataObj).map(([key, val]) => (
                                                    <div key={key} className="flex gap-1"><span className="font-bold text-gray-600">{key}:</span> <span className="text-gray-800">{val as string}</span></div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[#2B427A] text-sm">{r.eventTitle}</td>
                                    <td className="px-6 py-4">
                                        <a href={r.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-[#2B427A] rounded-lg text-[#2B427A] text-xs font-black hover:bg-[#DFFF00] hover:text-[#2B427A] transition-colors shadow-[2px_2px_0px_0px_#2B427A]">
                                            <ImageIcon className="w-3 h-3" /> LIHAT
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg tracking-wide uppercase border-2
                                            ${r.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700 border-green-700' : 
                                              r.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-700' : 
                                              'bg-yellow-100 text-yellow-700 border-yellow-700'}`}>
                                            {r.status === RegistrationStatus.APPROVED ? 'DISETUJUI' : 
                                             r.status === RegistrationStatus.REJECTED ? 'DITOLAK' : 'MENUNGGU'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex flex-col gap-2">
                                        {r.status === RegistrationStatus.PENDING && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleStatusUpdate(r.id, RegistrationStatus.APPROVED)} className="p-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border-2 border-green-600 rounded-lg transition-colors" title="Setujui"><CheckCircle className="w-4 h-4"/></button>
                                                <button onClick={() => handleStatusUpdate(r.id, RegistrationStatus.REJECTED)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border-2 border-red-600 rounded-lg transition-colors" title="Tolak"><XCircle className="w-4 h-4"/></button>
                                            </div>
                                        )}
                                        {r.status === RegistrationStatus.APPROVED && (
                                            <button 
                                                onClick={() => handleSendCertificate(r.id)} 
                                                disabled={processingCert === r.id}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B1CDE] text-white hover:bg-[#DFFF00] hover:text-[#2B427A] border-2 border-[#2B427A] transition-colors shadow-[2px_2px_0px_0px_#2B427A] text-xs font-bold w-fit ${processingCert === r.id ? 'opacity-50' : ''}`}
                                            >
                                                {processingCert === r.id ? <Loader className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3" />} SERTIFIKAT
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
     </div>
  );

  const renderEventsList = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Acara Anda</h2>
                  <p className="text-gray-500 mt-1 font-bold">Kelola semua acara yang aktif dan draf</p>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] px-6 py-3 rounded-lg font-black flex items-center gap-2 hover:bg-white transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none animate-scale-up">
                  <Plus className="w-5 h-5" /> BUAT ACARA
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events.map(event => (
                  <div key={event.id} className={`bg-white p-6 rounded-xl border-2 transition-all group ${event.isOpen ? 'border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A]' : 'border-gray-300 shadow-none opacity-80'}`}>
                      <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border-2 border-inherit relative">
                              <img src={event.bannerUrl} alt="" className="w-full h-full object-cover" />
                              <button onClick={() => handleEditClick(event)} className="absolute bottom-1 right-1 p-1.5 bg-[#DFFF00] text-[#2B427A] rounded-lg border-2 border-[#2B427A] hover:bg-white transition-colors" title="Edit Acara">
                                  <Pencil className="w-4 h-4" />
                              </button>
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                  <h3 className="font-black text-lg text-[#2B427A] truncate uppercase mb-1">{event.title}</h3>
                                  <div className="flex gap-1">
                                      <button onClick={()=>handleToggleStatus(event.id)} className={`p-1.5 rounded-lg border-2 ${event.isOpen ? 'text-green-600 border-green-600 hover:bg-green-50' : 'text-gray-400 border-gray-400 hover:bg-gray-100'}`} title={event.isOpen ? "Nonaktifkan" : "Aktifkan"}>
                                          <Power className="w-4 h-4" />
                                      </button>
                                      <button onClick={()=>handleDeleteEvent(event.id)} className="p-1.5 rounded-lg border-2 border-red-200 text-red-400 hover:text-red-600 hover:border-red-600 hover:bg-red-50" title="Hapus Permanen">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                              <p className="text-sm text-gray-500 font-bold mb-2">{new Date(event.date).toLocaleDateString('id-ID')}</p>
                              <div className="flex gap-2">
                                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border tracking-wider ${event.isOpen ? 'bg-green-100 text-green-700 border-green-700' : 'bg-red-100 text-red-700 border-red-700'}`}>
                                      {event.isOpen ? 'PUBLIK' : 'DRAFT/TUTUP'}
                                  </span>
                                  <button onClick={() => { const url = `${window.location.origin}/#/event/${createSlug(event.title)||event.id}`; navigator.clipboard.writeText(url); showAlert('success', 'Disalin', "Link acara disalin ke papan klip!"); }} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                      <Copy className="w-3 h-3"/> SALIN LINK
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      <CustomAlert 
          isOpen={alertState.isOpen} 
          type={alertState.type} 
          title={alertState.title} 
          message={alertState.message} 
          onClose={closeAlert}
          onConfirm={alertState.onConfirm}
          confirmText={alertState.confirmText}
      />

      <aside className="w-full md:w-72 bg-[#2B427A] border-r-2 border-[#2B427A] h-auto md:min-h-screen sticky top-0 text-white z-10">
        <div className="p-8 border-b-2 border-white/10">
          <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-tighter">
            ADMIN PANEL <div className="w-3 h-3 bg-[#DFFF00]"></div>
          </h1>
          <div className="mt-4 text-xs bg-[#0B1CDE] p-2 rounded text-white font-mono">
            {session?.email}
          </div>
        </div>
        <nav className="p-6 space-y-3">
            {[
                {id: 'overview', label: 'Ringkasan', icon: LayoutDashboard},
                {id: 'events', label: 'Acara', icon: CalendarIcon},
                {id: 'registrations', label: 'Pendaftaran', icon: UsersIcon},
                {id: 'settings', label: 'Pembayaran', icon: CreditCard},
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full text-left px-5 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 font-black border-2 uppercase tracking-wide ${activeTab === item.id ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A] shadow-[4px_4px_0px_0px_#000] transform -translate-y-1' : 'text-white border-transparent hover:bg-white/10'}`}>
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#2B427A]' : 'text-[#DFFF00]'}`} />
                    {item.label}
                </button>
            ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {loading && <div className="mb-6 bg-[#DFFF00] text-[#2B427A] px-4 py-2 rounded-lg inline-flex items-center gap-2 font-black border-2 border-[#2B427A]"><Loader className="w-4 h-4 animate-spin"/> MEMUAT DATA...</div>}
        
        {activeTab === 'events' && renderEventsList()}
        {activeTab === 'settings' && renderPaymentSettings()}
        {activeTab === 'registrations' && renderRegistrations()}
        {activeTab === 'overview' && (
             <div className="grid grid-cols-3 gap-6 animate-fade-in">
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><h3 className="text-gray-400 font-bold text-xs uppercase">Total Acara</h3><p className="text-4xl font-black text-[#2B427A]">{events.length}</p></div>
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><h3 className="text-gray-400 font-bold text-xs uppercase">Pendaftar</h3><p className="text-4xl font-black text-[#0B1CDE]">{registrations.length}</p></div>
             </div>
        )}
      </main>
      
      {showCreateModal && renderCreateEventWizard()}
    </div>
  );
};

export default AdminDashboard;
