
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil, Save, PlusSquare, Move, Type, MapPin, Tag, AlignLeft, AlignCenter, AlignRight, DollarSign, Hash, MousePointer2, FileText, Image as ImgIcon, FileSpreadsheet, Scaling } from 'lucide-react';
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
  const [certSettings, setCertSettings] = useState<CertificateConfig>({ backgroundUrl: '', elements: [] });
  const [certTemplateFile, setCertTemplateFile] = useState<File | null>(null);
  const [certSettingsBgPreview, setCertSettingsBgPreview] = useState<string | null>(null);
  const [savingCertSettings, setSavingCertSettings] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  
  // Settings Canvas Logic (Also used for resize logic tracking)
  const [settingsActiveElementId, setSettingsActiveElementId] = useState<string | null>(null);
  const settingsCanvasRef = useRef<HTMLDivElement>(null);
  const [settingsDragStart, setSettingsDragStart] = useState<{x: number, y: number} | null>(null);
  const [settingsInitialPos, setSettingsInitialPos] = useState<{x: number, y: number} | null>(null);
  
  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{x: number, y: number} | null>(null);
  const [initialResizeDims, setInitialResizeDims] = useState<{w?: number, fs?: number} | null>(null);

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

  // EVENT WIZARD CERTIFICATE DESIGNER STATE
  const [certBgFile, setCertBgFile] = useState<File | null>(null);
  const [certBgPreview, setCertBgPreview] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [initialPos, setInitialPos] = useState<{x: number, y: number} | null>(null);
  
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  
  // Time Picker Refs
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
      
      // Load Cert Settings
      const loadedCert = certs || { backgroundUrl: '', elements: [] };
      setCertSettings(loadedCert);
      if (loadedCert.backgroundUrl) setCertSettingsBgPreview(loadedCert.backgroundUrl);
      
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CERTIFICATE DESIGNER LOGIC ---
  const addSettingsCertElement = (type: 'text' | 'dynamic' | 'image', field: string, label: string) => {
      const isImage = type === 'image';
      const newEl: CertificateElement = {
          id: Date.now().toString(),
          type,
          field,
          label: label || 'Element Baru',
          x: 421, 
          y: 297,
          fontSize: isImage ? undefined : 24,
          fontFamily: isImage ? undefined : 'Helvetica',
          color: isImage ? undefined : '#000000',
          fontWeight: isImage ? undefined : 'bold',
          align: isImage ? undefined : 'center',
          textTransform: 'none',
          width: isImage ? 150 : 400,
          height: isImage ? 150 : undefined
      };
      setCertSettings(prev => ({
          ...prev,
          elements: [...prev.elements, newEl]
      }));
      setSettingsActiveElementId(newEl.id);
  };

  const updateSettingsCertElement = (id: string, props: Partial<CertificateElement>) => {
      setCertSettings(prev => ({
          ...prev,
          elements: prev.elements.map(el => el.id === id ? { ...el, ...props } : el)
      }));
  };

  const removeSettingsCertElement = (id: string) => {
      setCertSettings(prev => ({
          ...prev,
          elements: prev.elements.filter(e => e.id !== id)
      }));
      setSettingsActiveElementId(null);
  };

  const handleAddImageElement = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              addSettingsCertElement('image', reader.result as string, 'Gambar Custom');
          };
          reader.readAsDataURL(file);
      }
      e.target.value = ''; // Reset input
  };

  // --- CANVAS HANDLERS ---
  const handleSettingsCanvasMouseDown = (e: React.MouseEvent, elId: string) => {
      e.stopPropagation();
      setSettingsActiveElementId(elId);
      const el = certSettings.elements.find(e => e.id === elId);
      if(el) {
          setSettingsDragStart({ x: e.clientX, y: e.clientY });
          setSettingsInitialPos({ x: el.x, y: el.y });
      }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, elId: string, isWizard: boolean = false) => {
      e.stopPropagation();
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY });
      
      const elements = isWizard ? newEvent.certificateConfig?.elements : certSettings.elements;
      const el = elements?.find(e => e.id === elId);
      
      if (el) {
          setInitialResizeDims({ w: el.width || (el.type === 'image' ? 150 : 400), fs: el.fontSize || 24 });
      }
  };

  const handleSettingsCanvasMouseMove = (e: React.MouseEvent) => {
      if (isResizing && resizeStart && initialResizeDims && settingsActiveElementId) {
          const dx = e.clientX - resizeStart.x;
          const el = certSettings.elements.find(e => e.id === settingsActiveElementId);
          if (el) {
              if (el.type === 'image') {
                   const newWidth = Math.max(20, (initialResizeDims.w || 150) + dx);
                   updateSettingsCertElement(settingsActiveElementId, { width: newWidth });
              } else {
                   const newFs = Math.max(8, (initialResizeDims.fs || 24) + (dx / 5));
                   updateSettingsCertElement(settingsActiveElementId, { fontSize: newFs });
              }
          }
          return;
      }

      if (settingsDragStart && settingsInitialPos && settingsActiveElementId) {
          const dx = e.clientX - settingsDragStart.x;
          const dy = e.clientY - settingsDragStart.y;
          updateSettingsCertElement(settingsActiveElementId, { x: settingsInitialPos.x + dx, y: settingsInitialPos.y + dy });
      }
  };

  const handleSettingsCanvasMouseUp = () => {
      setSettingsDragStart(null);
      setSettingsInitialPos(null);
      setIsResizing(false);
      setResizeStart(null);
      setInitialResizeDims(null);
  };

  const handleSettingsCertBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setCertTemplateFile(file);
          const r = new FileReader();
          r.onload = () => setCertSettingsBgPreview(r.result as string);
          r.readAsDataURL(file);
      }
  };

  // --- WIZARD CERTIFICATE LOGIC ---
  const addWizardCertElement = (type: 'text' | 'dynamic' | 'image', field: string, label: string) => {
      const isImage = type === 'image';
      const newEl: CertificateElement = {
          id: Date.now().toString(),
          type,
          field,
          label: label || 'Element',
          x: 421, y: 297,
          fontSize: isImage ? undefined : 24,
          fontFamily: isImage ? undefined : 'Helvetica',
          color: isImage ? undefined : '#000000',
          fontWeight: isImage ? undefined : 'bold',
          align: isImage ? undefined : 'center',
          textTransform: 'none',
          width: isImage ? 150 : 400,
      };
      const current = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
      setNewEvent({ ...newEvent, certificateConfig: { ...current, elements: [...current.elements, newEl] } });
      setActiveElementId(newEl.id);
  };

  const updateWizardCertElement = (id: string, props: Partial<CertificateElement>) => {
      if (!newEvent.certificateConfig) return;
      const updated = newEvent.certificateConfig.elements.map(el => el.id === id ? { ...el, ...props } : el);
      setNewEvent({ ...newEvent, certificateConfig: { ...newEvent.certificateConfig, elements: updated } });
  };

  const removeWizardCertElement = (id: string) => {
      if (!newEvent.certificateConfig) return;
      const updated = newEvent.certificateConfig.elements.filter(el => el.id !== id);
      setNewEvent({ ...newEvent, certificateConfig: { ...newEvent.certificateConfig, elements: updated } });
      setActiveElementId(null);
  };

  const handleWizardCanvasMouseMove = (e: React.MouseEvent) => {
      if (isResizing && resizeStart && initialResizeDims && activeElementId && newEvent.certificateConfig) {
          const dx = e.clientX - resizeStart.x;
          const el = newEvent.certificateConfig.elements.find(e => e.id === activeElementId);
          if (el) {
              if (el.type === 'image') {
                   const newWidth = Math.max(20, (initialResizeDims.w || 150) + dx);
                   updateWizardCertElement(activeElementId, { width: newWidth });
              } else {
                   const newFs = Math.max(8, (initialResizeDims.fs || 24) + (dx / 5));
                   updateWizardCertElement(activeElementId, { fontSize: newFs });
              }
          }
          return;
      }

      if (dragStart && initialPos && activeElementId) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          updateWizardCertElement(activeElementId, { x: initialPos.x + dx, y: initialPos.y + dy });
      }
  };

  const handleWizardCanvasMouseDown = (e: React.MouseEvent, elId: string) => {
      e.stopPropagation();
      setActiveElementId(elId);
      const el = newEvent.certificateConfig?.elements.find(e => e.id === elId);
      if(el) {
          setDragStart({ x: e.clientX, y: e.clientY });
          setInitialPos({ x: el.x, y: el.y });
      }
  };

  const handleWizardCanvasMouseUp = () => {
      setDragStart(null); setInitialPos(null);
      setIsResizing(false); setResizeStart(null); setInitialResizeDims(null);
  };
  
  // --- EVENT HANDLERS ---
  const handleGenerateDescription = async () => {
    if (!newEvent.title) { showAlert('error', 'Validasi Gagal', "Isi judul acara."); return; }
    setGeneratingDesc(true);
    try {
        const cat = isCustomCat ? customCategory : (newEvent.category || "Umum");
        const desc = await generateEventDescription(newEvent.title, cat, `Lokasi: ${newEvent.location}, Tanggal: ${newEvent.date}`);
        setNewEvent(prev => ({...prev, description: desc}));
    } catch (err: any) { showAlert('error', 'AI Error', err.message); } finally { setGeneratingDesc(false); }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) { setBannerFile(file); const r = new FileReader(); r.onloadend = () => setBannerPreview(r.result as string); r.readAsDataURL(file); }
  };
  const handleRemoveBanner = (e: React.MouseEvent) => { e.preventDefault(); setBannerFile(null); setBannerPreview(null); };

  const handleCreateOrUpdateEvent = async () => {
    if (!newEvent.title || !newEvent.date) { showAlert('error', 'Validasi', "Judul dan tanggal wajib."); return; }
    setIsSubmittingEvent(true);
    const readFile = (file: File): Promise<string> => new Promise((resolve) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve((r.result as string).split(',')[1]); });
    try {
        const bannerB64 = bannerFile ? await readFile(bannerFile) : undefined;
        const certBgB64 = certBgFile ? await readFile(certBgFile) : undefined;
        const finalData = { ...newEvent, category: isCustomCat ? customCategory : newEvent.category };
        if (editingId) await updateEvent({ ...finalData, id: editingId }, bannerB64, certBgB64);
        else await createEvent(finalData as any, bannerB64, certBgB64);
        setShowCreateModal(false); resetWizard(); loadData(); showAlert('success', 'Sukses', "Acara disimpan.");
    } catch(e: any) { showAlert('error', 'Gagal', e.message); } finally { setIsSubmittingEvent(false); }
  };

  const resetWizard = () => {
      setWizardStep(1); setNewEvent({ category: EventCategory.SEMINAR, price: 0, maxParticipants: 100, formFields: [], time: '09:00', certificateConfig: { backgroundUrl: '', elements: [] } });
      setBannerFile(null); setBannerPreview(null); setCertBgFile(null); setCertBgPreview(null); setEditingId(null);
  };

  const handleEditClick = (event: Event) => {
      setEditingId(event.id);
      setNewEvent({ ...event, date: new Date(event.date).toISOString().split('T')[0] });
      setBannerPreview(event.bannerUrl);
      if(event.certificateConfig?.backgroundUrl) setCertBgPreview(event.certificateConfig.backgroundUrl);
      setShowCreateModal(true);
  };
  
  const handleDeleteEvent = async (id: string) => { showConfirm('Hapus?', "Yakin?", async () => { await deleteEvent(id); loadData(); }, "HAPUS"); };
  const handleToggleStatus = async (id: string) => { await toggleEventStatus(id); loadData(); };
  
  // --- PAYMENT HANDLERS ---
  const handleAddAccount = () => { if(tempAccount.bankName) { setPaymentSettings(p=>({...p, bankAccounts: [...p.bankAccounts, {...tempAccount, id: Date.now().toString()}]})); setTempAccount({id:'', bankName:'', accountNumber:'', accountHolder:''}); }};
  const handleUpdateAccount = () => {
     setPaymentSettings(prev => ({ ...prev, bankAccounts: prev.bankAccounts.map(acc => acc.id === tempAccount.id ? tempAccount : acc) }));
     setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' }); setIsEditingAccount(false);
  };
  const handleEditAccountClick = (acc: BankAccount) => { setTempAccount(acc); setIsEditingAccount(true); };
  const handleDeleteAccount = (id: string) => { setPaymentSettings(p=>({...p, bankAccounts: p.bankAccounts.filter(a=>a.id!==id)})); };
  
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
      e.preventDefault(); 
      setSavingPayment(true);
      let qrisBase64 = undefined;
      
      const submit = async () => {
          try {
              await savePaymentSettings(paymentSettings, qrisBase64);
              showAlert('success', 'Tersimpan', "Pengaturan pembayaran diperbarui.");
          } catch(e: any) {
              showAlert('error', 'Gagal', e.message);
          } finally {
              setSavingPayment(false);
          }
      };

      if (qrisFile) {
          const r = new FileReader();
          r.readAsDataURL(qrisFile);
          r.onload = () => { qrisBase64 = (r.result as string).split(',')[1]; submit(); };
      } else {
          submit();
      }
  };

  // --- CERT SETTINGS HANDLERS ---
  const handleSaveCertSettings = async (e: React.FormEvent) => {
      e.preventDefault(); setSavingCertSettings(true);
      let tplBase64 = undefined;
      if (certTemplateFile) { const r = new FileReader(); r.readAsDataURL(certTemplateFile); r.onload = async () => { tplBase64 = (r.result as string).split(',')[1]; await saveCertificateSettings(certSettings, tplBase64); setSavingCertSettings(false); showAlert('success', 'Tersimpan', "Layout disimpan."); }; }
      else { await saveCertificateSettings(certSettings); setSavingCertSettings(false); showAlert('success', 'Tersimpan', "Layout disimpan."); }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setCsvFile(file);
          const reader = new FileReader();
          reader.onload = (evt) => {
              const text = evt.target?.result as string;
              const rows = text.split('\n').map(row => row.split(','));
              if(rows.length > 0) {
                 const headers = rows[0].map(h => h.trim());
                 const data = rows.slice(1).filter(r => r.length === headers.length).map(r => {
                     const obj: any = {}; headers.forEach((h, i) => obj[h] = r[i].trim()); return obj;
                 });
                 setCsvPreviewData(data.slice(0, 5));
                 showAlert('success', 'CSV Dimuat', `Berhasil membaca ${data.length} baris.`);
              }
          };
          reader.readAsText(file);
      }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try { 
        await updateRegistrationStatus(id, status); 
        // Update local state immediately
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r)); 
    } catch (e) { showAlert('error', 'Gagal', "Gagal update status"); }
  };

  const handleSendCertificate = async (id: string) => {
    setProcessingCert(id);
    try { await sendCertificate(id); showAlert('success', 'Terkirim', "Sertifikat dikirim!"); } 
    catch (e: any) { showAlert('error', 'Gagal', e.message); } finally { setProcessingCert(null); }
  };

  // --- RENDER HELPERS ---
  const renderElementToolbar = (activeId: string | null, configSource: CertificateConfig | undefined, updateFn: (id: string, p: Partial<CertificateElement>) => void, removeFn: (id: string) => void) => {
      if (!activeId || !configSource) return null;
      const el = configSource.elements.find(e => e.id === activeId);
      if (!el) return null;

      return (
          <div className="border-t-2 border-gray-200 pt-4 mt-auto animate-fade-in">
              <label className="text-xs font-black text-[#0B1CDE] uppercase block mb-3">Edit: {el.label}</label>
              <div className="space-y-3">
                  {el.type !== 'image' && (
                      <>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Ukuran Font</label>
                            <input type="range" min="10" max="100" value={el.fontSize || 24} onChange={(e) => updateFn(activeId, { fontSize: Number(e.target.value) })} className="w-full accent-[#0B1CDE]" />
                            <div className="text-right text-xs font-bold text-[#0B1CDE]">{Math.round(el.fontSize || 24)}px</div>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                             <span className="text-[10px] font-bold text-gray-500 uppercase">Huruf Besar (All Caps)</span>
                             <button 
                                type="button" 
                                onClick={() => updateFn(activeId, { textTransform: el.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                                className={`w-10 h-5 rounded-full relative transition-colors ${el.textTransform === 'uppercase' ? 'bg-[#0B1CDE]' : 'bg-gray-300'}`}
                             >
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${el.textTransform === 'uppercase' ? 'left-6' : 'left-1'}`} />
                             </button>
                          </div>
                          
                          {/* Alignment Controls */}
                          <div>
                             <label className="text-[10px] font-bold text-gray-400 uppercase">Perataan Teks</label>
                             <div className="flex gap-2 mt-1 bg-gray-50 p-1 rounded-lg">
                                <button 
                                    onClick={() => updateFn(activeId, { align: 'left' })}
                                    className={`flex-1 p-1 rounded flex justify-center ${el.align === 'left' ? 'bg-[#0B1CDE] text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => updateFn(activeId, { align: 'center' })}
                                    className={`flex-1 p-1 rounded flex justify-center ${(!el.align || el.align === 'center') ? 'bg-[#0B1CDE] text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => updateFn(activeId, { align: 'right' })}
                                    className={`flex-1 p-1 rounded flex justify-center ${el.align === 'right' ? 'bg-[#0B1CDE] text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <AlignRight className="w-4 h-4" />
                                </button>
                             </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Warna Teks</label>
                            <div className="flex gap-2 mt-1">
                                {['#000000', '#2B427A', '#0B1CDE', '#FFFFFF', '#DFFF00', '#FF0000'].map(c => (
                                    <button key={c} type="button" onClick={() => updateFn(activeId, { color: c })} className={`w-6 h-6 rounded-full border border-gray-300 ${el.color === c ? 'ring-2 ring-offset-1 ring-[#0B1CDE]' : ''}`} style={{backgroundColor: c}} />
                                ))}
                            </div>
                          </div>
                      </>
                  )}
                  {el.type === 'image' && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Lebar Gambar</label>
                        <input type="range" min="50" max="800" value={el.width || 150} onChange={(e) => updateFn(activeId, { width: Number(e.target.value) })} className="w-full accent-[#0B1CDE]" />
                        <div className="text-right text-xs font-bold text-[#0B1CDE]">{Math.round(el.width || 150)}px</div>
                      </div>
                  )}
                  
                  <button type="button" onClick={() => removeFn(activeId)} className="w-full py-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 border border-red-100 flex items-center justify-center gap-2">
                      <Trash className="w-3 h-3"/> Hapus Elemen
                  </button>
              </div>
          </div>
      );
  };

  const renderCanvasElement = (el: CertificateElement, isActive: boolean, onMouseDown: (e: React.MouseEvent) => void, onResizeMouseDown: (e: React.MouseEvent) => void) => {
      // Determine Transform based on Alignment to ensure position stays predictable
      let transform = 'translate(-50%, -50%)'; // Default (Center)
      if (el.align === 'left') transform = 'translate(0, -50%)';
      if (el.align === 'right') transform = 'translate(-100%, -50%)';

      return (
          <div 
               key={el.id} 
               className={`absolute cursor-move group ${isActive ? 'outline outline-2 outline-[#0B1CDE]' : 'hover:outline hover:outline-2 hover:outline-blue-200'}`} 
               style={{ 
                   left: el.x, 
                   top: el.y, 
                   color: el.color || '#000', 
                   fontSize: el.type === 'image' ? undefined : `${el.fontSize}px`, 
                   fontFamily: el.fontFamily, 
                   fontWeight: el.fontWeight, 
                   textAlign: el.align || 'center', 
                   textTransform: el.textTransform || 'none',
                   width: el.width ? `${el.width}px` : 'auto', 
                   transform: transform, 
                   whiteSpace: el.type === 'image' ? 'normal' : 'nowrap'
               }} 
               onMouseDown={onMouseDown}
          >
              {el.type === 'dynamic' ? `{${el.label}}` : (el.type === 'image' ? <img src={el.field} alt="img" className="w-full h-full object-contain pointer-events-none"/> : el.field)}
              
              {isActive && (
                  <div 
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#0B1CDE] border-2 border-white rounded-full cursor-se-resize z-50 shadow-sm"
                    onMouseDown={onResizeMouseDown}
                  ></div>
              )}
          </div>
      );
  };

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
               <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image')} />
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-black uppercase border-2 ${event.isOpen ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A]' : 'bg-gray-200 text-gray-500 border-gray-400'}`}>
                  {event.isOpen ? 'PUBLIK' : 'DRAFT'}
               </div>
            </div>
            <div className="p-5">
               <h3 className="font-black text-[#2B427A] text-lg leading-tight mb-2 line-clamp-1" title={event.title}>{event.title}</h3>
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

  const filteredRegistrations = registrations.filter(r => 
      selectedEventFilter === 'ALL' ? true : r.eventId === selectedEventFilter
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

  const addFormField = () => { setNewEvent({...newEvent, formFields: [...(newEvent.formFields || []), { id: Date.now().toString(), label: '', type: 'text', required: false }]}); };
  const updateFormField = (index: number, field: Partial<FormField>) => { const u = [...(newEvent.formFields || [])]; u[index] = { ...u[index], ...field }; setNewEvent({...newEvent, formFields: u}); };
  const removeFormField = (index: number) => { const u = [...(newEvent.formFields || [])]; u.splice(index, 1); setNewEvent({...newEvent, formFields: u}); };
  
  const certDataFields = [ { id: 'userName', label: 'Nama Peserta' }, { id: 'eventTitle', label: 'Judul Acara' } ]; 

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      <CustomAlert isOpen={alertState.isOpen} type={alertState.type} title={alertState.title} message={alertState.message} onClose={closeAlert} onConfirm={alertState.onConfirm} confirmText={alertState.confirmText}/>
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-72 bg-[#2B427A] border-r-2 border-[#2B427A] h-auto md:min-h-screen sticky top-0 text-white z-10">
        <div className="p-8 border-b-2 border-white/10">
          <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-tighter">ADMIN PANEL <div className="w-3 h-3 bg-[#DFFF00]"></div></h1>
          <div className="mt-4 text-xs bg-[#0B1CDE] p-2 rounded text-white font-mono truncate">{session?.email}</div>
        </div>
        <nav className="p-6 space-y-3">
            {[ {id: 'overview', label: 'Ringkasan', icon: LayoutDashboard}, {id: 'events', label: 'Acara', icon: CalendarIcon}, {id: 'registrations', label: 'Pendaftaran', icon: UsersIcon}, {id: 'settings', label: 'Pengaturan', icon: SettingsIcon} ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full text-left px-5 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 font-black border-2 uppercase tracking-wide ${activeTab === item.id ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A] shadow-[4px_4px_0px_0px_#000] transform -translate-y-1' : 'text-white border-transparent hover:bg-white/10'}`}>
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#2B427A]' : 'text-[#DFFF00]'}`} /> {item.label}
                </button>
            ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {loading && <div className="mb-6 bg-[#DFFF00] text-[#2B427A] px-4 py-2 rounded-lg inline-flex items-center gap-2 font-black border-2 border-[#2B427A]"><Loader className="w-4 h-4 animate-spin"/> MEMUAT DATA...</div>}
        
        {activeTab === 'settings' && (
           <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A]">
               <div className="flex gap-4 border-b-2 border-gray-200 pb-4 mb-6"><button onClick={()=>setSettingsTab('certificate')} className={`px-4 py-2 font-black ${settingsTab==='certificate'?'text-[#0B1CDE] border-b-2 border-[#0B1CDE]':''}`}>Editor Sertifikat</button><button onClick={()=>setSettingsTab('payment')} className={`px-4 py-2 font-black ${settingsTab==='payment'?'text-[#0B1CDE] border-b-2 border-[#0B1CDE]':''}`}>Pembayaran</button></div>
               
               {settingsTab === 'certificate' && (
                   <form onSubmit={handleSaveCertSettings} className="grid grid-cols-1 animate-fade-in">
                       <div className="h-[700px] flex gap-4 border-2 border-gray-200 rounded-xl overflow-hidden mb-6">
                              <div className="w-72 bg-gray-50 border-r-2 border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
                                  <div><label className="text-xs font-black text-gray-400 uppercase block mb-2">Background</label><input type="file" accept="image/*" onChange={handleSettingsCertBgChange} className="text-xs"/></div>
                                  <div className="space-y-2">
                                      <p className="text-xs font-black text-gray-400 uppercase">Tambah Elemen</p>
                                      <button type="button" onClick={() => addSettingsCertElement('dynamic', 'userName', 'Nama Peserta')} className="w-full text-left text-xs font-bold p-2 bg-white border rounded hover:bg-blue-50">+ Nama Peserta</button>
                                      <button type="button" onClick={() => addSettingsCertElement('dynamic', 'certificateNumber', 'No. Sertifikat')} className="w-full text-left text-xs font-bold p-2 bg-white border rounded hover:bg-blue-50">+ No. Sertifikat</button>
                                      <button type="button" onClick={() => addSettingsCertElement('text', 'Teks Baru', 'Label Statis')} className="w-full text-left text-xs font-bold p-2 bg-white border rounded hover:bg-blue-50">+ Teks Statis</button>
                                      <div className="relative"><input type="file" accept="image/*" onChange={handleAddImageElement} className="absolute inset-0 opacity-0"/><button type="button" className="w-full text-left text-xs font-bold p-2 bg-white border rounded hover:bg-blue-50">+ Gambar</button></div>
                                  </div>
                                  {renderElementToolbar(settingsActiveElementId, certSettings, updateSettingsCertElement, removeSettingsCertElement)}
                              </div>
                              <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-8 relative">
                                  {/* CANVAS: Fixed Dimensions for A4 at approx 72-96 DPI mapping */}
                                  <div ref={settingsCanvasRef} className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 select-none" style={{ width: '842px', height: '595px' }} onMouseMove={handleSettingsCanvasMouseMove} onMouseUp={handleSettingsCanvasMouseUp} onMouseLeave={handleSettingsCanvasMouseUp}>
                                      {certSettingsBgPreview && <img src={certSettingsBgPreview} className="w-full h-full object-cover pointer-events-none" />}
                                      {certSettings.elements.map(el => renderCanvasElement(el, settingsActiveElementId === el.id, (e) => handleSettingsCanvasMouseDown(e, el.id), (e) => handleResizeMouseDown(e, el.id, false)))}
                                  </div>
                              </div>
                       </div>
                       <button type="submit" disabled={savingCertSettings} className="w-full py-4 bg-[#0B1CDE] text-white font-black rounded-xl hover:bg-[#2B427A]">{savingCertSettings ? <Loader className="animate-spin inline"/> : <Save className="inline mr-2"/>} SIMPAN GLOBAL DEFAULT</button>
                   </form>
               )}
               {settingsTab === 'payment' && (
                   <form onSubmit={handleSavePaymentSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                       <div className="space-y-6">
                           <div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-100"><h3 className="font-black text-[#2B427A] uppercase mb-4 flex items-center gap-2"><PlusSquare className="w-5 h-5"/> {isEditingAccount ? 'Edit Rekening' : 'Tambah Rekening'}</h3><div className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Bank</label><input type="text" value={tempAccount.bankName} onChange={e=>setTempAccount({...tempAccount, bankName: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Contoh: BCA" /></div><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nomor Rekening</label><input type="text" value={tempAccount.accountNumber} onChange={e=>setTempAccount({...tempAccount, accountNumber: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="1234xxxx" /></div><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Atas Nama</label><input type="text" value={tempAccount.accountHolder} onChange={e=>setTempAccount({...tempAccount, accountHolder: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Nama Pemilik" /></div><button type="button" onClick={isEditingAccount ? handleUpdateAccount : handleAddAccount} className="w-full py-2 bg-[#2B427A] text-white font-bold rounded-lg hover:bg-[#0B1CDE] transition-colors uppercase text-sm">{isEditingAccount ? 'Update Rekening' : 'Tambah ke Daftar'}</button>{isEditingAccount && (<button type="button" onClick={() => { setIsEditingAccount(false); setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' }); }} className="w-full py-2 bg-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-300 transition-colors uppercase text-sm mt-2">Batal</button>)}</div></div>
                           <div><label className="block text-sm font-black text-[#2B427A] mb-3 uppercase">Daftar Rekening</label><div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">{paymentSettings.bankAccounts.length === 0 && (<p className="text-gray-400 text-sm font-medium italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">Belum ada rekening ditambahkan.</p>)}{paymentSettings.bankAccounts.map((acc, idx) => (<div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center group hover:border-[#2B427A] transition-colors"><div><div className="font-black text-[#2B427A] uppercase">{acc.bankName}</div><div className="text-sm font-bold text-gray-600">{acc.accountNumber}</div><div className="text-xs text-gray-400 uppercase">{acc.accountHolder}</div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button type="button" onClick={() => handleEditAccountClick(acc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4"/></button><button type="button" onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>
                       </div>
                       <div className="space-y-4"><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">QRIS (Scan Payment)</label><div className="border-2 border-dashed border-[#2B427A]/30 rounded-xl p-6 text-center bg-gray-50 hover:bg-[#F0F9FF] cursor-pointer relative h-64 flex items-center justify-center group"><input type="file" accept="image/*" onChange={e=>setQrisFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />{qrisFile ? (<div className="text-green-600 font-bold">{qrisFile.name}</div>) : (paymentSettings.qrisUrl ? (<div className="relative w-full h-full"><img src={paymentSettings.qrisUrl} alt="QRIS" className="w-full h-full object-contain" /><div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="font-bold text-[#2B427A]">Klik untuk ganti QRIS</span></div></div>) : <div className="text-gray-400 font-bold"><Upload className="w-8 h-8 mx-auto mb-2"/>Upload QRIS Image</div>)}</div></div>
                       <div className="md:col-span-2 pt-6 border-t-2 border-gray-100"><button type="submit" disabled={savingPayment} className="w-full py-4 bg-[#0B1CDE] text-white font-black rounded-xl hover:bg-[#2B427A] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none">{savingPayment ? <Loader className="animate-spin"/> : <Save/>} SIMPAN PENGATURAN PEMBAYARAN</button></div>
                   </form>
               )}
           </div>
        )}
        
        {/* Simplified Event Wizard Step 5 rendering for brevity */}
        {showCreateModal && wizardStep === 5 && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center"><h3 className="font-black text-xl text-[#2B427A] uppercase">Desain Sertifikat Event Ini</h3><button onClick={() => setShowCreateModal(false)}><XCircle className="w-8 h-8 text-red-500"/></button></div>
                    <div className="flex-1 flex overflow-hidden">
                         <div className="w-72 bg-gray-50 border-r p-4 flex flex-col gap-4 overflow-y-auto">
                              <div><label className="text-xs font-bold uppercase block mb-1">Upload Template</label><input type="file" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setCertBgFile(f); const r=new FileReader(); r.onload=()=>setCertBgPreview(r.result as string); r.readAsDataURL(f); } }} /></div>
                              <div className="space-y-2"><p className="text-xs font-bold uppercase">Tambah</p>
                                  <button onClick={() => addWizardCertElement('dynamic', 'userName', 'Nama')} className="w-full p-2 bg-white border rounded text-xs font-bold text-left">+ Nama Peserta</button>
                                  <button onClick={() => addWizardCertElement('dynamic', 'certificateNumber', 'No. Sertif')} className="w-full p-2 bg-white border rounded text-xs font-bold text-left">+ No. Sertifikat</button>
                                  <button onClick={() => addWizardCertElement('text', 'Teks', 'Label')} className="w-full p-2 bg-white border rounded text-xs font-bold text-left">+ Teks</button>
                              </div>
                              {renderElementToolbar(activeElementId, newEvent.certificateConfig, updateWizardCertElement, removeWizardCertElement)}
                         </div>
                         <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-8">
                             <div className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 select-none" style={{ width: '842px', height: '595px' }} onMouseMove={handleWizardCanvasMouseMove} onMouseUp={handleWizardCanvasMouseUp} onMouseLeave={handleWizardCanvasMouseUp}>
                                  {certBgPreview && <img src={certBgPreview} className="w-full h-full object-cover pointer-events-none" />}
                                  {newEvent.certificateConfig?.elements.map(el => renderCanvasElement(el, activeElementId === el.id, (e) => handleWizardCanvasMouseDown(e, el.id), (e) => handleResizeMouseDown(e, el.id, true)))}
                             </div>
                         </div>
                    </div>
                    <div className="p-4 border-t flex justify-end gap-3">
                        <button onClick={() => setWizardStep(4)} className="px-6 py-2 bg-gray-200 rounded-lg font-bold">Kembali</button>
                        <button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-6 py-2 bg-[#DFFF00] text-[#2B427A] rounded-lg font-black border-2 border-[#2B427A]">{isSubmittingEvent ? 'Menyimpan...' : 'Simpan & Publikasi'}</button>
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'events' && renderEventsList()}
        
        {activeTab === 'registrations' && renderRegistrations()}

        {activeTab === 'overview' && (
             <div className="grid grid-cols-3 gap-6 animate-fade-in">
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><h3 className="text-gray-400 font-bold text-xs uppercase">Total Acara</h3><p className="text-4xl font-black text-[#2B427A]">{events.length}</p></div>
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><h3 className="text-gray-400 font-bold text-xs uppercase">Pendaftar</h3><p className="text-4xl font-black text-[#0B1CDE]">{registrations.length}</p></div>
             </div>
        )}
      </main>
      
      {showCreateModal && wizardStep < 5 && (
          <div className="fixed inset-0 bg-[#2B427A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border-4 border-[#DFFF00] animate-scale-up">
                  {/* Header */}
                  <div className="bg-gray-50 px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center">
                      <div><h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tight">{editingId ? 'Edit Acara' : 'Buat Acara Baru'}</h2><div className="flex gap-2 mt-2">{[1,2,3,4,5].map(step => (<div key={step} className={`h-2 w-12 rounded-full transition-all duration-300 ${step <= wizardStep ? 'bg-[#0B1CDE]' : 'bg-gray-200'}`} />))}</div></div>
                      <button onClick={() => { setShowCreateModal(false); resetWizard(); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-8 h-8" /></button>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 bg-white relative">
                     {wizardStep === 1 && (<div className="space-y-6 animate-fade-in"><h3 className="text-lg font-black text-gray-400 uppercase">Tahap 1: Informasi Dasar</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label><div className="relative"><Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label><div className="relative"><Tag className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><select value={isCustomCat ? 'OTHER' : newEvent.category} onChange={(e) => { if (e.target.value === 'OTHER') { setIsCustomCat(true); setNewEvent({...newEvent, category: ''}); } else { setIsCustomCat(false); setNewEvent({...newEvent, category: e.target.value}); } }} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold bg-white text-[#2B427A] appearance-none">{Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}<option value="OTHER">Lainnya (Custom)...</option></select></div>{isCustomCat && (<div className="mt-3 animate-fade-in"><input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full border-2 border-[#DFFF00] rounded-xl p-3 focus:border-[#0B1CDE] outline-none font-bold bg-[#F8FAFC]" placeholder="Contoh: Talkshow" /></div>)}</div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label><div className="relative"><CalendarIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu</label><div className="relative"><Clock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="time" value={newEvent.time||'09:00'} onChange={e=>setNewEvent({...newEvent, time:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div></div></div>)}
                     {wizardStep === 2 && (<div className="space-y-6 animate-fade-in"><h3 className="text-lg font-black text-gray-400 uppercase">Tahap 2: Detail & Media</h3><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label><div className="relative"><MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-bold text-[#2B427A]" /></div></div><div><div className="flex justify-between mb-2"><label className="text-sm font-black text-[#2B427A] uppercase">Deskripsi</label><button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs bg-[#DFFF00] px-3 py-1 rounded-lg font-black text-[#2B427A] border border-[#2B427A] flex items-center gap-1 hover:bg-white transition-colors shadow-sm"><Sparkles className="w-3 h-3"/> {generatingDesc ? 'MEMBUAT...' : 'AI GENERATE'}</button></div><div className="relative"><AlignLeft className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><textarea rows={6} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-medium text-sm leading-relaxed resize-none text-[#2B427A]"/></div></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Banner Acara</label><div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-colors duration-200 group overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center"><input type="file" accept="image/*" onChange={handleBannerChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />{bannerPreview ? (<div className="relative w-full h-full"><img src={bannerPreview} alt="Preview" className="max-h-[300px] w-full object-contain rounded-lg shadow-md" /><button onClick={handleRemoveBanner} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full z-20 hover:bg-red-600 shadow-lg" title="Hapus Gambar"><Trash className="w-4 h-4"/></button></div>) : (<div className="flex flex-col items-center group-hover:scale-105 transition-transform"><ImageIcon className="w-12 h-12 text-gray-400 mb-2 group-hover:text-[#0B1CDE]"/><span className="font-bold text-gray-500 group-hover:text-[#2B427A]">Klik untuk unggah Banner (Max 5MB)</span></div>)}</div></div></div>)}
                     {wizardStep === 3 && (<div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center"><h3 className="text-lg font-black text-gray-400 uppercase">Tahap 3: Form Pendaftaran</h3><button onClick={addFormField} className="text-sm bg-[#0B1CDE] text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A] transition-transform active:scale-95"><PlusCircle className="w-4 h-4"/> TAMBAH FIELD</button></div><div className="space-y-3">{newEvent.formFields?.map((field, idx) => (<div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 animate-scale-up"><div className="flex-1 space-y-3"><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Label" value={field.label} onChange={e=>updateFormField(idx, {label: e.target.value})} className="border rounded-lg p-2 text-sm font-bold outline-none focus:border-blue-500" /><select value={field.type} onChange={e=>updateFormField(idx, {type: e.target.value as any})} className="border rounded-lg p-2 text-sm font-bold outline-none bg-white"><option value="text">Teks</option><option value="number">Angka</option><option value="email">Email</option><option value="textarea">TextArea</option><option value="select">Pilihan</option></select></div>{field.type === 'select' && <input type="text" placeholder="Opsi..." value={field.options?.join(',')} onChange={e=>updateFormField(idx, {options: e.target.value.split(',')})} className="w-full border rounded-lg p-2 text-sm outline-none" />}<div className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={e=>updateFormField(idx, {required: e.target.checked})} id={`req-${idx}`} className="w-4 h-4"/><label htmlFor={`req-${idx}`} className="text-sm font-bold text-gray-600">Wajib Diisi</label></div></div><button onClick={()=>removeFormField(idx)} className="text-red-400 hover:text-red-600 p-2"><MinusCircle className="w-6 h-6"/></button></div>))}{(!newEvent.formFields || newEvent.formFields.length === 0) && <div className="text-center py-8 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">Belum ada field tambahan.</div>}</div></div>)}
                     {wizardStep === 4 && (<div className="space-y-6 animate-fade-in"><h3 className="text-lg font-black text-gray-400 uppercase">Tahap 4: Harga & Review</h3><div className="grid grid-cols-2 gap-6"><div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-black text-[#2B427A] uppercase">Harga Tiket</label><div className="flex items-center gap-2"><span className={`text-xs font-bold ${newEvent.price === 0 ? 'text-green-600' : 'text-gray-400'}`}>GRATIS?</span><button onClick={() => setNewEvent({...newEvent, price: newEvent.price === 0 ? 10000 : 0})} className={`w-10 h-5 rounded-full relative transition-colors ${newEvent.price === 0 ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${newEvent.price === 0 ? 'left-6' : 'left-1'}`} /></button></div></div><div className={`relative flex items-center border-2 rounded-xl overflow-hidden transition-all ${newEvent.price === 0 ? 'bg-gray-100 border-gray-200' : 'bg-white border-[#2B427A]'}`}><DollarSign className={`absolute left-4 w-5 h-5 ${newEvent.price === 0 ? 'text-gray-400' : 'text-[#2B427A]'}`} /><input type="number" disabled={newEvent.price === 0} value={newEvent.price === 0 ? '' : newEvent.price} onChange={e=>setNewEvent({...newEvent, price: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3 outline-none font-black text-xl text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={newEvent.price === 0 ? "GRATIS" : "0"}/></div></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kuota Peserta</label><div className="relative"><UsersIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="number" value={newEvent.maxParticipants} onChange={e=>setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0B1CDE] outline-none font-black text-lg text-[#2B427A]" /></div></div></div><div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-200 mt-4"><h4 className="font-black text-[#2B427A] mb-2 uppercase">Ringkasan Acara</h4><div className="grid grid-cols-2 gap-4 mt-2"><div><p className="text-xs text-gray-500 font-bold uppercase">Judul</p><p className="text-sm font-black text-[#0B1CDE]">{newEvent.title}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Kategori</p><p className="text-sm font-bold text-gray-700">{isCustomCat ? customCategory : newEvent.category}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Jadwal</p><p className="text-sm font-bold text-gray-700">{newEvent.date} @ {newEvent.time}</p></div><div><p className="text-xs text-gray-500 font-bold uppercase">Lokasi</p><p className="text-sm font-bold text-gray-700">{newEvent.location}</p></div></div></div></div>)}
                  </div>
                  <div className="p-6 bg-gray-50 border-t-2 border-gray-100 flex justify-between">
                      {wizardStep > 1 ? <button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2 transition-colors"><ChevronLeft className="w-5 h-5"/> KEMBALI</button> : <div/>}
                      {wizardStep < 5 ? <button onClick={()=>setWizardStep(prev=>prev+1)} className="px-6 py-3 rounded-xl font-black bg-[#2B427A] text-white hover:bg-[#0B1CDE] flex items-center gap-2 transition-all shadow-lg hover:translate-y-[-2px]">SELANJUTNYA <ChevronRight className="w-5 h-5"/></button> : <button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-8 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:bg-white flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:shadow-[2px_2px_0px_0px_#2B427A] disabled:opacity-50 disabled:cursor-not-allowed">{isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} {editingId ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN ACARA'}</button>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
