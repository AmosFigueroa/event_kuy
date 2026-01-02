
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil, Save, PlusSquare, Move, Type, MapPin, Tag, AlignLeft, AlignCenter, AlignRight, DollarSign, Hash, MousePointer2, FileText, Image as ImgIcon, FileSpreadsheet, Scaling, X, Send, QrCode, ScanLine, Download, ChevronDown, ChevronUp, LayoutList, FormInput, Palette, FileCheck, Info, Bot, ExternalLink } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession, createSlug, deleteEvent, toggleEventStatus, savePaymentSettings, fetchPaymentSettings, updateEvent, fetchCertificateSettings, saveCertificateSettings, sendBulkCertificates, fetchParticipantsCsv } from '../services/api';
import { generateEventDescription, analyzePaymentProof, PaymentAnalysisResult } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus, FormField, FormFieldType, PaymentSettings, BankAccount, CertificateConfig, CertificateElement } from '../types';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';

// Constants for Certificate Canvas (A4 Landscape aspect ratio)
const CANVAS_WIDTH = 842;
const CANVAS_HEIGHT = 595;

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'registrations' | 'settings'>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCert, setProcessingCert] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const navigate = useNavigate();
  const session = getUserSession();
  
  // Toast State
  const [toast, setToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  // Proof Viewer & AI Analysis State
  const [viewingProof, setViewingProof] = useState<Registration | null>(null); // Changed to store full object
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<PaymentAnalysisResult | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

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
  
  // Canvas Logic
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [initialPos, setInitialPos] = useState<{x: number, y: number} | null>(null);
  
  // Bank Account Form State
  const [tempAccount, setTempAccount] = useState<BankAccount>({ id: '', bankName: '', accountNumber: '', accountHolder: '' });

  // New/Edit Event Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    category: EventCategory.SEMINAR,
    price: 0,
    maxParticipants: 100,
    formFields: [],
    time: '09:00',
    certificateConfig: { backgroundUrl: '', elements: [] },
    enableTicketScanner: false
  });
  const [customCategory, setCustomCategory] = useState(''); 
  const [isCustomCat, setIsCustomCat] = useState(false);
  
  // Banner State
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  // Thumbnail State (4:5)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // EVENT WIZARD CERTIFICATE DESIGNER STATE
  const [certBgFile, setCertBgFile] = useState<File | null>(null);
  const [certBgPreview, setCertBgPreview] = useState<string | null>(null);
  
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

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

  // --- AI ANALYSIS LOGIC ---
  const handleAiAnalysis = async () => {
      if (!viewingProof || !viewingProof.proofUrl) return;
      
      const event = events.find(e => e.id === viewingProof.eventId);
      const expectedAmount = event ? event.price : 0;

      setIsAnalyzing(true);
      setAiResult(null);

      try {
          // Convert Image URL to Base64 (Using fetch)
          // Note: This relies on the image URL allowing CORS or being accessible
          const response = await fetch(viewingProof.proofUrl, { mode: 'cors' });
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onloadend = async () => {
              const base64data = (reader.result as string).split(',')[1];
              try {
                  const result = await analyzePaymentProof(base64data, expectedAmount);
                  setAiResult(result);
              } catch (aiErr: any) {
                  setAiResult({ isValid: false, reason: "Gagal memproses AI: " + aiErr.message, confidence: 'LOW' });
              } finally {
                  setIsAnalyzing(false);
              }
          };
          reader.readAsDataURL(blob);

      } catch (err) {
          setIsAnalyzing(false);
          setAiResult({ isValid: false, reason: "Gagal mengambil gambar (CORS/Network). Cek manual.", confidence: 'LOW' });
      }
  };

  // ... (Keep existing Certificate Designer Logic, Canvas Handlers, etc.)
  const getCurrentCertElements = (isWizard: boolean) => {
      if (isWizard) return newEvent.certificateConfig?.elements || [];
      return certSettings.elements || [];
  };

  const updateCertElement = (isWizard: boolean, id: string, updates: Partial<CertificateElement>) => {
      if (isWizard) {
           const current = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
           const updatedEls = current.elements.map(el => el.id === id ? { ...el, ...updates } : el);
           setNewEvent({ ...newEvent, certificateConfig: { ...current, elements: updatedEls }});
      } else {
           const updatedEls = certSettings.elements.map(el => el.id === id ? { ...el, ...updates } : el);
           setCertSettings({ ...certSettings, elements: updatedEls });
      }
  };

  const addCertElement = (isWizard: boolean, type: 'text' | 'dynamic' | 'image', field: string, label: string) => {
      const isImage = type === 'image';
      const newEl: CertificateElement = {
          id: Date.now().toString(),
          type,
          field,
          label: label || 'Element',
          x: CANVAS_WIDTH / 2, 
          y: CANVAS_HEIGHT / 2,
          fontSize: isImage ? undefined : 24,
          fontFamily: isImage ? undefined : 'Helvetica',
          color: isImage ? undefined : '#000000',
          fontWeight: isImage ? undefined : 'bold',
          align: isImage ? undefined : 'center',
          textTransform: 'none',
          width: isImage ? 150 : 400,
          strokeWidth: 0,
          strokeColor: '#FFFFFF'
      };
      
      if (isWizard) {
          const current = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
          setNewEvent({ ...newEvent, certificateConfig: { ...current, elements: [...current.elements, newEl] } });
      } else {
          setCertSettings({ ...certSettings, elements: [...certSettings.elements, newEl] });
      }
      setActiveElementId(newEl.id);
  };

  const removeCertElement = (isWizard: boolean, id: string) => {
      if (isWizard) {
           const current = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
           const updated = current.elements.filter(el => el.id !== id);
           setNewEvent({ ...newEvent, certificateConfig: { ...current, elements: updated } });
      } else {
           const updated = certSettings.elements.filter(el => el.id !== id);
           setCertSettings({ ...certSettings, elements: updated });
      }
      setActiveElementId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, id: string, isWizard: boolean) => {
      e.stopPropagation();
      setActiveElementId(id);
      
      const elements = getCurrentCertElements(isWizard);
      const el = elements.find(e => e.id === id);
      if (el) {
          setDragStart({ x: e.clientX, y: e.clientY });
          setInitialPos({ x: el.x, y: el.y });
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent, isWizard: boolean) => {
      if (activeElementId && dragStart && initialPos) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          
          updateCertElement(isWizard, activeElementId, {
              x: initialPos.x + dx,
              y: initialPos.y + dy
          });
      }
  };

  const handleCanvasMouseUp = () => {
      setDragStart(null);
      setInitialPos(null);
  };

  // --- EVENT HANDLERS ---
  const handleGenerateDescription = async () => {
    if (!newEvent.title || !newEvent.category) {
        showAlert('error', 'Info Kurang', 'Mohon isi Judul dan Kategori terlebih dahulu.');
        return;
    }
    setGeneratingDesc(true);
    try {
        const desc = await generateEventDescription(newEvent.title, newEvent.category, newEvent.location || "");
        setNewEvent(prev => ({ ...prev, description: desc }));
    } catch (error: any) {
        showAlert('error', 'AI Error', error.message);
    } finally {
        setGeneratingDesc(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setBannerPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCertBgChange = (e: React.ChangeEvent<HTMLInputElement>, isWizard: boolean) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const res = ev.target?.result as string;
              if (isWizard) {
                  setCertBgFile(file);
                  setCertBgPreview(res);
                  const current = newEvent.certificateConfig || { backgroundUrl: '', elements: [] };
                  setNewEvent({ ...newEvent, certificateConfig: { ...current, backgroundUrl: res } });
              } else {
                  setCertTemplateFile(file);
                  setCertSettingsBgPreview(res);
                  setCertSettings({ ...certSettings, backgroundUrl: res });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCreateOrUpdateEvent = async () => {
    if (!newEvent.title || !newEvent.date) { showAlert('error', 'Validasi', "Judul dan tanggal wajib."); return; }
    setIsSubmittingEvent(true);
    const readFile = (file: File): Promise<string> => new Promise((resolve) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve((r.result as string).split(',')[1]); });
    try {
        const bannerB64 = bannerFile ? await readFile(bannerFile) : undefined;
        const thumbnailB64 = thumbnailFile ? await readFile(thumbnailFile) : undefined;
        const certBgB64 = certBgFile ? await readFile(certBgFile) : undefined;
        const finalData = { ...newEvent, category: isCustomCat ? customCategory : newEvent.category };
        
        if (editingId) await updateEvent({ ...finalData, id: editingId } as any, bannerB64, certBgB64, thumbnailB64);
        else await createEvent(finalData as any, bannerB64, certBgB64, thumbnailB64);
        
        setShowCreateModal(false); resetWizard(); loadData(); showAlert('success', 'Sukses', "Acara disimpan.");
    } catch(e: any) { showAlert('error', 'Gagal', e.message); } finally { setIsSubmittingEvent(false); }
  };

  const resetWizard = () => {
      setWizardStep(1); setNewEvent({ category: EventCategory.SEMINAR, price: 0, maxParticipants: 100, formFields: [], time: '09:00', certificateConfig: { backgroundUrl: '', elements: [] }, enableTicketScanner: false });
      setBannerFile(null); setBannerPreview(null); 
      setThumbnailFile(null); setThumbnailPreview(null);
      setCertBgFile(null); setCertBgPreview(null); setEditingId(null);
  };

  const handleEditClick = (event: Event) => {
      setEditingId(event.id);
      setNewEvent({ ...event, date: new Date(event.date).toISOString().split('T')[0] });
      setBannerPreview(event.bannerUrl);
      setThumbnailPreview(event.thumbnailUrl || null);
      if(event.certificateConfig?.backgroundUrl) {
          setCertBgPreview(event.certificateConfig.backgroundUrl);
      }
      setShowCreateModal(true);
  };
  
  const handleDeleteEvent = async (id: string) => { showConfirm('Hapus?', "Yakin?", async () => { await deleteEvent(id); loadData(); }, "HAPUS"); };
  const handleToggleStatus = async (id: string, currentStatus: boolean) => { 
      try {
          const res = await toggleEventStatus(id);
          setEvents(events.map(e => e.id === id ? { ...e, isOpen: res.isOpen } : e));
      } catch (e: any) { showAlert('error', 'Error', e.message); }
  };
  
  const handleCopyScannerLink = (eventId: string) => {
      const link = `${window.location.origin}${window.location.pathname}#/scanner/${eventId}`;
      navigator.clipboard.writeText(link);
      setToast({ show: true, msg: 'Link Scanner Disalin!' });
      setTimeout(() => setToast({show: false, msg: ''}), 3000);
  };

  const handleExportData = async () => {
      if (!selectedEventFilter) return; 
      setExportLoading(true);
      try {
          const res = await fetchParticipantsCsv(selectedEventFilter);
          const link = document.createElement("a");
          link.href = `data:text/csv;base64,${res.csv}`;
          link.download = res.filename;
          link.click();
          setShowExportModal(false);
          showAlert('success', 'Unduhan Mulai', "File CSV sedang diunduh.");
      } catch(e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setExportLoading(false);
      }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingPayment(true);
      try {
          let qrisBase64 = undefined;
          if (qrisFile) {
              const reader = new FileReader();
              qrisBase64 = await new Promise((resolve) => {
                  reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
                  reader.readAsDataURL(qrisFile);
              });
          }
          await savePaymentSettings(paymentSettings, qrisBase64 as string);
          showAlert('success', 'Tersimpan', "Pengaturan pembayaran diperbarui.");
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setSavingPayment(false);
      }
  };

  const handleSaveCertSettings = async () => {
      setSavingCertSettings(true);
      try {
          let templateBase64 = undefined;
          if (certTemplateFile) {
              const reader = new FileReader();
              templateBase64 = await new Promise((resolve) => {
                  reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
                  reader.readAsDataURL(certTemplateFile);
              });
          }
          await saveCertificateSettings(certSettings, templateBase64 as string);
          showAlert('success', 'Tersimpan', "Template sertifikat default diperbarui.");
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setSavingCertSettings(false);
      }
  };
  
  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try { 
        await updateRegistrationStatus(id, status); 
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r)); 
        if (viewingProof) {
            setViewingProof(null); // Close modal if open
            setAiResult(null);
        }
        showAlert('success', 'Berhasil', `Status diubah menjadi ${status}`);
    } catch (e) { showAlert('error', 'Gagal', "Gagal update status"); }
  };

  const handleSendCertificate = async (id: string) => { 
      setProcessingCert(id);
      try {
          await sendCertificate(id);
          showAlert('success', 'Terkirim', 'Sertifikat telah dikirim ke email peserta.');
      } catch(e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setProcessingCert(null);
      }
  };
  const handleBulkSend = async () => { 
      if (!window.confirm("Kirim sertifikat ke semua peserta yang disetujui untuk acara ini?")) return;
      setIsBulkSending(true);
      try {
          const approved = registrations.filter(r => r.eventId === selectedEventFilter && r.status === RegistrationStatus.APPROVED);
          const ids = approved.map(r => r.id);
          const res = await sendBulkCertificates(ids);
          showAlert('success', 'Selesai', `Berhasil kirim: ${res.sent}, Gagal: ${res.failed}`);
      } catch(e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setIsBulkSending(false);
      }
  };

  // ... (Keep renderElementToolbar, renderCanvasElement, renderDesigner, renderEventsList, etc.)
  const renderElementToolbar = (activeId: string | null, isWizard: boolean) => {
      // ... (Same implementation as provided previously - Omitted for brevity as it's UI logic only)
      if (!activeId) return <div className="text-gray-400 text-sm text-center italic mt-10">Pilih elemen di kanvas untuk mengedit properti</div>;
      const elements = getCurrentCertElements(isWizard);
      const el = elements.find(e => e.id === activeId);
      if (!el) return null;
      const isImage = el.type === 'image';
      return (
          <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-[#2B427A] text-xs uppercase">Properti Elemen</h4>
                  <button onClick={() => removeCertElement(isWizard, activeId)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
              {!isImage && (
                <>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Teks / Field</label>{el.type === 'text' ? (<input type="text" value={el.field} onChange={e => updateCertElement(isWizard, activeId, { field: e.target.value })} className="w-full text-xs border rounded p-2" />) : (<div className="text-xs font-bold text-[#0B1CDE] bg-blue-50 p-2 rounded">{el.field}</div>)}</div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Ukuran Font</label><input type="number" value={el.fontSize} onChange={e => updateCertElement(isWizard, activeId, { fontSize: Number(e.target.value) })} className="w-full text-xs border rounded p-2" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Warna</label><input type="color" value={el.color} onChange={e => updateCertElement(isWizard, activeId, { color: e.target.value })} className="w-full h-9 border rounded p-1 cursor-pointer" /></div></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Font Weight</label><select value={el.fontWeight || 'normal'} onChange={e => updateCertElement(isWizard, activeId, { fontWeight: e.target.value as any })} className="w-full text-xs border rounded p-2"><option value="normal">Normal</option><option value="bold">Bold</option></select></div>
                   <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Alignment</label><div className="flex border rounded overflow-hidden"><button onClick={() => updateCertElement(isWizard, activeId, { align: 'left' })} className={`flex-1 p-2 ${el.align === 'left' ? 'bg-[#2B427A] text-white' : 'hover:bg-gray-100'}`}><AlignLeft className="w-3 h-3 mx-auto"/></button><button onClick={() => updateCertElement(isWizard, activeId, { align: 'center' })} className={`flex-1 p-2 ${el.align === 'center' ? 'bg-[#2B427A] text-white' : 'hover:bg-gray-100'}`}><AlignCenter className="w-3 h-3 mx-auto"/></button><button onClick={() => updateCertElement(isWizard, activeId, { align: 'right' })} className={`flex-1 p-2 ${el.align === 'right' ? 'bg-[#2B427A] text-white' : 'hover:bg-gray-100'}`}><AlignRight className="w-3 h-3 mx-auto"/></button></div></div>
                </>
              )}
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Width (px)</label><input type="number" value={el.width || 200} onChange={e => updateCertElement(isWizard, activeId, { width: Number(e.target.value) })} className="w-full text-xs border rounded p-2" /></div>
              <div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">X Pos</label><input type="number" value={Math.round(el.x)} onChange={e => updateCertElement(isWizard, activeId, { x: Number(e.target.value) })} className="w-full text-xs border rounded p-2" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Y Pos</label><input type="number" value={Math.round(el.y)} onChange={e => updateCertElement(isWizard, activeId, { y: Number(e.target.value) })} className="w-full text-xs border rounded p-2" /></div></div>
          </div>
      );
  };

  const renderCanvasElement = (el: CertificateElement, isActive: boolean, isWizard: boolean) => {
      // ... (Same implementation)
      const transform = el.align === 'left' ? 'translate(0, -50%)' : el.align === 'right' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)';
      return (
        <div key={el.id} onMouseDown={(e) => handleCanvasMouseDown(e, el.id, isWizard)} className={`absolute select-none cursor-move hover:outline hover:outline-1 hover:outline-blue-300 ${isActive ? 'outline outline-2 outline-[#0B1CDE] z-20' : 'z-10'}`} style={{ left: el.x, top: el.y, color: el.color || '#000000', fontSize: el.type === 'image' ? undefined : `${el.fontSize}px`, fontFamily: el.fontFamily || 'Helvetica', fontWeight: el.fontWeight || 'bold', textAlign: el.align || 'center', width: el.width ? `${el.width}px` : 'auto', transform: transform, whiteSpace: el.type === 'image' ? 'normal' : 'nowrap', textTransform: el.textTransform || 'none' }}>
            {el.type === 'image' ? (<img src={el.field} alt="element" className="w-full h-full object-contain pointer-events-none" />) : (el.type === 'dynamic' ? `{${el.field}}` : el.field)}
        </div>
      );
  };

  const renderDesigner = (isWizard: boolean) => {
      // ... (Same implementation)
      const config = isWizard ? newEvent.certificateConfig : certSettings;
      const elements = config?.elements || [];
      const bgUrl = isWizard ? certBgPreview : certSettingsBgPreview;
      return (
          <div className="flex flex-col h-[600px] border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <div className="flex flex-1 overflow-hidden">
                  <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col gap-6">
                      <div><h4 className="font-black text-[#2B427A] text-xs uppercase mb-2 flex items-center gap-2"><ImageIcon className="w-3 h-3"/> Background</h4><div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 hover:bg-gray-50 cursor-pointer text-center"><input type="file" accept="image/*" onChange={(e) => handleCertBgChange(e, isWizard)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /><div className="text-xs font-bold text-gray-500">{bgUrl ? "Ganti Background" : "Upload Gambar"}</div></div></div>
                      <div><h4 className="font-black text-[#2B427A] text-xs uppercase mb-2 flex items-center gap-2"><PlusSquare className="w-3 h-3"/> Tambah Elemen</h4><div className="grid grid-cols-1 gap-2"><button onClick={() => addCertElement(isWizard, 'dynamic', 'userName', 'Nama Peserta')} className="text-left px-3 py-2 text-xs font-bold bg-blue-50 text-[#0B1CDE] rounded hover:bg-blue-100 flex items-center gap-2"><Type className="w-3 h-3"/> Nama Peserta</button><button onClick={() => addCertElement(isWizard, 'dynamic', 'eventTitle', 'Judul Acara')} className="text-left px-3 py-2 text-xs font-bold bg-blue-50 text-[#0B1CDE] rounded hover:bg-blue-100 flex items-center gap-2"><Tag className="w-3 h-3"/> Judul Acara</button><button onClick={() => addCertElement(isWizard, 'dynamic', 'date', 'Tanggal')} className="text-left px-3 py-2 text-xs font-bold bg-blue-50 text-[#0B1CDE] rounded hover:bg-blue-100 flex items-center gap-2"><CalendarIcon className="w-3 h-3"/> Tanggal</button><button onClick={() => addCertElement(isWizard, 'text', 'Teks Baru', 'Teks Statis')} className="text-left px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-2"><Type className="w-3 h-3"/> Teks Bebas</button><button onClick={() => addCertElement(isWizard, 'dynamic', 'certificateNumber', 'Nomor Sertifikat')} className="text-left px-3 py-2 text-xs font-bold bg-blue-50 text-[#0B1CDE] rounded hover:bg-blue-100 flex items-center gap-2"><Hash className="w-3 h-3"/> No. Sertifikat</button></div></div>
                      <div className="border-t border-gray-200 pt-4">{renderElementToolbar(activeElementId, isWizard)}</div>
                  </div>
                  <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-8 relative" onMouseMove={(e) => handleCanvasMouseMove(e, isWizard)} onMouseUp={handleCanvasMouseUp}>
                      <div className="bg-white shadow-2xl relative overflow-hidden" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, flexShrink: 0 }} onMouseDown={() => setActiveElementId(null)}>
                          {bgUrl ? (<img src={bgUrl} className="w-full h-full object-cover pointer-events-none absolute inset-0 z-0" alt="bg" />) : (<div className="w-full h-full flex items-center justify-center text-gray-300 font-bold uppercase text-2xl border-2 border-dashed border-gray-300">Preview Area</div>)}
                          {elements.map(el => renderCanvasElement(el, activeElementId === el.id, isWizard))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderEventsList = () => (
    // ... (Same implementation)
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Daftar Acara</h2><button onClick={() => { resetWizard(); setShowCreateModal(true); }} className="px-5 py-2.5 bg-[#0B1CDE] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#2B427A] transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none"><PlusCircle className="w-5 h-5"/> BUAT ACARA</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] overflow-hidden group hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#2B427A] transition-all">
            <div className="h-40 bg-gray-200 relative"><img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image')} /><div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-black uppercase border-2 ${event.isOpen ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A]' : 'bg-gray-200 text-gray-500 border-gray-400'}`}>{event.isOpen ? 'PUBLIK' : 'DRAFT'}</div></div>
            <div className="p-5">
               <h3 className="font-black text-[#2B427A] text-lg leading-tight mb-2 line-clamp-1" title={event.title}>{event.title}</h3>
               <div className="space-y-1 text-sm text-gray-600 font-medium mb-4"><div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> {new Date(event.date).toLocaleDateString()}</div><div className="flex items-center gap-2"><UsersIcon className="w-4 h-4"/> {event.currentParticipants} / {event.maxParticipants} Peserta</div></div>
               <div className="flex gap-2 pt-4 border-t-2 border-dashed border-gray-200 flex-wrap">
                  <button onClick={() => handleEditClick(event)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3"/> EDIT</button>
                  <button onClick={() => handleCopyScannerLink(event.id)} title="Copy Scan Link" className="p-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-xs hover:bg-purple-100"><ScanLine className="w-4 h-4"/></button>
                  <button onClick={() => handleToggleStatus(event.id, event.isOpen)} className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 ${event.isOpen ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><Power className="w-3 h-3"/> {event.isOpen ? 'TUTUP' : 'BUKA'}</button>
                  <button onClick={() => handleDeleteEvent(event.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // MODIFIED: renderRegistrations with Improved Action Buttons & Modal Link
  const renderRegistrations = () => {
    const filteredRegistrations = registrations.filter(r => {
      if (selectedEventFilter === 'ALL') return true;
      return r.eventId === selectedEventFilter;
    }).sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

    const canBulkSend = selectedEventFilter !== 'ALL' && filteredRegistrations.some(r => r.status === RegistrationStatus.APPROVED);

    return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4"><h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Data Pendaftaran</h2><div className="flex flex-col md:flex-row items-center gap-3"><div className="flex items-center gap-2"><Filter className="w-5 h-5 text-gray-400"/><select value={selectedEventFilter} onChange={e => setSelectedEventFilter(e.target.value)} className="border-2 border-gray-200 rounded-lg px-3 py-2 font-bold text-[#2B427A] outline-none focus:border-[#0B1CDE]"><option value="ALL">Semua Acara</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div><button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-black text-xs uppercase hover:bg-green-700 transition-colors shadow-sm"><Download className="w-4 h-4"/> DOWNLOAD DATA</button><button onClick={handleBulkSend} disabled={!canBulkSend || isBulkSending} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase border-2 transition-all shadow-sm ${canBulkSend && !isBulkSending ? 'bg-[#0B1CDE] text-white border-[#0B1CDE] hover:bg-[#2B427A] cursor-pointer' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>{isBulkSending ? <Loader className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}{isBulkSending ? 'MENGIRIM...' : 'KIRIM SEMUA SERTIFIKAT'}</button></div></div>
        <div className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b-2 border-gray-100"><tr><th className="p-4 font-black text-[#2B427A] text-xs uppercase">Tanggal</th><th className="p-4 font-black text-[#2B427A] text-xs uppercase">Peserta</th><th className="p-4 font-black text-[#2B427A] text-xs uppercase">Acara</th><th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Check-In</th><th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Status</th><th className="p-4 font-black text-[#2B427A] text-xs uppercase text-center">Aksi</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRegistrations.map(reg => (
                            <tr key={reg.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 text-sm font-bold text-gray-500">{new Date(reg.registrationDate).toLocaleDateString()}</td>
                                <td className="p-4"><div className="font-black text-[#2B427A]">{reg.userName}</div><div className="text-xs text-gray-400">{reg.userEmail}</div></td>
                                <td className="p-4 text-sm font-bold text-gray-600 max-w-xs truncate" title={reg.eventTitle}>{reg.eventTitle}</td>
                                <td className="p-4 text-center">{reg.checkInStatus === 'CHECKED_IN' ? (<div className="inline-flex flex-col items-center"><span className="text-[10px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-200 uppercase">SUDAH HADIR</span>{reg.checkInTime && <span className="text-[10px] text-gray-400">{new Date(reg.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}</div>) : (<span className="text-[10px] font-bold text-gray-400">-</span>)}</td>
                                <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700 border-green-200' : reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{reg.status}</span></td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => { setViewingProof(reg); setAiResult(null); }} 
                                            title="Lihat Bukti & Aksi" 
                                            className="p-2 bg-blue-50 text-[#0B1CDE] border border-blue-200 rounded-lg hover:bg-blue-100 hover:shadow-sm transition-all"
                                        >
                                            <ImageIcon className="w-5 h-5"/>
                                        </button>
                                        
                                        {reg.status === RegistrationStatus.APPROVED && (
                                            <button onClick={() => handleSendCertificate(reg.id)} disabled={processingCert === reg.id} title="Kirim Sertifikat" className="p-2 bg-[#F0F9FF] text-[#0B1CDE] rounded hover:bg-blue-100 disabled:opacity-50">
                                                {processingCert === reg.id ? <Loader className="w-5 h-5 animate-spin"/> : <Award className="w-5 h-5"/>}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
  };

  const addFormField = () => { setNewEvent({...newEvent, formFields: [...(newEvent.formFields || []), { id: Date.now().toString(), label: '', type: 'text', required: false }]}); };
  const updateFormField = (index: number, field: Partial<FormField>) => { const u = [...(newEvent.formFields || [])]; u[index] = { ...u[index], ...field }; setNewEvent({...newEvent, formFields: u}); };
  const removeFormField = (index: number) => { const u = [...(newEvent.formFields || [])]; u.splice(index, 1); setNewEvent({...newEvent, formFields: u}); };
  
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans relative">
      <CustomAlert isOpen={alertState.isOpen} type={alertState.type} title={alertState.title} message={alertState.message} onClose={closeAlert} onConfirm={alertState.onConfirm} confirmText={alertState.confirmText}/>
      
      {/* PROOF MODAL WITH AI */}
      {viewingProof && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setViewingProof(null)}>
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                  
                  {/* Left: Image */}
                  <div className="w-full md:w-1/2 bg-gray-900 flex items-center justify-center p-4 relative">
                      <img src={viewingProof.proofUrl} className="max-w-full max-h-[60vh] md:max-h-full object-contain rounded" alt="Bukti Pembayaran" />
                      <a href={viewingProof.proofUrl} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/40 text-white"><ExternalLink className="w-5 h-5"/></a>
                  </div>

                  {/* Right: Actions */}
                  <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto bg-white">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-xl font-black text-[#2B427A] uppercase">Verifikasi Pembayaran</h3>
                              <p className="text-sm text-gray-500 font-bold">{viewingProof.userName}</p>
                          </div>
                          <button onClick={() => setViewingProof(null)} className="text-gray-400 hover:text-red-500"><XCircle className="w-8 h-8"/></button>
                      </div>

                      <div className="space-y-6 flex-1">
                          {/* AI Section */}
                          <div className="bg-gradient-to-r from-blue-50 to-[#F0F9FF] p-5 rounded-xl border border-blue-100">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-black text-[#0B1CDE] flex items-center gap-2"><Sparkles className="w-4 h-4"/> AI Check</h4>
                                  {!aiResult && (
                                      <button 
                                        onClick={handleAiAnalysis} 
                                        disabled={isAnalyzing}
                                        className="text-xs font-bold bg-[#0B1CDE] text-white px-3 py-1.5 rounded-lg hover:bg-[#2B427A] disabled:opacity-50 flex items-center gap-1"
                                      >
                                          {isAnalyzing ? <Loader className="w-3 h-3 animate-spin"/> : <Bot className="w-3 h-3"/>}
                                          {isAnalyzing ? 'Menganalisis...' : 'Analisa Otomatis'}
                                      </button>
                                  )}
                              </div>
                              
                              {aiResult ? (
                                  <div className="animate-fade-in">
                                      <div className={`p-3 rounded-lg border-l-4 mb-3 ${aiResult.isValid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                          <div className="flex items-center gap-2 font-bold mb-1">
                                              {aiResult.isValid ? <CheckCircle className="w-4 h-4 text-green-600"/> : <XCircle className="w-4 h-4 text-red-600"/>}
                                              <span className={aiResult.isValid ? 'text-green-700' : 'text-red-700'}>
                                                  {aiResult.isValid ? 'Tampak Valid' : 'Perlu Pengecekan'}
                                              </span>
                                          </div>
                                          <p className="text-xs text-gray-600 leading-relaxed">{aiResult.reason}</p>
                                      </div>
                                      <div className="flex justify-between text-xs font-bold text-gray-400">
                                          <span>Confidence: {aiResult.confidence}</span>
                                          <span>Nominal: {aiResult.detectedAmount || '-'}</span>
                                      </div>
                                  </div>
                              ) : (
                                  <p className="text-xs text-gray-500 italic">Klik tombol untuk membiarkan AI mengecek keaslian bukti transfer.</p>
                              )}
                          </div>

                          {/* Manual Actions */}
                          <div>
                              <label className="block text-xs font-black text-gray-400 uppercase mb-3">Tindakan Manual</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button 
                                      onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.APPROVED)}
                                      className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all group"
                                  >
                                      <CheckCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/>
                                      <span className="font-black">TERIMA</span>
                                  </button>
                                  
                                  <button 
                                      onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.REJECTED)}
                                      className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all group"
                                  >
                                      <XCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/>
                                      <span className="font-black">TOLAK</span>
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up">
              <div className="bg-[#2B427A] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-[#DFFF00]">
                  <CheckCircle className="w-5 h-5 text-[#DFFF00] fill-current" />
                  <span className="font-bold text-sm uppercase tracking-wide">{toast.msg}</span>
              </div>
          </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
          // ... (Existing modal)
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowExportModal(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                  <h3 className="font-black text-[#2B427A] text-lg uppercase mb-4">Export Data Peserta</h3>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Pilih Acara</label><select value={selectedEventFilter} onChange={e => setSelectedEventFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold outline-none"><option value="ALL">Semua Acara</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
                      <p className="text-xs text-gray-500">File CSV akan berisi: Nama, Email, Acara, Waktu Beli, Status Pembayaran, Status Check-in, dan Field Form Custom.</p>
                      <button onClick={handleExportData} disabled={exportLoading} className="w-full py-3 bg-green-600 text-white font-black rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">{exportLoading ? <Loader className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} DOWNLOAD CSV</button>
                  </div>
              </div>
          </div>
      )}

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
           <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden">
               {/* Settings Sidebar */}
               <div className="w-full md:w-64 bg-gray-50 border-r-2 border-gray-200 flex flex-col">
                   <div className="p-6 border-b border-gray-200"><h3 className="font-black text-[#2B427A] uppercase text-lg">Menu Pengaturan</h3></div>
                   <nav className="flex-1 p-4 space-y-2">
                       <button onClick={() => setSettingsTab('payment')} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${settingsTab === 'payment' ? 'bg-[#2B427A] text-white shadow-[2px_2px_0px_0px_#000]' : 'text-gray-600 hover:bg-gray-200'}`}><CreditCard className="w-5 h-5"/> Pembayaran & QRIS</button>
                       <button onClick={() => setSettingsTab('certificate')} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${settingsTab === 'certificate' ? 'bg-[#2B427A] text-white shadow-[2px_2px_0px_0px_#000]' : 'text-gray-600 hover:bg-gray-200'}`}><Award className="w-5 h-5"/> Sertifikat Default</button>
                   </nav>
               </div>
               
               {/* Settings Content */}
               <div className="flex-1 overflow-y-auto p-8 bg-white">
                   {settingsTab === 'certificate' && (<div className="animate-fade-in h-full flex flex-col"><div className="mb-6 flex justify-between items-center border-b pb-4"><div><h3 className="font-black text-[#2B427A] uppercase mb-1">Desain Sertifikat Default</h3><p className="text-gray-500 text-sm">Template ini akan digunakan jika acara tidak memiliki desain spesifik.</p></div><button onClick={handleSaveCertSettings} disabled={savingCertSettings} className="px-5 py-2 bg-[#0B1CDE] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A]">{savingCertSettings ? <Loader className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SIMPAN TEMPLATE</button></div><div className="flex-1 relative">{renderDesigner(false)}</div></div>)}
                   {settingsTab === 'payment' && (
                      <div className="animate-fade-in max-w-4xl mx-auto">
                         <div className="flex justify-between items-center mb-8 border-b pb-4"><h3 className="font-black text-[#2B427A] uppercase">Pengaturan Rekening & QRIS</h3><button onClick={handleSavePaymentSettings} disabled={savingPayment} className="px-5 py-2 bg-[#0B1CDE] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A]">{savingPayment ? <Loader className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SIMPAN PENGATURAN</button></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                 <h4 className="font-bold text-[#2B427A] mb-4 uppercase text-sm border-b pb-2">Daftar Rekening Bank</h4>
                                 <div className="space-y-4 mb-6">{paymentSettings.bankAccounts.map((acc, idx) => (<div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all"><div><div className="font-black text-[#2B427A]">{acc.bankName}</div><div className="text-sm font-mono text-gray-600">{acc.accountNumber}</div><div className="text-xs text-gray-400 uppercase">{acc.accountHolder}</div></div><button onClick={() => { const updated = paymentSettings.bankAccounts.filter((_, i) => i !== idx); setPaymentSettings({...paymentSettings, bankAccounts: updated}); }} className="text-red-500 bg-white p-2 rounded border border-gray-200 hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></div>))}{paymentSettings.bankAccounts.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada rekening.</p>}</div>
                                 <div className="bg-blue-50 p-5 rounded-xl border border-blue-100"><h5 className="font-bold text-[#0B1CDE] text-xs uppercase mb-3 flex items-center gap-2"><PlusCircle className="w-4 h-4"/> Tambah Rekening Baru</h5><div className="space-y-3"><input type="text" placeholder="Nama Bank (mis: BCA)" value={tempAccount.bankName} onChange={e=>setTempAccount({...tempAccount, bankName: e.target.value})} className="w-full p-2 text-sm border rounded font-bold" /><input type="text" placeholder="Nomor Rekening" value={tempAccount.accountNumber} onChange={e=>setTempAccount({...tempAccount, accountNumber: e.target.value})} className="w-full p-2 text-sm border rounded font-bold" /><input type="text" placeholder="Atas Nama" value={tempAccount.accountHolder} onChange={e=>setTempAccount({...tempAccount, accountHolder: e.target.value})} className="w-full p-2 text-sm border rounded font-bold" /><button onClick={() => { if(tempAccount.bankName && tempAccount.accountNumber) { setPaymentSettings({...paymentSettings, bankAccounts: [...paymentSettings.bankAccounts, { ...tempAccount, id: Date.now().toString() }]}); setTempAccount({ id: '', bankName: '', accountNumber: '', accountHolder: '' }); } }} className="w-full py-2 bg-[#2B427A] text-white font-bold rounded text-sm hover:bg-[#0B1CDE]">TAMBAH KE DAFTAR</button></div></div>
                            </div>
                            <div><h4 className="font-bold text-[#2B427A] mb-4 uppercase text-sm border-b pb-2">Upload QRIS</h4><div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer relative transition-colors"><input type="file" accept="image/*" onChange={(e) => setQrisFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>{qrisFile ? (<div className="flex flex-col items-center"><div className="bg-green-100 text-green-700 p-2 rounded mb-2"><CheckCircle className="w-6 h-6"/></div><div className="text-sm font-bold text-gray-800">{qrisFile.name}</div><div className="text-xs text-gray-500 mt-1">Klik untuk ganti</div></div>) : paymentSettings.qrisUrl ? (<div className="flex flex-col items-center"><img src={paymentSettings.qrisUrl} className="h-48 object-contain mb-4 rounded border shadow-sm" alt="QRIS" /><span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">Klik untuk ganti gambar</span></div>) : (<div className="py-8"><Upload className="w-10 h-10 text-gray-300 mx-auto mb-2"/><div className="text-gray-500 font-bold text-sm">Upload Gambar QRIS (JPG/PNG)</div></div>)}</div></div>
                         </div>
                      </div>
                   )}
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
      
      {/* WIZARD MODAL (Restored Full Logic from previous fix) */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-[#2B427A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden border-4 border-[#DFFF00] animate-scale-up">
                  {/* ... (Sidebar Steps) */}
                  <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                      <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-black text-[#2B427A] uppercase leading-tight">{editingId ? 'Edit Acara' : 'Buat Acara'}</h2></div>
                      <div className="flex-1 py-4 overflow-y-auto">{[{ step: 1, label: 'Info Dasar', icon: LayoutList }, { step: 2, label: 'Detail & Media', icon: FileText }, { step: 3, label: 'Formulir', icon: FormInput }, { step: 4, label: 'Harga & Kuota', icon: UsersIcon }, { step: 5, label: 'Desain Sertifikat', icon: Palette }].map((item) => (<button key={item.step} onClick={() => setWizardStep(item.step)} className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors border-l-4 ${wizardStep === item.step ? 'bg-white border-[#0B1CDE] text-[#0B1CDE]' : wizardStep > item.step ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${wizardStep === item.step ? 'border-[#0B1CDE] bg-[#0B1CDE] text-white' : wizardStep > item.step ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>{wizardStep > item.step ? <CheckCircle className="w-4 h-4"/> : item.step}</div><span className="font-bold text-sm">{item.label}</span></button>))}</div>
                      <div className="p-4 border-t border-gray-200"><button onClick={() => { setShowCreateModal(false); resetWizard(); }} className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"><XCircle className="w-4 h-4"/> BATAL</button></div>
                  </div>
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col bg-white">
                      <div className="flex-1 overflow-y-auto p-8 relative">
                         {/* STEP 1 */}
                         {wizardStep === 1 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Informasi Dasar</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label><input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" placeholder="Contoh: Seminar Nasional Bisnis" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label><input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu</label><input type="time" value={newEvent.time||'09:00'} onChange={e=>setNewEvent({...newEvent, time:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label><select value={isCustomCat ? 'OTHER' : newEvent.category} onChange={(e) => { if (e.target.value === 'OTHER') { setIsCustomCat(true); setNewEvent({...newEvent, category: ''}); } else { setIsCustomCat(false); setNewEvent({...newEvent, category: e.target.value}); } }} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold bg-white focus:border-[#0B1CDE] outline-none">{Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}<option value="OTHER">Lainnya...</option></select>{isCustomCat && <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full mt-2 p-3 border-2 border-[#DFFF00] rounded-xl font-bold" placeholder="Ketik Kategori..." />}</div></div></div>)}
                         {/* STEP 2 */}
                         {wizardStep === 2 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Detail & Media</h3><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label><input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" placeholder="Link Zoom / Alamat Lengkap" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase flex justify-between">Deskripsi<button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs text-[#0B1CDE] flex items-center gap-1 hover:underline">{generatingDesc ? <Loader className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} GENERATE WITH AI</button></label><textarea rows={6} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-medium focus:border-[#0B1CDE] outline-none"/></div><div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-200 flex items-center justify-between"><div><h4 className="font-black text-[#2B427A] uppercase flex items-center gap-2"><QrCode className="w-5 h-5"/> Sistem Tiket QR Code</h4><p className="text-xs text-gray-500 font-bold mt-1">Aktifkan agar peserta mendapatkan QR Code unik untuk Check-In saat acara.</p></div><div className="flex items-center gap-3"><span className={`text-xs font-bold ${newEvent.enableTicketScanner ? 'text-[#0B1CDE]' : 'text-gray-400'}`}>{newEvent.enableTicketScanner ? 'AKTIF' : 'NONAKTIF'}</span><button onClick={() => setNewEvent({...newEvent, enableTicketScanner: !newEvent.enableTicketScanner})} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${newEvent.enableTicketScanner ? 'bg-[#0B1CDE]' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${newEvent.enableTicketScanner ? 'left-7' : 'left-1'}`} /></button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center"><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Banner Utama</label><input type="file" onChange={handleBannerChange} className="w-full text-xs" />{bannerPreview ? <img src={bannerPreview} className="mt-4 h-32 w-full object-cover rounded-lg border"/> : <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Preview Banner</div>}</div><div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center"><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Thumbnail (4:5)</label><input type="file" onChange={handleThumbnailChange} className="w-full text-xs" />{thumbnailPreview ? <img src={thumbnailPreview} className="mt-4 h-32 w-auto mx-auto object-cover rounded-lg border"/> : <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Preview Thumbnail</div>}</div></div></div>)}
                         {/* STEP 3 */}
                         {wizardStep === 3 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Formulir Pendaftaran</h3><div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6"><p className="text-sm text-blue-800 font-medium flex items-center gap-2"><Info className="w-4 h-4"/> Field <strong>Nama</strong> dan <strong>Email</strong> sudah termasuk secara otomatis.</p></div>{newEvent.formFields?.map((field, idx) => (<div key={idx} className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in"><div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Label Field</label><input type="text" value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })} className="w-full p-2 border rounded font-bold text-sm" placeholder="Contoh: No. WhatsApp"/></div><div className="w-32"><label className="text-[10px] font-bold text-gray-400 uppercase">Tipe</label><select value={field.type} onChange={e => updateFormField(idx, { type: e.target.value as FormFieldType })} className="w-full p-2 border rounded font-bold text-sm"><option value="text">Teks</option><option value="number">Angka</option><option value="select">Pilihan</option><option value="textarea">Area Teks</option></select></div>{field.type === 'select' && (<div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Opsi (Pisahkan Koma)</label><input type="text" value={field.options?.join(',')} onChange={e => updateFormField(idx, { options: e.target.value.split(',').map(s=>s.trim()) })} className="w-full p-2 border rounded font-bold text-sm" placeholder="Pilihan A, Pilihan B"/></div>)}<button onClick={() => removeFormField(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5"/></button></div>))}<button onClick={addFormField} className="w-full py-4 border-2 border-dashed border-[#2B427A] text-[#2B427A] font-bold rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"><Plus className="w-5 h-5"/> TAMBAH FIELD CUSTOM</button></div>)}
                         {/* STEP 4 */}
                         {wizardStep === 4 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Harga & Kuota</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><label className="block text-sm font-black text-[#2B427A] mb-4 uppercase">Harga Tiket</label><div className="flex items-center gap-3"><span className="text-2xl font-bold text-gray-400">Rp</span><input type="number" value={newEvent.price} onChange={e=>setNewEvent({...newEvent, price: Number(e.target.value)})} className="flex-1 text-4xl font-black text-[#0B1CDE] outline-none border-b-2 border-gray-200 focus:border-[#0B1CDE] py-2" /></div><p className="text-xs text-gray-400 mt-4 font-bold bg-gray-50 p-2 rounded inline-block">Masukkan 0 untuk Acara GRATIS</p></div><div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><label className="block text-sm font-black text-[#2B427A] mb-4 uppercase">Kuota Peserta</label><div className="flex items-center gap-3"><UsersIcon className="w-8 h-8 text-gray-400"/><input type="number" value={newEvent.maxParticipants} onChange={e=>setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} className="flex-1 text-4xl font-black text-[#0B1CDE] outline-none border-b-2 border-gray-200 focus:border-[#0B1CDE] py-2" /></div></div></div></div>)}
                         {/* STEP 5 */}
                         {wizardStep === 5 && (<div className="space-y-6 animate-fade-in h-full flex flex-col"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Desain Sertifikat</h3><p className="text-sm text-gray-500 mb-4">Buat desain sertifikat khusus untuk acara ini. Jika dikosongkan, sertifikat default akan digunakan.</p><div className="flex-1 border rounded-xl overflow-hidden">{renderDesigner(true)}</div></div>)}
                      </div>
                      <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">{wizardStep > 1 ? (<button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2"><ChevronLeft className="w-4 h-4"/> KEMBALI</button>) : <div/>}{wizardStep < 5 ? (<button onClick={()=>setWizardStep(prev=>prev+1)} className="px-8 py-3 rounded-xl font-black bg-[#2B427A] text-white flex items-center gap-2 shadow-lg hover:bg-[#0B1CDE] transition-colors">SELANJUTNYA <ChevronRight className="w-4 h-4"/></button>) : (<button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-10 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[-2px] transition-all flex items-center gap-2">{isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} {editingId ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN ACARA'}</button>)}</div>
                  </div>
              </div>
          </div>
      )}
      <style>{`@keyframes slide-up {0% { transform: translate(-50%, 100%); opacity: 0; }100% { transform: translate(-50%, 0); opacity: 1; }}.animate-slide-up {animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;}`}</style>
    </div>
  );
};

export default AdminDashboard;
