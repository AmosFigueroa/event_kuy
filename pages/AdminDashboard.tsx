
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil, Save, PlusSquare, Move, Type, MapPin, Tag, AlignLeft, DollarSign, Hash, MousePointer2 } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession, createSlug, deleteEvent, toggleEventStatus, savePaymentSettings, fetchPaymentSettings, updateEvent, fetchCertificateSettings, saveCertificateSettings } from '../services/api';
import { generateEventDescription } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus, FormField, FormFieldType, PaymentSettings, BankAccount, CertificateConfig, CertificateElement } from '../types';
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
  
  // Settings Tab State
  const [settingsTab, setSettingsTab] = useState<'payment' | 'certificate'>('payment');
  
  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ bankAccounts: [], qrisUrl: '' });
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  
  // Certificate Default Settings State
  const [certDefaults, setCertDefaults] = useState({ signer1Name: '', signer1Role: '', signer2Name: '', signer2Role: '', templateUrl: '' });
  const [certTemplateFile, setCertTemplateFile] = useState<File | null>(null);
  const [savingCertSettings, setSavingCertSettings] = useState(false);
  
  // Bank Account Form State
  const [tempAccount, setTempAccount] = useState<BankAccount>({ id: '', bankName: '', accountNumber: '', accountHolder: '' });
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  // New/Edit Event Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track ID for editing
  const [wizardStep, setWizardStep] = useState(1);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    category: EventCategory.SEMINAR,
    price: 0,
    maxParticipants: 100,
    formFields: [],
    time: '09:00', // Default time
    certificateConfig: { backgroundUrl: '', elements: [] }
  });
  const [customCategory, setCustomCategory] = useState(''); 
  const [isCustomCat, setIsCustomCat] = useState(false);
  
  // Banner State
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // CERTIFICATE DESIGNER STATE
  const [certBgFile, setCertBgFile] = useState<File | null>(null);
  const [certBgPreview, setCertBgPreview] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [initialPos, setInitialPos] = useState<{x: number, y: number} | null>(null);
  
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  
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
      const [evts, regs, payment, certs] = await Promise.all([
          fetchEvents(), 
          fetchRegistrations(), 
          fetchPaymentSettings(),
          fetchCertificateSettings()
      ]);
      setEvents(evts || []);
      setRegistrations(regs || []);
      setPaymentSettings(payment || { bankAccounts: [], qrisUrl: '' });
      setCertDefaults(certs || { signer1Name: '', signer1Role: '', signer2Name: '', signer2Role: '', templateUrl: '' });
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CERTIFICATE DESIGNER LOGIC ---
  const addCertElement = (type: 'text' | 'dynamic', field: string, label: string) => {
      const newEl: CertificateElement = {
          id: Date.now().toString(),
          type,
          field,
          label: label || 'Text Baru',
          x: 500, // Center approx
          y: 400,
          fontSize: 24,
          fontFamily: 'Helvetica',
          color: '#000000',
          fontWeight: 'bold',
          align: 'center',
          width: 300
      };
      const currentConfig = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
      setNewEvent({
          ...newEvent,
          certificateConfig: {
              ...currentConfig,
              elements: [...currentConfig.elements, newEl]
          }
      });
      setActiveElementId(newEl.id);
  };
  
  const updateCertElement = (id: string, props: Partial<CertificateElement>) => {
      if (!newEvent.certificateConfig) return;
      const updatedElements = newEvent.certificateConfig.elements.map(el => 
          el.id === id ? { ...el, ...props } : el
      );
      setNewEvent({
          ...newEvent,
          certificateConfig: { ...newEvent.certificateConfig, elements: updatedElements }
      });
  };

  const removeCertElement = (id: string) => {
      if (!newEvent.certificateConfig) return;
      setNewEvent({
          ...newEvent,
          certificateConfig: { 
              ...newEvent.certificateConfig, 
              elements: newEvent.certificateConfig.elements.filter(e => e.id !== id) 
          }
      });
      setActiveElementId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elId: string) => {
      e.stopPropagation();
      setActiveElementId(elId);
      const el = newEvent.certificateConfig?.elements.find(e => e.id === elId);
      if(el) {
          setDragStart({ x: e.clientX, y: e.clientY });
          setInitialPos({ x: el.x, y: el.y });
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (dragStart && initialPos && activeElementId) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          // Scale logic could be added here if canvas isn't 1:1, currently strictly pixels
          updateCertElement(activeElementId, { x: initialPos.x + dx, y: initialPos.y + dy });
      }
  };

  const handleCanvasMouseUp = () => {
      setDragStart(null);
      setInitialPos(null);
  };

  const handleCertBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setCertBgFile(file);
          const r = new FileReader();
          r.onload = () => setCertBgPreview(r.result as string);
          r.readAsDataURL(file);
      }
  };
  
  // ... (Event Handlers: handleGenerateDescription, handleBannerChange, handleCreateOrUpdateEvent, etc.)
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
        const msg = err.message || "Gagal membuat deskripsi. Coba lagi nanti.";
        showAlert('error', 'AI Error', msg);
    } finally {
        setGeneratingDesc(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              showAlert('error', 'File Terlalu Besar', "Ukuran gambar maksimal 5MB.");
              return;
          }
          setBannerFile(file);
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
    if (!newEvent.title || !newEvent.date) { showAlert('error', 'Validasi Gagal', "Judul dan Tanggal wajib diisi."); return; }
    if (!editingId && !bannerFile) { showAlert('error', 'Validasi Gagal', "Gambar banner wajib diunggah untuk acara baru."); return; }
    
    const finalEventData = { ...newEvent };
    if (isCustomCat && customCategory) finalEventData.category = customCategory;

    setIsSubmittingEvent(true);
    
    const submit = async (bannerBase64?: string, certBgBase64?: string) => {
        try {
            if (editingId) {
                await updateEvent({ ...finalEventData, id: editingId }, bannerBase64, certBgBase64);
            } else {
                if (!bannerBase64) throw new Error("Missing banner for create");
                await createEvent(finalEventData as any, bannerBase64, certBgBase64);
            }
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

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    try {
        const bannerB64 = bannerFile ? await readFile(bannerFile) : undefined;
        const certBgB64 = certBgFile ? await readFile(certBgFile) : undefined;
        await submit(bannerB64, certBgB64);
    } catch (e) {
        setIsSubmittingEvent(false);
        showAlert('error', 'File Error', "Gagal membaca file.");
    }
  };

  const resetWizard = () => {
      setWizardStep(1);
      setNewEvent({ category: EventCategory.SEMINAR, price: 0, maxParticipants: 100, formFields: [], time: '09:00', certificateConfig: { backgroundUrl: '', elements: [] } });
      setBannerFile(null);
      setBannerPreview(null);
      setCertBgFile(null);
      setCertBgPreview(null);
      setCustomCategory('');
      setIsCustomCat(false);
      setEditingId(null);
  };

  const handleEditClick = (event: Event) => {
      setEditingId(event.id);
      setNewEvent({
          title: event.title,
          category: event.category,
          date: new Date(event.date).toISOString().split('T')[0],
          time: event.time,
          location: event.location,
          description: event.description,
          price: event.price,
          maxParticipants: event.maxParticipants,
          formFields: event.formFields || [],
          certificateConfig: event.certificateConfig || { backgroundUrl: '', elements: [] }
      });
      setBannerPreview(event.bannerUrl);
      if(event.certificateConfig?.backgroundUrl) setCertBgPreview(event.certificateConfig.backgroundUrl);
      
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
        } catch(e) { showAlert('error', 'Gagal', "Gagal menghapus acara."); }
    }, "YA, HAPUS");
  };

  const handleToggleStatus = async (id: string) => {
    try {
        const res = await toggleEventStatus(id);
        setEvents(events.map(e => e.id === id ? {...e, isOpen: res.isOpen} : e));
        showAlert('success', 'Status Diubah', `Acara kini ${res.isOpen ? 'AKTIF (Publik)' : 'NON-AKTIF (Draft)'}`);
    } catch(e) { showAlert('error', 'Gagal', "Gagal mengubah status."); }
  };
  
  // --- ACCOUNT & PAYMENT HANDLERS ---
  const handleAddAccount = () => {
    if(!tempAccount.bankName || !tempAccount.accountNumber || !tempAccount.accountHolder) {
        showAlert('error', 'Gagal', 'Mohon lengkapi data rekening.'); return;
    }
    const newAcc = { ...tempAccount, id: Date.now().toString() };
    setPaymentSettings(prev => ({...prev, bankAccounts: [...prev.bankAccounts, newAcc]}));
    setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' });
  };

  const handleUpdateAccount = () => {
     setPaymentSettings(prev => ({
         ...prev,
         bankAccounts: prev.bankAccounts.map(acc => acc.id === tempAccount.id ? tempAccount : acc)
     }));
     setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' });
     setIsEditingAccount(false);
  };

  const handleEditAccountClick = (acc: BankAccount) => {
      setTempAccount(acc);
      setIsEditingAccount(true);
  };

  const handleDeleteAccount = (id: string) => {
      setPaymentSettings(prev => ({ ...prev, bankAccounts: prev.bankAccounts.filter(a => a.id !== id) }));
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
          reader.onload = () => { qrisBase64 = (reader.result as string).split(',')[1]; submit(); };
      } else { submit(); }
  };
  
  // --- CERTIFICATE SETTINGS HANDLER ---
  const handleSaveCertSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingCertSettings(true);
      let tplBase64 = undefined;
      
      const submit = async () => {
          try {
              const res = await saveCertificateSettings(certDefaults, tplBase64);
              if(res) {
                 setCertDefaults(prev => ({...prev, templateUrl: (res as any).templateUrl}));
                 showAlert('success', 'Tersimpan', "Pengaturan sertifikat default berhasil diperbarui!");
              }
          } catch(e) { showAlert('error', 'Gagal', "Gagal menyimpan pengaturan sertifikat."); }
          finally { setSavingCertSettings(false); }
      };

      if (certTemplateFile) {
          const reader = new FileReader();
          reader.readAsDataURL(certTemplateFile);
          reader.onload = () => { tplBase64 = (reader.result as string).split(',')[1]; submit(); };
      } else { submit(); }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try {
        await updateRegistrationStatus(id, status);
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) { showAlert('error', 'Gagal', "Gagal memperbarui status"); }
  };

  const handleSendCertificate = async (id: string) => {
    setProcessingCert(id);
    try {
      await sendCertificate(id);
      showAlert('success', 'Terkirim', "Sertifikat berhasil dikirim melalui email!");
    } catch (e: any) { showAlert('error', 'Gagal', "Gagal mengirim sertifikat: " + e.message); } 
    finally { setProcessingCert(null); }
  };

  // --- WIZARD HANDLERS & Renderers (addFormField, updateFormField, removeFormField, etc) are reused
  const addFormField = () => {
      const newField: FormField = { id: Date.now().toString(), label: '', type: 'text', required: false };
      setNewEvent({...newEvent, formFields: [...(newEvent.formFields || []), newField]});
  };
  const updateFormField = (index: number, field: Partial<FormField>) => {
      const updated = [...(newEvent.formFields || [])]; updated[index] = { ...updated[index], ...field };
      setNewEvent({...newEvent, formFields: updated});
  };
  const removeFormField = (index: number) => {
      const updated = [...(newEvent.formFields || [])]; updated.splice(index, 1);
      setNewEvent({...newEvent, formFields: updated});
  };
  
  const certDataFields = [
      { id: 'userName', label: 'Nama Peserta' },
      { id: 'eventTitle', label: 'Judul Acara' },
      { id: 'date', label: 'Tanggal Acara' },
      { id: 'id', label: 'ID Sertifikat' },
      ...(newEvent.formFields || []).map(f => ({ id: `custom:${f.label}`, label: `Data: ${f.label}` }))
  ];

  // RENDER SECTIONS
  const renderCreateEventWizard = () => (
      // ... (Wizard UI Code from previous message - no changes needed to wizard logic itself)
      <div className="fixed inset-0 bg-[#2B427A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border-4 border-[#DFFF00] animate-scale-up">
              {/* Header */}
              <div className="bg-gray-50 px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tight">{editingId ? 'Edit Acara' : 'Buat Acara Baru'}</h2>
                      <div className="flex gap-2 mt-2">
                          {[1,2,3,4,5].map(step => (
                              <div key={step} className={`h-2 w-12 rounded-full transition-all duration-300 ${step <= wizardStep ? 'bg-[#0B1CDE]' : 'bg-gray-200'}`} />
                          ))}
                      </div>
                  </div>
                  <button onClick={() => { setShowCreateModal(false); resetWizard(); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-8 h-8" /></button>
              </div>

              {/* Wizard Body - Reused from previous, keeping it concise */}
              <div className="p-8 overflow-y-auto flex-1 bg-white relative">
                 {/* ... Step 1, 2, 3, 4 Logic ... */}
                 {wizardStep === 1 && (
                      <div className="space-y-6 animate-fade-in">
                          <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 1: Informasi Dasar</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label><div className="relative"><Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" placeholder="Nama Event..." /></div></div>
                              <div>
                                  <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label>
                                  <div className="relative">
                                      <Tag className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                      <select value={isCustomCat ? 'OTHER' : newEvent.category} onChange={(e) => { if (e.target.value === 'OTHER') { setIsCustomCat(true); setNewEvent({...newEvent, category: ''}); } else { setIsCustomCat(false); setNewEvent({...newEvent, category: e.target.value}); } }} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold bg-white text-[#2B427A] appearance-none">{Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}<option value="OTHER">Lainnya (Custom)...</option></select>
                                  </div>
                                  {isCustomCat && (<div className="mt-3 animate-fade-in"><input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full border-2 border-[#DFFF00] rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold bg-[#F8FAFC]" placeholder="Contoh: Talkshow" /></div>)}
                              </div>
                              <div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label><div className="relative"><CalendarIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div>
                              <div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu</label><div className="relative"><Clock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="time" value={newEvent.time||'09:00'} onChange={e=>setNewEvent({...newEvent, time:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div>
                          </div>
                      </div>
                 )}
                 {/* ... Other Steps ... */}
                 {wizardStep === 2 && (
                      <div className="space-y-6 animate-fade-in">
                           <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 2: Detail & Media</h3>
                           <div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label><div className="relative"><MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" placeholder="Tempat pelaksanaan..." /></div></div>
                           <div><div className="flex justify-between mb-2"><label className="text-sm font-black text-[#2B427A] uppercase">Deskripsi</label><button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs bg-[#DFFF00] px-3 py-1 rounded-lg font-black text-[#2B427A] border border-[#2B427A] flex items-center gap-1 hover:bg-white transition-colors shadow-sm"><Sparkles className="w-3 h-3"/> {generatingDesc ? 'MEMBUAT...' : 'AI GENERATE'}</button></div><div className="relative"><AlignLeft className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><textarea rows={6} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-medium text-sm leading-relaxed resize-none text-[#2B427A]" placeholder="Jelaskan detail acara..."/></div></div>
                           <div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Banner Acara</label><div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-colors duration-200 group overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center"><input type="file" accept="image/*" onChange={handleBannerChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />{bannerPreview ? (<div className="relative w-full h-full"><img src={bannerPreview} alt="Preview" className="max-h-[300px] w-full object-contain rounded-lg shadow-md" /><button onClick={handleRemoveBanner} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full z-20 hover:bg-red-600 shadow-lg" title="Hapus Gambar"><Trash className="w-4 h-4"/></button></div>) : (<div className="flex flex-col items-center group-hover:scale-105 transition-transform"><ImageIcon className="w-12 h-12 text-gray-400 mb-2 group-hover:text-[#0B1CDE]"/><span className="font-bold text-gray-500 group-hover:text-[#2B427A]">Klik untuk unggah Banner (Max 5MB)</span><span className="text-xs text-gray-400 mt-1">Format: JPG, PNG</span></div>)}</div></div>
                      </div>
                 )}
                 {wizardStep === 3 && (
                      <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center"><h3 className="text-lg font-black text-gray-400 uppercase">Tahap 3: Form Pendaftaran</h3><button onClick={addFormField} className="text-sm bg-[#0B1CDE] text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A] transition-transform active:scale-95"><PlusCircle className="w-4 h-4"/> TAMBAH FIELD</button></div>
                          <div className="space-y-3">{newEvent.formFields?.map((field, idx) => (<div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 animate-scale-up"><div className="flex-1 space-y-3"><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Label" value={field.label} onChange={e=>updateFormField(idx, {label: e.target.value})} className="border rounded-lg p-2 text-sm font-bold outline-none focus:border-blue-500" /><select value={field.type} onChange={e=>updateFormField(idx, {type: e.target.value as any})} className="border rounded-lg p-2 text-sm font-bold outline-none bg-white"><option value="text">Teks</option><option value="number">Angka</option><option value="email">Email</option><option value="textarea">TextArea</option><option value="select">Pilihan</option></select></div>{field.type === 'select' && <input type="text" placeholder="Opsi..." value={field.options?.join(',')} onChange={e=>updateFormField(idx, {options: e.target.value.split(',')})} className="w-full border rounded-lg p-2 text-sm outline-none" />}<div className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={e=>updateFormField(idx, {required: e.target.checked})} id={`req-${idx}`} className="w-4 h-4"/><label htmlFor={`req-${idx}`} className="text-sm font-bold text-gray-600">Wajib Diisi</label></div></div><button onClick={()=>removeFormField(idx)} className="text-red-400 hover:text-red-600 p-2"><MinusCircle className="w-6 h-6"/></button></div>))}{(!newEvent.formFields || newEvent.formFields.length === 0) && <div className="text-center py-8 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">Belum ada field tambahan.</div>}</div>
                      </div>
                  )}
                 {wizardStep === 4 && (
                      <div className="space-y-6 animate-fade-in">
                          <h3 className="text-lg font-black text-gray-400 uppercase">Tahap 4: Harga & Review</h3>
                          <div className="grid grid-cols-2 gap-6"><div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-black text-[#2B427A] uppercase">Harga Tiket</label><div className="flex items-center gap-2"><span className={`text-xs font-bold ${newEvent.price === 0 ? 'text-green-600' : 'text-gray-400'}`}>GRATIS?</span><button onClick={() => setNewEvent({...newEvent, price: newEvent.price === 0 ? 10000 : 0})} className={`w-10 h-5 rounded-full relative transition-colors ${newEvent.price === 0 ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${newEvent.price === 0 ? 'left-6' : 'left-1'}`} /></button></div></div><div className={`relative flex items-center border-2 rounded-xl overflow-hidden transition-all ${newEvent.price === 0 ? 'bg-gray-100 border-gray-200' : 'bg-white border-[#2B427A]'}`}><DollarSign className={`absolute left-4 w-5 h-5 ${newEvent.price === 0 ? 'text-gray-400' : 'text-[#2B427A]'}`} /><input type="number" disabled={newEvent.price === 0} value={newEvent.price === 0 ? '' : newEvent.price} onChange={e=>setNewEvent({...newEvent, price: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3 outline-none font-black text-xl text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={newEvent.price === 0 ? "GRATIS" : "0"}/></div></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kuota Peserta</label><div className="relative"><UsersIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="number" value={newEvent.maxParticipants} onChange={e=>setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-black text-lg text-[#2B427A]" /></div></div></div>
                          <div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-200 mt-4"><h4 className="font-black text-[#2B427A] mb-2 uppercase">Ringkasan Acara</h4><div className="grid grid-cols-2 gap-4 mt-2"><div><p className="text-xs text-gray-500 font-bold uppercase">Judul</p><p className="text-sm font-black text-[#0B1CDE]">{newEvent.title}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Kategori</p><p className="text-sm font-bold text-gray-700">{isCustomCat ? customCategory : newEvent.category}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Jadwal</p><p className="text-sm font-bold text-gray-700">{newEvent.date} @ {newEvent.time}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Lokasi</p><p className="text-sm font-bold text-gray-700">{newEvent.location}</p></div></div></div>
                      </div>
                  )}
                 {wizardStep === 5 && (
                      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
                          <h3 className="text-lg font-black text-gray-400 uppercase mb-4">Tahap 5: Desain Sertifikat</h3>
                          <div className="flex gap-4 h-full overflow-hidden">
                              <div className="w-64 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase block mb-2">Upload Template</label><div className="relative border-2 border-dashed border-[#2B427A] rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50 transition-colors"><input type="file" accept="image/*" onChange={handleCertBgChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><span className="text-xs font-bold text-[#2B427A] block">Pilih Gambar</span><span className="text-[10px] text-gray-500">A4 Landscape</span></div></div>
                                  <div className="border-t pt-4"><label className="text-xs font-bold text-gray-500 uppercase block mb-2">Tambah Elemen</label><div className="grid grid-cols-1 gap-2"><button onClick={() => addCertElement('text', 'text', 'Label Statis')} className="flex items-center gap-2 px-3 py-2 bg-white border rounded hover:border-[#0B1CDE] text-sm font-bold text-gray-700"><Type className="w-4 h-4"/> Teks Statis</button>{certDataFields.map(f => (<button key={f.id} onClick={() => addCertElement('dynamic', f.id, f.label)} className="flex items-center gap-2 px-3 py-2 bg-[#F0F9FF] border border-blue-200 rounded hover:border-[#0B1CDE] text-sm font-bold text-[#2B427A] text-left truncate"><PlusSquare className="w-4 h-4 flex-shrink-0"/> {f.label}</button>))}</div></div>
                                  {activeElementId && (<div className="border-t pt-4 space-y-3 animate-fade-in"><label className="text-xs font-bold text-[#0B1CDE] uppercase block">Edit Elemen</label><button onClick={() => removeCertElement(activeElementId)} className="w-full py-2 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200 mt-2">Hapus</button></div>)}
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-xl overflow-auto flex items-center justify-center p-8 relative">
                                  <div ref={canvasRef} className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 select-none" style={{ width: '842px', height: '595px' }} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
                                      {certBgPreview ? (<img src={certBgPreview} className="w-full h-full object-cover pointer-events-none" />) : (<div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-4xl border-4 border-dashed border-gray-300">TEMPLATE BACKGROUND</div>)}
                                      {newEvent.certificateConfig?.elements.map(el => (<div key={el.id} className={`absolute cursor-move hover:outline hover:outline-2 hover:outline-blue-400 ${activeElementId === el.id ? 'outline outline-2 outline-[#0B1CDE]' : ''}`} style={{ left: el.x, top: el.y, color: el.color, fontSize: `${el.fontSize}px`, fontFamily: el.fontFamily, fontWeight: el.fontWeight, textAlign: el.align, width: el.width ? `${el.width}px` : 'auto', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }} onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}>{el.type === 'dynamic' ? `{${el.label}}` : el.field}</div>))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
              <div className="p-6 bg-gray-50 border-t-2 border-gray-100 flex justify-between">
                  {wizardStep > 1 ? <button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2 transition-colors"><ChevronLeft className="w-5 h-5"/> KEMBALI</button> : <div/>}
                  {wizardStep < 5 ? <button onClick={()=>setWizardStep(prev=>prev+1)} className="px-6 py-3 rounded-xl font-black bg-[#2B427A] text-white hover:bg-[#0B1CDE] flex items-center gap-2 transition-all shadow-lg hover:translate-y-[-2px]">SELANJUTNYA <ChevronRight className="w-5 h-5"/></button> : <button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-8 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:bg-white flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:shadow-[2px_2px_0px_0px_#2B427A] disabled:opacity-50 disabled:cursor-not-allowed">{isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} {editingId ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN ACARA'}</button>}
              </div>
          </div>
      </div>
  );

  const renderSettings = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Pengaturan Sistem</h2>
          </div>
          
          {/* Tab Headers */}
          <div className="flex gap-4 border-b-2 border-gray-200 pb-1">
              <button onClick={()=>setSettingsTab('payment')} className={`px-4 py-2 font-bold text-sm uppercase transition-colors rounded-t-lg ${settingsTab === 'payment' ? 'text-[#2B427A] border-b-4 border-[#2B427A] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}>
                  Pembayaran
              </button>
              <button onClick={()=>setSettingsTab('certificate')} className={`px-4 py-2 font-bold text-sm uppercase transition-colors rounded-t-lg ${settingsTab === 'certificate' ? 'text-[#2B427A] border-b-4 border-[#2B427A] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}>
                  Sertifikat (Default)
              </button>
          </div>

          <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A]">
               {settingsTab === 'payment' ? (
                   <form onSubmit={handleSavePaymentSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                       <div className="space-y-6">
                           <div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-100">
                               <h3 className="font-black text-[#2B427A] uppercase mb-4 flex items-center gap-2">
                                   <PlusSquare className="w-5 h-5"/> {isEditingAccount ? 'Edit Rekening' : 'Tambah Rekening'}
                               </h3>
                               <div className="space-y-4">
                                   <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Bank</label><input type="text" value={tempAccount.bankName} onChange={e=>setTempAccount({...tempAccount, bankName: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Contoh: BCA" /></div>
                                   <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nomor Rekening</label><input type="text" value={tempAccount.accountNumber} onChange={e=>setTempAccount({...tempAccount, accountNumber: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="1234xxxx" /></div>
                                   <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Atas Nama</label><input type="text" value={tempAccount.accountHolder} onChange={e=>setTempAccount({...tempAccount, accountHolder: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Nama Pemilik" /></div>
                                   <button type="button" onClick={isEditingAccount ? handleUpdateAccount : handleAddAccount} className="w-full py-2 bg-[#2B427A] text-white font-bold rounded-lg hover:bg-[#0B1CDE] transition-colors uppercase text-sm">{isEditingAccount ? 'Update Rekening' : 'Tambah ke Daftar'}</button>
                                   {isEditingAccount && (<button type="button" onClick={() => { setIsEditingAccount(false); setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' }); }} className="w-full py-2 bg-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-300 transition-colors uppercase text-sm mt-2">Batal</button>)}
                               </div>
                           </div>
                           <div>
                               <label className="block text-sm font-black text-[#2B427A] mb-3 uppercase">Daftar Rekening</label>
                               <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                   {paymentSettings.bankAccounts.length === 0 && (<p className="text-gray-400 text-sm font-medium italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">Belum ada rekening ditambahkan.</p>)}
                                   {paymentSettings.bankAccounts.map((acc, idx) => (<div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center group hover:border-[#2B427A] transition-colors"><div><div className="font-black text-[#2B427A] uppercase">{acc.bankName}</div><div className="text-sm font-bold text-gray-600">{acc.accountNumber}</div><div className="text-xs text-gray-400 uppercase">{acc.accountHolder}</div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button type="button" onClick={() => handleEditAccountClick(acc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4"/></button><button type="button" onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button></div></div>))}
                               </div>
                           </div>
                       </div>
                       <div className="space-y-4">
                           <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">QRIS (Scan Payment)</label>
                           <div className="border-2 border-dashed border-[#2B427A]/30 rounded-xl p-6 text-center bg-gray-50 hover:bg-[#F0F9FF] cursor-pointer relative h-64 flex items-center justify-center group"><input type="file" accept="image/*" onChange={e=>setQrisFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />{qrisFile ? (<div className="text-green-600 font-bold">{qrisFile.name}</div>) : (paymentSettings.qrisUrl ? (<div className="relative w-full h-full"><img src={paymentSettings.qrisUrl} alt="QRIS" className="w-full h-full object-contain" /><div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="font-bold text-[#2B427A]">Klik untuk ganti QRIS</span></div></div>) : <div className="text-gray-400 font-bold"><Upload className="w-8 h-8 mx-auto mb-2"/>Upload QRIS Image</div>)}</div>
                       </div>
                       <div className="md:col-span-2 pt-6 border-t-2 border-gray-100"><button type="submit" disabled={savingPayment} className="w-full py-4 bg-[#0B1CDE] text-white font-black rounded-xl hover:bg-[#2B427A] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none">{savingPayment ? <Loader className="animate-spin"/> : <Save/>} SIMPAN PENGATURAN PEMBAYARAN</button></div>
                   </form>
               ) : (
                   <form onSubmit={handleSaveCertSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                       <div className="md:col-span-2 bg-[#F0F9FF] p-4 rounded-lg border border-blue-200 mb-4">
                          <p className="text-sm text-[#2B427A] font-bold">Catatan: Pengaturan ini berlaku sebagai Default (Template Awal) saat membuat acara baru. Untuk mengubah sertifikat acara tertentu, gunakan menu Edit Acara.</p>
                       </div>
                       <div className="space-y-4">
                          <h3 className="font-black text-[#2B427A] uppercase mb-4 border-b pb-2">Penanda Tangan 1</h3>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Lengkap</label><input type="text" value={certDefaults.signer1Name} onChange={e=>setCertDefaults({...certDefaults, signer1Name: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Misal: Dr. Budi Santoso" /></div>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Jabatan</label><input type="text" value={certDefaults.signer1Role} onChange={e=>setCertDefaults({...certDefaults, signer1Role: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Misal: Ketua Panitia" /></div>
                       </div>
                       <div className="space-y-4">
                          <h3 className="font-black text-[#2B427A] uppercase mb-4 border-b pb-2">Penanda Tangan 2</h3>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Lengkap</label><input type="text" value={certDefaults.signer2Name} onChange={e=>setCertDefaults({...certDefaults, signer2Name: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Misal: Siti Aminah, S.Kom" /></div>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Jabatan</label><input type="text" value={certDefaults.signer2Role} onChange={e=>setCertDefaults({...certDefaults, signer2Role: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Misal: Kaprodi Bisnis Digital" /></div>
                       </div>
                       <div className="md:col-span-2 space-y-4">
                           <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Template Default Sertifikat (A4 Landscape)</label>
                           <div className="border-2 border-dashed border-[#2B427A]/30 rounded-xl p-6 text-center bg-gray-50 hover:bg-[#F0F9FF] cursor-pointer relative h-48 flex items-center justify-center group">
                               <input type="file" accept="image/*" onChange={e=>setCertTemplateFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                               {certTemplateFile ? (<div className="text-green-600 font-bold">{certTemplateFile.name}</div>) : (
                                   certDefaults.templateUrl ? (
                                       <div className="relative w-full h-full"><img src={certDefaults.templateUrl} className="w-full h-full object-contain" /><div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="font-bold text-[#2B427A]">Ganti Template Default</span></div></div>
                                   ) : <div className="text-gray-400 font-bold"><Upload className="w-8 h-8 mx-auto mb-2"/>Upload Template Default</div>
                               )}
                           </div>
                       </div>
                       <div className="md:col-span-2 pt-6 border-t-2 border-gray-100"><button type="submit" disabled={savingCertSettings} className="w-full py-4 bg-[#0B1CDE] text-white font-black rounded-xl hover:bg-[#2B427A] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none">{savingCertSettings ? <Loader className="animate-spin"/> : <Save/>} SIMPAN DEFAULT SERTIFIKAT</button></div>
                   </form>
               )}
          </div>
      </div>
  );

  const filteredRegistrations = registrations.filter(r => 
      selectedEventFilter === 'ALL' ? true : r.eventId === selectedEventFilter
  );

  const renderEventsList = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Daftar Acara</h2>
        <button onClick={() => { resetWizard(); setShowCreateModal(true); }} className="px-5 py-2.5 bg-[#0B1CDE] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#2B427A] transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none">
          <PlusCircle className="w-5 h-5"/> BUAT ACARA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] overflow-hidden group hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#2B427A] transition-all">
            <div className="h-40 bg-gray-200 relative">
               <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-black uppercase border-2 ${event.isOpen ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A]' : 'bg-gray-200 text-gray-500 border-gray-400'}`}>
                  {event.isOpen ? 'PUBLIK' : 'DRAFT'}
               </div>
            </div>
            <div className="p-5">
               <h3 className="font-black text-[#2B427A] text-lg leading-tight mb-2 line-clamp-1">{event.title}</h3>
               <div className="space-y-1 text-sm text-gray-600 font-medium mb-4">
                  <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> {new Date(event.date).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2"><UsersIcon className="w-4 h-4"/> {event.currentParticipants} / {event.maxParticipants} Peserta</div>
               </div>
               <div className="flex gap-2 pt-4 border-t-2 border-dashed border-gray-200">
                  <button onClick={() => handleEditClick(event)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3"/> EDIT</button>
                  <button onClick={() => handleToggleStatus(event.id)} className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 ${event.isOpen ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      <Power className="w-3 h-3"/> {event.isOpen ? 'TUTUP' : 'BUKA'}
                  </button>
                  <button onClick={() => handleDeleteEvent(event.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
               </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-[#2B427A]/30 rounded-xl">
                <p className="text-gray-400 font-bold">Belum ada acara dibuat.</p>
            </div>
        )}
      </div>
    </div>
  );

  const renderRegistrations = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Data Pendaftaran</h2>
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400"/>
                <select 
                    value={selectedEventFilter} 
                    onChange={e => setSelectedEventFilter(e.target.value)}
                    className="border-2 border-gray-200 rounded-lg px-3 py-2 font-bold text-[#2B427A] outline-none focus:border-[#0B1CDE]"
                >
                    <option value="ALL">Semua Acara</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b-2 border-gray-100">
                        <tr>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase">Tanggal</th>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase">Peserta</th>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase">Acara</th>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Bukti</th>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Status</th>
                            <th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRegistrations.map(reg => (
                            <tr key={reg.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 text-sm font-bold text-gray-500">{new Date(reg.registrationDate).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="font-black text-[#2B427A]">{reg.userName}</div>
                                    <div className="text-xs text-gray-400">{reg.userEmail}</div>
                                </td>
                                <td className="p-4 text-sm font-bold text-gray-600 max-w-xs truncate" title={reg.eventTitle}>{reg.eventTitle}</td>
                                <td className="p-4 text-center">
                                    {reg.proofUrl ? (
                                        <a href={reg.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0B1CDE] hover:underline">
                                            <ImageIcon className="w-3 h-3"/> LIHAT
                                        </a>
                                    ) : <span className="text-xs text-gray-400">-</span>}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                                        reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700 border-green-200' :
                                        reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-200' :
                                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                        {reg.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        {reg.status === RegistrationStatus.PENDING && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.APPROVED)} title="Setujui" className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100"><CheckCircle className="w-4 h-4"/></button>
                                                <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.REJECTED)} title="Tolak" className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"><XCircle className="w-4 h-4"/></button>
                                            </>
                                        )}
                                        {reg.status === RegistrationStatus.APPROVED && (
                                            <button onClick={() => handleSendCertificate(reg.id)} disabled={processingCert === reg.id} title="Kirim Sertifikat" className="p-2 bg-[#F0F9FF] text-[#0B1CDE] rounded hover:bg-blue-100 disabled:opacity-50">
                                                {processingCert === reg.id ? <Loader className="w-4 h-4 animate-spin"/> : <Award className="w-4 h-4"/>}
                                            </button>
                                        )}
                                        {reg.status !== RegistrationStatus.PENDING && reg.status !== RegistrationStatus.APPROVED && (
                                            <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.PENDING)} title="Reset Status" className="p-2 bg-gray-50 text-gray-500 rounded hover:bg-gray-100"><RefreshCw className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredRegistrations.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">Tidak ada data pendaftaran.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
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
                {id: 'settings', label: 'Pengaturan', icon: SettingsIcon},
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
        {activeTab === 'settings' && renderSettings()}
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
