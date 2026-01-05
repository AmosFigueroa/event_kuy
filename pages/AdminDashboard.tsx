
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil, Save, PlusSquare, Move, Type, MapPin, Tag, AlignLeft, AlignCenter, AlignRight, DollarSign, Hash, MousePointer2, FileText, Image as ImgIcon, FileSpreadsheet, Scaling, X, Send, QrCode, ScanLine, Download, ChevronDown, ChevronUp, LayoutList, FormInput, Palette, FileCheck, Info, Bot, ExternalLink, Paperclip, Database, Type as TypeIcon, ImagePlus, Bold, AlignJustify, UserCheck, CheckSquare, ListChecks, Menu, Percent, ToggleLeft, ToggleRight, List, AtSign, FileUp, CalendarDays, CheckSquare2, CircleDot, AlertCircle, Smartphone, Monitor, Printer } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession, createSlug, deleteEvent, toggleEventStatus, savePaymentSettings, fetchPaymentSettings, updateEvent, fetchCertificateSettings, saveCertificateSettings, sendBulkCertificates, fetchParticipantsCsv } from '../services/api';
import { generateEventDescription, analyzePaymentProof, PaymentAnalysisResult } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus, FormField, FormFieldType, PaymentSettings, BankAccount, CertificateConfig, CertificateElement } from '../types';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';

// Constants for Certificate Canvas (A4 Landscape aspect ratio)
const CANVAS_WIDTH = 842;
const CANVAS_HEIGHT = 595;

const AdminDashboard: React.FC = () => {
  // View State: 'overview' | 'events' | 'registrations' | 'settings' | 'event-editor' | 'scan-history'
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCert, setProcessingCert] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const navigate = useNavigate();
  const session = getUserSession();
  
  // Screen Size Detection for Designer
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); 
  
  // Toast State
  const [toast, setToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  // Proof Viewer & AI Analysis State
  const [viewingProof, setViewingProof] = useState<Registration | null>(null);
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

  // Calculated Stats
  const [uniqueUserCount, setUniqueUserCount] = useState(0);

  // Scan History Specific State
  const [scanHistoryEventId, setScanHistoryEventId] = useState<string>('');

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
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    category: EventCategory.SEMINAR,
    price: 0,
    maxParticipants: 100,
    formFields: [],
    time: '09:00',
    certificateConfig: { backgroundUrl: '', elements: [] },
    enableTicketScanner: false,
    autoSendCertificate: false
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
    
    // Resize Listener
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  // Close mobile sidebar on tab change
  useEffect(() => {
      setIsMobileSidebarOpen(false);
  }, [activeTab]);

  // Set default event for scan history if events loaded
  useEffect(() => {
      if (events.length > 0 && !scanHistoryEventId) {
          setScanHistoryEventId(events[0].id);
      }
  }, [events]);

  const formatDriveUrl = (url: string) => {
      if (!url) return '';
      if (url.includes('lh3.googleusercontent.com') || !url.includes('google.com')) return url;
      let id = '';
      const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match1) id = match1[1];
      if (!id && url.includes('id=')) {
          try {
            const urlObj = new URL(url);
            id = urlObj.searchParams.get('id') || '';
          } catch(e) {
             const params = url.split('?')[1];
             if(params) {
                 const p = new URLSearchParams(params);
                 id = p.get('id') || '';
             }
          }
      }
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
      return url;
  };

  const formatTimeDisplay = (time: string | undefined) => {
      if (!time) return '-';
      if (time.includes('T')) {
          try {
              const dateObj = new Date(time);
              if (isNaN(dateObj.getTime())) return time;
              return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
          } catch(e) {
              return time.split('T')[1]?.substring(0,5) || time;
          }
      }
      return time;
  };

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
      if (payment && payment.qrisUrl) setQrisPreview(payment.qrisUrl);
      const uniqueEmails = new Set(regs?.map(r => r.userEmail.toLowerCase()) || []);
      setUniqueUserCount(uniqueEmails.size);
      const loadedCert = certs || { backgroundUrl: '', elements: [] };
      setCertSettings(loadedCert);
      if (loadedCert.backgroundUrl) setCertSettingsBgPreview(loadedCert.backgroundUrl);
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
      // ... (Implementation preserved)
      if (!viewingProof || !viewingProof.proofUrl) return;
      const event = events.find(e => e.id === viewingProof.eventId);
      const expectedAmount = event ? event.price : 0;
      setIsAnalyzing(true);
      setAiResult(null);
      try {
          const directUrl = formatDriveUrl(viewingProof.proofUrl);
          const response = await fetch(directUrl, { mode: 'cors' });
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
          setAiResult({ isValid: false, reason: "Gagal mengambil gambar. Cek manual.", confidence: 'LOW' });
      }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
      // ... (Implementation preserved)
      try {
          await updateRegistrationStatus(id, status);
          if (status === RegistrationStatus.APPROVED) {
              const reg = registrations.find(r => r.id === id);
              if (reg) {
                  const evt = events.find(e => e.id === reg.eventId);
                  if (evt && evt.autoSendCertificate) {
                      setToast({ show: true, msg: `Status diperbarui & Mengirim Sertifikat...` });
                      await sendCertificate(id);
                      setToast({ show: true, msg: `Sertifikat Terkirim Otomatis!` });
                  } else {
                      setToast({ show: true, msg: `Status diperbarui menjadi ${status}` });
                  }
              }
          } else {
              setToast({ show: true, msg: `Status diperbarui menjadi ${status}` });
          }
          setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
          if (viewingProof?.id === id) setViewingProof(null);
          setTimeout(() => setToast({show: false, msg: ''}), 3000);
      } catch (error: any) {
          showAlert('error', 'Gagal', error.message);
      }
  };

  const handleExportData = async () => { setExportLoading(true); try { const csvString = await fetchParticipantsCsv(selectedEventFilter); const blob = new Blob([csvString], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `participants_export_${new Date().toISOString()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url); setShowExportModal(false); } catch (e: any) { showAlert('error', 'Gagal', 'Gagal mengunduh CSV.'); } finally { setExportLoading(false); } };
  const handleBulkSendCertificates = () => { if (selectedEventFilter === 'ALL') { showAlert('error', 'Pilih Acara', 'Silakan pilih spesifik acara terlebih dahulu di menu filter.'); return; } const eligibleRegistrations = registrations.filter(r => r.eventId === selectedEventFilter && r.status === RegistrationStatus.APPROVED); if (eligibleRegistrations.length === 0) { showAlert('info', 'Tidak Ada Peserta', 'Tidak ada peserta dengan status APPROVED untuk acara ini.'); return; } showConfirm( 'Kirim Semua Sertifikat?', `Akan mengirim ${eligibleRegistrations.length} email sertifikat. Lanjutkan?`, async () => { setIsBulkSending(true); try { const ids = eligibleRegistrations.map(r => r.id); const result = await sendBulkCertificates(ids); showAlert('success', 'Selesai', `Berhasil terkirim: ${result.sent}. Gagal: ${result.failed}`); } catch (e: any) { showAlert('error', 'Gagal', e.message || 'Terjadi kesalahan.'); } finally { setIsBulkSending(false); } }, 'KIRIM SEKARANG' ); };
  const handleSaveCertSettings = async () => { setSavingCertSettings(true); try { let bgBase64 = undefined; if (certTemplateFile) { bgBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); reader.readAsDataURL(certTemplateFile); }); } await saveCertificateSettings(certSettings, bgBase64); showAlert('success', 'Tersimpan', 'Template sertifikat default disimpan.'); } catch (e: any) { showAlert('error', 'Gagal', e.message); } finally { setSavingCertSettings(false); } };
  
  const handleSavePaymentSettings = async () => { 
      setSavingPayment(true); 
      try { 
          let qrisBase64 = undefined; 
          if (qrisFile) { 
              qrisBase64 = await new Promise<string>((resolve) => { 
                  const reader = new FileReader(); 
                  reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); 
                  reader.readAsDataURL(qrisFile); 
              }); 
          } 
          const res = await savePaymentSettings(paymentSettings, qrisBase64); 
          if (res && res.qrisUrl) setQrisPreview(res.qrisUrl);
          showAlert('success', 'Tersimpan', 'Pengaturan pembayaran berhasil disimpan.'); 
      } catch (e: any) { 
          showAlert('error', 'Gagal', e.message); 
      } finally { 
          setSavingPayment(false); 
      } 
  };

  const resetWizard = () => { setNewEvent({ category: EventCategory.SEMINAR, price: 0, maxParticipants: 100, formFields: [], time: '09:00', certificateConfig: { backgroundUrl: '', elements: [] }, enableTicketScanner: false, autoSendCertificate: false }); setBannerFile(null); setBannerPreview(null); setThumbnailFile(null); setThumbnailPreview(null); setCertBgFile(null); setCertBgPreview(null); setIsCustomCat(false); setCustomCategory(''); setWizardStep(1); setEditingId(null); };
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setBannerFile(file); const reader = new FileReader(); reader.onload = (ev) => setBannerPreview(ev.target?.result as string); reader.readAsDataURL(file); } };
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setThumbnailFile(file); const reader = new FileReader(); reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string); reader.readAsDataURL(file); } };
  const handleGenerateDescription = async () => { if (!newEvent.title || !newEvent.category) { showAlert('error', 'Error', 'Mohon isi Judul dan Kategori.'); return; } setGeneratingDesc(true); try { const desc = await generateEventDescription(newEvent.title, isCustomCat ? customCategory : newEvent.category || '', `Lokasi: ${newEvent.location || '-'}, Waktu: ${newEvent.time || '-'}`); setNewEvent(prev => ({ ...prev, description: desc })); } catch (e: any) { showAlert('error', 'AI Error', e.message); } finally { setGeneratingDesc(false); } };
  const addFormField = () => { setNewEvent(prev => ({ ...prev, formFields: [...(prev.formFields || []), { id: Date.now().toString(), label: '', type: 'text', required: true, options: [] }] })); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { const fields = [...(newEvent.formFields || [])]; fields[index] = { ...fields[index], ...updates }; setNewEvent(prev => ({ ...prev, formFields: fields })); };
  const removeFormField = (index: number) => { const fields = [...(newEvent.formFields || [])]; fields.splice(index, 1); setNewEvent(prev => ({ ...prev, formFields: fields })); };
  const handleCreateOrUpdateEvent = async () => { setIsSubmittingEvent(true); try { let bannerBase64 = undefined; if (bannerFile) { bannerBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); reader.readAsDataURL(bannerFile); }); } let thumbnailBase64 = undefined; if (thumbnailFile) { thumbnailBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); reader.readAsDataURL(thumbnailFile); }); } let certBgBase64 = undefined; if (certBgFile) { certBgBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); reader.readAsDataURL(certBgFile); }); } const eventPayload = { ...newEvent, category: isCustomCat ? customCategory : newEvent.category }; if (editingId) { await updateEvent({ ...eventPayload, id: editingId }, bannerBase64, certBgBase64, thumbnailBase64); showAlert('success', 'Berhasil', 'Acara berhasil diperbarui.'); } else { await createEvent(eventPayload, bannerBase64 || '', certBgBase64, thumbnailBase64); showAlert('success', 'Berhasil', 'Acara berhasil dibuat.'); } setActiveTab('events'); loadData(); } catch (e: any) { showAlert('error', 'Gagal', e.message); } finally { setIsSubmittingEvent(false); } };

  // ... (Designer Logic Same) ...
  const renderDesigner = () => {
      // ... (Same implementation)
      if (isMobile) {
          return (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gray-100/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                          <Monitor className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-black text-[#2B427A] mb-2 uppercase">Editor Terkunci</h3>
                      <p className="text-sm text-gray-500 font-bold mb-4 max-w-xs">
                          Fitur desain sertifikat hanya tersedia di Desktop/Laptop untuk pengalaman terbaik.
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-200">
                          <Smartphone className="w-4 h-4"/> Mode Tampilan HP
                      </div>
                  </div>
                  <div className="opacity-20 w-full h-full flex items-center justify-center">
                      <div className="w-64 h-48 border-4 border-gray-300"></div>
                  </div>
              </div>
          );
      }
      return (
          <div className="h-full flex flex-col bg-gray-100 border rounded-lg overflow-hidden relative">
              <div className="p-2 bg-white border-b flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">CANVAS (842px x 595px)</span>
                  <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold text-gray-600">RESET</button>
                  </div>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#e5e5e5]">
                  <div className="bg-white shadow-2xl relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                      {certBgPreview ? (
                          <img src={certBgPreview} className="w-full h-full object-cover" alt="Background" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-2xl uppercase border-2 border-dashed border-gray-300">
                              Upload Background
                          </div>
                      )}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-blue-400 p-2 text-blue-600 bg-white/80 font-bold cursor-move">
                          [NAMA PESERTA]
                      </div>
                  </div>
              </div>
              <div className="p-4 bg-white border-t">
                  <div className="flex gap-4 items-center">
                      <div className="flex-1">
                          <label className="text-xs font-bold block mb-1">Background Image</label>
                          <input type="file" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  setCertBgFile(file);
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setCertBgPreview(ev.target?.result as string);
                                  reader.readAsDataURL(file);
                              }
                          }} className="text-xs w-full" />
                      </div>
                      <div className="flex-1">
                          <p className="text-[10px] text-gray-400 font-bold">
                              *Gunakan gambar resolusi tinggi (A4 Landscape)
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderEventsList = () => (
      <div className="space-y-6 animate-fade-in">
          {/* ... (Same implementation) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h3 className="font-black text-[#2B427A] text-xl md:text-2xl uppercase">Daftar Acara</h3>
              <button onClick={() => { resetWizard(); setActiveTab('event-editor'); }} className="w-full md:w-auto px-6 py-2 bg-[#DFFF00] text-[#2B427A] rounded-lg font-black border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5"/> BUAT ACARA
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
                <div key={event.id} className="bg-white rounded-2xl border-2 border-[#2B427A] overflow-hidden flex flex-col shadow-[6px_6px_0px_0px_#2B427A]">
                    <div className="h-40 relative bg-gray-200">
                        {event.bannerUrl ? <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 font-bold text-xs">NO IMAGE</div>}
                        <div className="absolute top-4 right-4 bg-[#DFFF00] text-[#2B427A] font-black px-2 py-1 text-[10px] uppercase border border-[#2B427A] rounded shadow-sm">{event.category}</div>
                    </div>
                    <div className="p-4 flex-1">
                        <h4 className="text-lg font-black text-[#2B427A] uppercase mb-2 leading-tight line-clamp-2">{event.title}</h4>
                        <div className="flex flex-col gap-1 text-xs text-gray-500 font-bold mb-2">
                            <div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3 text-[#0B1CDE]" /><span>{new Date(event.date).toLocaleDateString()}</span></div>
                            <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#0B1CDE]" /><span>{formatTimeDisplay(event.time)} WIB</span></div>
                            <div className="flex items-center gap-2"><UsersIcon className="w-3 h-3 text-[#0B1CDE]" /><span>{event.currentParticipants}/{event.maxParticipants}</span></div>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 border-t-2 border-dashed border-[#2B427A]/20 flex gap-2 overflow-x-auto">
                        <button onClick={() => { resetWizard(); setEditingId(event.id); setNewEvent(event); setBannerPreview(event.bannerUrl); setThumbnailPreview(event.thumbnailUrl); setCertBgPreview(event.certificateConfig?.backgroundUrl || null); setActiveTab('event-editor'); }} className="flex-1 min-w-[60px] flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-[#0B1CDE] font-black rounded border border-blue-200 text-[10px]"><Edit2 className="w-3 h-3"/> EDIT</button>
                        <button onClick={async () => { await toggleEventStatus(event.id); loadData(); }} className={`flex-1 min-w-[60px] flex items-center justify-center gap-1 py-1.5 font-black rounded border text-[10px] ${event.isOpen ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}><Power className="w-3 h-3"/> {event.isOpen ? 'TUTUP' : 'BUKA'}</button>
                        <button onClick={() => showConfirm('Hapus?', 'Yakin?', async () => { await deleteEvent(event.id); loadData(); })} className="p-1.5 bg-red-50 text-red-500 rounded border border-red-200"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => navigate(`/scanner/${event.id}`)} className="p-1.5 bg-gray-100 text-gray-600 rounded border border-gray-200"><ScanLine className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
          </div>
          {events.length === 0 && <div className="text-center py-12 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl text-sm">Belum ada acara.</div>}
      </div>
  );

  const renderRegistrations = () => {
      // ... (Same implementation)
      const filtered = registrations.filter(r => selectedEventFilter === 'ALL' || r.eventId === selectedEventFilter);
      return (
          <div className="animate-fade-in space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Filter Acara</label>
                      <select value={selectedEventFilter} onChange={e => setSelectedEventFilter(e.target.value)} className="w-full p-2 border rounded font-bold text-sm">
                          <option value="ALL">Semua Acara</option>
                          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                  </div>
                  <div className="flex gap-2 items-end">
                      <button onClick={handleExportData} className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg font-bold text-xs flex items-center gap-2"><FileSpreadsheet className="w-4 h-4"/> EXPORT CSV</button>
                      <button onClick={handleBulkSendCertificates} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold text-xs flex items-center gap-2"><Send className="w-4 h-4"/> KIRIM SERTIFIKAT</button>
                  </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 font-black uppercase text-xs">
                              <tr>
                                  <th className="p-4">Peserta</th>
                                  <th className="p-4">Acara</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Bukti</th>
                                  <th className="p-4 text-center">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filtered.length === 0 ? (
                                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">Tidak ada data.</td></tr>
                              ) : filtered.map(reg => (
                                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-4">
                                          <div className="font-bold text-[#2B427A]">{reg.userName}</div>
                                          <div className="text-xs text-gray-400">{reg.userEmail}</div>
                                          <div className="text-[10px] text-gray-300 font-mono mt-1">{reg.id}</div>
                                      </td>
                                      <td className="p-4">
                                          <div className="font-bold text-gray-600 line-clamp-1">{reg.eventTitle}</div>
                                      </td>
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                                              reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-600 border-green-200' :
                                              reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-600 border-red-200' :
                                              'bg-yellow-100 text-yellow-600 border-yellow-200'
                                          }`}>
                                              {reg.status}
                                          </span>
                                      </td>
                                      <td className="p-4">
                                          <button onClick={() => { setViewingProof(reg); handleAiAnalysis(); }} className="text-[#0B1CDE] font-bold text-xs flex items-center gap-1 hover:underline">
                                              <Eye className="w-3 h-3"/> LIHAT
                                          </button>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex justify-center gap-2">
                                              <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.APPROVED)} className="p-1.5 bg-green-50 text-green-600 rounded border border-green-200 hover:bg-green-100" title="Setujui"><CheckCircle className="w-4 h-4"/></button>
                                              <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.REJECTED)} className="p-1.5 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100" title="Tolak"><XCircle className="w-4 h-4"/></button>
                                              {reg.status === RegistrationStatus.APPROVED && (
                                                  <button onClick={() => sendCertificate(reg.id)} className="p-1.5 bg-blue-50 text-[#0B1CDE] rounded border border-blue-200 hover:bg-blue-100" title="Kirim Sertifikat Manual"><Award className="w-4 h-4"/></button>
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

  // REFACTORED SCAN HISTORY to match screenshot
  const renderScanHistory = () => {
      // Logic for Stats
      const currentEvent = events.find(e => e.id === scanHistoryEventId);
      const eventRegistrations = registrations.filter(r => r.eventId === scanHistoryEventId);
      
      const totalParticipants = eventRegistrations.filter(r => r.status === RegistrationStatus.APPROVED).length;
      const presentParticipants = eventRegistrations.filter(r => r.checkInStatus === 'CHECKED_IN').length;
      const presencePercentage = totalParticipants > 0 ? Math.round((presentParticipants / totalParticipants) * 100) : 0;

      // Get Logs (Checked in users) sorted by time desc
      const scanLogs = eventRegistrations
          .filter(r => r.checkInStatus === 'CHECKED_IN')
          .sort((a, b) => new Date(b.checkInTime || '').getTime() - new Date(a.checkInTime || '').getTime());

      return (
          <div className="animate-fade-in space-y-6">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#2B427A] text-xl md:text-2xl uppercase">RIWAYAT SCAN</h3>
                  <button 
                    onClick={handleExportAttendance} // Using existing export handler but contextual
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-xs flex items-center gap-2 border border-green-200 hover:bg-green-200 transition-colors"
                  >
                      <FileSpreadsheet className="w-4 h-4"/> LAPORAN
                  </button>
              </div>

              {/* Event Selector */}
              <div className="bg-white p-4 rounded-xl border-2 border-[#2B427A] shadow-sm">
                  <select 
                      value={scanHistoryEventId} 
                      onChange={(e) => setScanHistoryEventId(e.target.value)}
                      className="w-full text-lg font-bold text-[#2B427A] outline-none bg-transparent cursor-pointer"
                  >
                      {events.length === 0 && <option value="">Belum ada acara</option>}
                      {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">HADIR</p>
                      <p className="text-3xl font-black text-[#0B1CDE]">{presentParticipants}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">TOTAL</p>
                      <p className="text-3xl font-black text-[#2B427A]">{totalParticipants}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">PERSENTASE</p>
                      <div className="flex items-end gap-1">
                          <p className="text-3xl font-black text-[#DFFF00] text-outline">{presencePercentage}</p>
                          <span className="text-lg font-bold text-[#2B427A] mb-1">%</span>
                      </div>
                  </div>
              </div>

              {/* Logs Table */}
              <div className="bg-[#2B427A] text-white rounded-t-xl p-4 flex justify-between font-bold text-xs uppercase tracking-wider">
                  <div className="w-1/4">WAKTU</div>
                  <div className="w-1/2">PESERTA</div>
                  <div className="w-1/4 text-right">ACARA</div>
              </div>
              <div className="bg-white border-2 border-[#2B427A] border-t-0 rounded-b-xl overflow-hidden shadow-sm">
                  {scanLogs.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-bold italic text-sm">Belum ada data scan masuk.</div>
                  ) : (
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                          {scanLogs.map((log) => (
                              <div key={log.id} className="p-4 flex justify-between items-center text-sm hover:bg-gray-50 transition-colors">
                                  <div className="w-1/4 font-mono text-gray-500 font-bold">
                                      {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-'}
                                  </div>
                                  <div className="w-1/2 font-bold text-[#2B427A] truncate pr-4">
                                      {log.userName}
                                  </div>
                                  <div className="w-1/4 text-right text-xs font-bold text-[#0B1CDE] truncate">
                                      {currentEvent?.title || '-'}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  // Helper for Export inside Scan History (reused logic)
  const handleExportAttendance = () => {
      if (!scanHistoryEventId) return;
      const checkedInUsers = registrations.filter(r => r.eventId === scanHistoryEventId && r.checkInStatus === 'CHECKED_IN');
      if (checkedInUsers.length === 0) {
          showAlert('info', 'Data Kosong', 'Belum ada peserta yang check-in untuk acara ini.');
          return;
      }
      const eventTitle = events.find(e => e.id === scanHistoryEventId)?.title || "Event";
      let csvContent = "No,Nama Peserta,Email,Waktu Check-In,Ticket ID\n";
      checkedInUsers.forEach((r, index) => {
          const time = r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '-';
          csvContent += `${index + 1},"${r.userName}","${r.userEmail}","${time}","${r.id}"\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kehadiran_${eventTitle.replace(/[^a-z0-9]/gi, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative overflow-x-hidden">
      <CustomAlert isOpen={alertState.isOpen} type={alertState.type} title={alertState.title} message={alertState.message} onClose={closeAlert} onConfirm={alertState.onConfirm} confirmText={alertState.confirmText}/>
      {/* Proof Modal */}
      {viewingProof && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setViewingProof(null)}>
              <div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-black text-[#2B427A]">Bukti Pembayaran</h3>
                      <button onClick={() => setViewingProof(null)}><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex flex-col items-center">
                      <img src={formatDriveUrl(viewingProof.proofUrl)} alt="Bukti" className="max-w-full rounded border shadow-sm" />
                      {/* ... AI Result Logic Same ... */}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-between gap-4">
                      <div className="flex-1">
                          <p className="text-xs font-bold text-gray-500 uppercase">Peserta</p>
                          <p className="font-bold text-[#2B427A]">{viewingProof.userName}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.APPROVED)} className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm shadow hover:bg-green-700">TERIMA</button>
                          <button onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.REJECTED)} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm shadow hover:bg-red-700">TOLAK</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* ... Export Modal & Sidebar ... */}
      {/* ... (Main Content Layout same as before) ... */}
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-[#2B427A] border-r-2 border-[#2B427A] text-white transition-transform duration-300 transform 
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0 md:flex md:flex-col md:w-72
      `}>
        {/* ... Sidebar Content ... */}
        <div className="p-6 border-b-2 border-white/10 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-tighter">ADMIN <div className="w-3 h-3 bg-[#DFFF00]"></div></h1>
                <div className="mt-2 text-[10px] bg-[#0B1CDE] p-1.5 rounded text-white font-mono truncate max-w-[180px]">{session?.email}</div>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden text-white hover:text-[#DFFF00]"><X className="w-6 h-6"/></button>
        </div>
        <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
            {[ {id: 'overview', label: 'Ringkasan', icon: LayoutDashboard}, {id: 'events', label: 'Acara', icon: CalendarIcon}, {id: 'registrations', label: 'Pendaftar', icon: UsersIcon}, {id: 'scan-history', label: 'Riwayat Scan', icon: QrCode}, {id: 'settings', label: 'Pengaturan', icon: SettingsIcon} ].map(item => (
                <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    className={`w-full flex items-center gap-3 px-5 py-3 rounded-lg font-black border-2 uppercase tracking-wide transition-all duration-200 ${activeTab === item.id || (item.id === 'events' && activeTab === 'event-editor') ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A] shadow-[4px_4px_0px_0px_#000] transform -translate-y-1' : 'text-white border-transparent hover:bg-white/10'}`}
                >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-[#2B427A]' : 'text-[#DFFF00]'}`} /> 
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header for Sidebar Toggle */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
            <h2 className="font-black text-[#2B427A] uppercase">Dashboard</h2>
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 bg-[#2B427A] text-white rounded-lg">
                <Menu className="w-5 h-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {loading && <div className="mb-6 bg-[#DFFF00] text-[#2B427A] px-4 py-2 rounded-lg inline-flex items-center gap-2 font-black border-2 border-[#2B427A]"><Loader className="w-4 h-4 animate-spin"/> MEMUAT DATA...</div>}
            
            {/* EVENT EDITOR */}
            {activeTab === 'event-editor' && (
                <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-140px)] bg-white rounded-xl border-2 border-[#2B427A] shadow-md overflow-hidden animate-fade-in">
                    {/* ... Wizard Steps Sidebar ... */}
                    <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                        <div className="p-4 border-b"><h2 className="font-black text-[#2B427A] uppercase">{editingId ? 'Edit' : 'Buat'} Acara</h2></div>
                        <div className="flex-1 py-2 overflow-y-auto flex md:flex-col gap-2 p-2 whitespace-nowrap md:whitespace-normal">
                            {[1,2,3,4,5].map(step => (
                                <button key={step} onClick={() => setWizardStep(step)} className={`flex-shrink-0 md:flex-shrink p-2 md:px-4 md:py-3 rounded-lg text-xs font-bold border transition-colors ${wizardStep === step ? 'bg-white border-[#0B1CDE] text-[#0B1CDE]' : 'border-transparent text-gray-400'}`}>Step {step}</button>
                            ))}
                        </div>
                        <div className="p-4 border-t"><button onClick={() => { setActiveTab('events'); resetWizard(); }} className="w-full py-2 text-red-500 font-bold hover:bg-red-50 rounded border border-red-100 text-xs">BATAL</button></div>
                    </div>

                    <div className="flex-1 flex flex-col bg-white overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 relative">
                            {/* Wizard Steps 1, 2 */}
                            {wizardStep === 1 && (<div className="space-y-4"><h3 className="font-black text-[#2B427A]">INFO DASAR</h3><div className="grid md:grid-cols-2 gap-4"><input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full p-2 border-2 rounded-lg font-bold text-sm" placeholder="Judul Acara" /><input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full p-2 border-2 rounded-lg font-bold text-sm" />
                            <div className="w-full"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Waktu Mulai (WIB)</label><div className="flex gap-2 items-center"><div className="relative flex-1"><select value={(newEvent.time || '09:00').split(':')[0]} onChange={(e) => { const m = (newEvent.time || '09:00').split(':')[1] || '00'; setNewEvent({ ...newEvent, time: `${e.target.value}:${m}` }); }} className="w-full appearance-none p-2 border-2 border-gray-200 rounded-lg font-bold text-sm bg-white focus:border-[#0B1CDE] outline-none text-center">{Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (<option key={h} value={h}>{h}</option>))}</select></div><span className="font-black text-[#2B427A]">:</span><div className="relative flex-1"><select value={(newEvent.time || '09:00').split(':')[1]} onChange={(e) => { const h = (newEvent.time || '09:00').split(':')[0] || '09'; setNewEvent({ ...newEvent, time: `${h}:${e.target.value}` }); }} className="w-full appearance-none p-2 border-2 border-gray-200 rounded-lg font-bold text-sm bg-white focus:border-[#0B1CDE] outline-none text-center">{['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (<option key={m} value={m}>{m}</option>))}</select></div></div></div><select value={isCustomCat?'OTHER':newEvent.category} onChange={(e)=>{if(e.target.value==='OTHER'){setIsCustomCat(true);setNewEvent({...newEvent,category:''})}else{setIsCustomCat(false);setNewEvent({...newEvent,category:e.target.value})}}} className="w-full p-2 border-2 rounded-lg font-bold text-sm bg-white">{Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}<option value="OTHER">Lainnya...</option></select>{isCustomCat && <input type="text" value={customCategory} onChange={e=>setCustomCategory(e.target.value)} className="w-full p-2 border-2 border-[#DFFF00] rounded-lg font-bold text-sm" placeholder="Kategori..."/>}</div></div>)}
                            {wizardStep === 2 && (<div className="space-y-4"><h3 className="font-black text-[#2B427A]">DETAIL & MEDIA</h3><textarea rows={4} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full p-2 border-2 rounded-lg font-medium text-sm" placeholder="Deskripsi (Bisa generate AI)" /><div className="flex gap-2"><button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs bg-blue-50 text-[#0B1CDE] px-3 py-1 rounded font-bold">{generatingDesc ? 'Generating...' : '✨ Generate AI'}</button></div><input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full p-2 border-2 rounded-lg font-bold text-sm" placeholder="Lokasi" /><div className="bg-gray-50 p-3 rounded border"><label className="text-xs font-bold block mb-2">Banner</label><input type="file" onChange={handleBannerChange} className="text-xs"/></div><div className="bg-gray-50 p-3 rounded border"><label className="text-xs font-bold block mb-2">Thumbnail (4:5)</label><input type="file" onChange={handleThumbnailChange} className="text-xs"/></div></div>)}
                            
                            {/* STEP 3: FORM BUILDER (RESTORED DETAILED VERSION) */}
                            {wizardStep === 3 && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-black text-[#2B427A] text-lg uppercase">Desain Formulir</h3>
                                            <p className="text-xs text-gray-500 font-bold">Sesuaikan data yang ingin dikumpulkan.</p>
                                        </div>
                                        <button onClick={addFormField} className="px-4 py-2 bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] rounded-lg font-black text-xs shadow-[2px_2px_0px_0px_#2B427A] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2">
                                            <PlusSquare className="w-4 h-4"/> TAMBAH FIELD
                                        </button>
                                    </div>

                                    {newEvent.formFields?.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                            <FormInput className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                                            <p className="text-gray-400 font-bold text-sm">Belum ada kolom formulir.</p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {newEvent.formFields?.map((f, i) => (
                                            <div key={f.id} className="bg-white border-2 border-[#2B427A]/10 p-5 rounded-xl relative group hover:border-[#2B427A] transition-colors shadow-sm">
                                                
                                                {/* Header Field */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-[#2B427A] rounded-lg text-white flex items-center justify-center font-black text-xs">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input 
                                                            value={f.label} 
                                                            onChange={(e) => updateFormField(i, { label: e.target.value })}
                                                            placeholder="Label Pertanyaan (Contoh: No. WhatsApp)"
                                                            className="w-full font-black text-[#2B427A] text-sm border-b-2 border-transparent hover:border-gray-200 focus:border-[#0B1CDE] outline-none transition-colors py-1 bg-transparent placeholder:font-medium placeholder:text-gray-400"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeFormField(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </div>

                                                {/* Grid Settings */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                    
                                                    {/* Tipe Input */}
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                                                            <TypeIcon className="w-3 h-3"/> Tipe Input
                                                        </label>
                                                        <div className="relative">
                                                            <select 
                                                                value={f.type} 
                                                                onChange={(e) => updateFormField(i, { type: e.target.value as FormFieldType })}
                                                                className="w-full appearance-none bg-white border border-gray-200 text-[#2B427A] text-xs font-bold rounded p-2 pr-8 outline-none focus:border-[#0B1CDE]"
                                                            >
                                                                <optgroup label="Teks">
                                                                    <option value="text">Teks Singkat (Short Text)</option>
                                                                    <option value="textarea">Paragraf (Long Text)</option>
                                                                    <option value="email">Email Address</option>
                                                                    <option value="number">Angka / Nomor (Number)</option>
                                                                </optgroup>
                                                                <optgroup label="Pilihan">
                                                                    <option value="select">Dropdown (Pilihan Ganda)</option>
                                                                    <option value="radio">Radio Button (Satu Pilihan)</option>
                                                                    <option value="checkbox">Checkbox (Banyak Pilihan)</option>
                                                                </optgroup>
                                                                <optgroup label="Lainnya">
                                                                    <option value="date">Tanggal (Date)</option>
                                                                    <option value="time">Waktu (Time)</option>
                                                                    <option value="file">Upload File</option>
                                                                </optgroup>
                                                            </select>
                                                            <div className="absolute right-2 top-2.5 pointer-events-none text-gray-400">
                                                                <ChevronDown className="w-3 h-3"/>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Placeholder */}
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                                                            <Bot className="w-3 h-3"/> Placeholder / Info
                                                        </label>
                                                        <input 
                                                            value={f.placeholder || ''} 
                                                            onChange={(e) => updateFormField(i, { placeholder: e.target.value })}
                                                            placeholder="Contoh isi..."
                                                            className="w-full bg-white border border-gray-200 text-[#2B427A] text-xs font-medium rounded p-2 outline-none focus:border-[#0B1CDE]"
                                                        />
                                                    </div>

                                                    {/* Options for Select / Radio / Checkbox */}
                                                    {(f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') && (
                                                        <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-100">
                                                            <label className="text-[10px] font-black uppercase text-[#0B1CDE] mb-1.5 flex items-center gap-1">
                                                                <List className="w-3 h-3"/> Opsi Pilihan (Pisahkan dengan koma)
                                                            </label>
                                                            <input 
                                                                value={f.options?.join(', ') || ''} 
                                                                onChange={(e) => updateFormField(i, { options: e.target.value.split(',').map(s => s.trim()) })}
                                                                placeholder="Contoh: Merah, Hijau, Biru"
                                                                className="w-full bg-white border border-blue-200 text-[#2B427A] text-xs font-bold rounded p-2 outline-none focus:border-[#0B1CDE]"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer Toggle */}
                                                <div className="flex items-center justify-between mt-3 px-1">
                                                    <label className="flex items-center gap-2 cursor-pointer group/toggle select-none">
                                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${f.required ? 'bg-[#0B1CDE]' : 'bg-gray-300'}`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${f.required ? 'left-4.5 translate-x-4' : 'left-0.5 translate-x-0'}`}></div>
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={f.required} 
                                                            onChange={(e) => updateFormField(i, { required: e.target.checked })}
                                                            className="hidden"
                                                        />
                                                        <span className={`text-xs font-bold ${f.required ? 'text-[#0B1CDE]' : 'text-gray-400'}`}>Wajib Diisi (Required)</span>
                                                    </label>
                                                    
                                                    {/* Visual Indicator for Type */}
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded">
                                                        {f.type === 'radio' && <CircleDot className="w-3 h-3"/>}
                                                        {f.type === 'checkbox' && <CheckSquare2 className="w-3 h-3"/>}
                                                        {f.type === 'date' && <CalendarDays className="w-3 h-3"/>}
                                                        {f.type === 'select' && <ListChecks className="w-3 h-3"/>}
                                                        <span>{f.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: PRICING (RESTORED DETAILED VERSION) */}
                            {wizardStep === 4 && (
                                <div className="space-y-6">
                                    <h3 className="font-black text-[#2B427A]">HARGA & TIKET</h3>
                                    
                                    {/* Ticket Type Toggle */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setNewEvent(prev => ({ ...prev, price: 0 }))}
                                            className={`cursor-pointer rounded-xl p-6 border-2 flex flex-col items-center justify-center gap-3 transition-all ${newEvent.price === 0 ? 'bg-[#DFFF00] border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]' : 'bg-white border-gray-200 text-gray-400 hover:border-[#2B427A]'}`}
                                        >
                                            <div className={`p-3 rounded-full ${newEvent.price === 0 ? 'bg-[#2B427A] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                <Tag className="w-6 h-6"/>
                                            </div>
                                            <span className="font-black text-sm uppercase">GRATIS</span>
                                        </div>

                                        <div 
                                            onClick={() => { if(newEvent.price === 0) setNewEvent(prev => ({ ...prev, price: 50000 })) }}
                                            className={`cursor-pointer rounded-xl p-6 border-2 flex flex-col items-center justify-center gap-3 transition-all ${newEvent.price > 0 ? 'bg-[#0B1CDE] border-[#2B427A] text-white shadow-[4px_4px_0px_0px_#2B427A]' : 'bg-white border-gray-200 text-gray-400 hover:border-[#0B1CDE]'}`}
                                        >
                                            <div className={`p-3 rounded-full ${newEvent.price > 0 ? 'bg-white text-[#0B1CDE]' : 'bg-gray-100 text-gray-400'}`}>
                                                <DollarSign className="w-6 h-6"/>
                                            </div>
                                            <span className="font-black text-sm uppercase">BERBAYAR</span>
                                        </div>
                                    </div>

                                    {/* Price Input (Only if Paid) */}
                                    {newEvent.price > 0 && (
                                        <div className="animate-fade-in bg-blue-50 p-6 rounded-xl border border-blue-100">
                                            <label className="text-xs font-bold text-[#0B1CDE] uppercase mb-2 block">Harga Tiket (Rupiah)</label>
                                            <div className="relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0B1CDE] rounded-l-lg flex items-center justify-center text-white font-black text-lg">Rp</div>
                                                <input 
                                                    type="number" 
                                                    value={newEvent.price} 
                                                    onChange={e=>setNewEvent({...newEvent, price:Number(e.target.value)})} 
                                                    className="w-full pl-16 pr-4 py-3 text-2xl font-black text-[#2B427A] rounded-lg border-2 border-[#0B1CDE] outline-none focus:shadow-[0px_0px_0px_4px_rgba(11,28,222,0.2)]"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold mt-2">Pastikan nominal benar. Contoh: 35000</p>
                                        </div>
                                    )}

                                    {/* Quota Input */}
                                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Kuota Peserta (Maksimal)</label>
                                        <div className="relative">
                                            <UsersIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                            <input 
                                                type="number" 
                                                value={newEvent.maxParticipants} 
                                                onChange={e=>setNewEvent({...newEvent, maxParticipants:Number(e.target.value)})} 
                                                className="w-full pl-12 pr-4 py-3 text-lg font-bold text-[#2B427A] rounded-lg border-2 border-gray-200 outline-none focus:border-[#2B427A]" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: CERTIFICATE EDITOR WITH AUTO-DETECT */}
                            {wizardStep === 5 && (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-black text-[#2B427A]">EDITOR SERTIFIKAT</h3>
                                            <p className="text-xs text-gray-500 font-bold">Desain tampilan sertifikat acara.</p>
                                        </div>
                                        
                                        {/* AUTO SEND TOGGLE */}
                                        <label className="flex items-center gap-2 cursor-pointer group select-none bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${newEvent.autoSendCertificate ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${newEvent.autoSendCertificate ? 'left-4.5 translate-x-4' : 'left-0.5 translate-x-0'}`}></div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={newEvent.autoSendCertificate || false} 
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, autoSendCertificate: e.target.checked }))}
                                                className="hidden"
                                            />
                                            <span className={`text-xs font-black ${newEvent.autoSendCertificate ? 'text-green-600' : 'text-gray-400'}`}>
                                                AUTO-KIRIM SAAT APPROVED
                                            </span>
                                        </label>
                                    </div>
                                    
                                    {/* Responsive Designer Component */}
                                    <div className="flex-1">
                                        {renderDesigner()}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-between">
                            {wizardStep > 1 ? <button onClick={()=>setWizardStep(s=>s-1)} className="px-4 py-2 font-bold text-gray-600">KEMBALI</button> : <div/>}
                            {wizardStep < 5 ? <button onClick={()=>setWizardStep(s=>s+1)} className="px-6 py-2 bg-[#2B427A] text-white rounded font-bold">LANJUT</button> : <button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-6 py-2 bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] rounded font-black">{isSubmittingEvent ? 'MENYIMPAN...' : 'SIMPAN'}</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* SETTINGS VIEW (UPDATED LAYOUT) */}
            {activeTab === 'settings' && (
               <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-140px)] bg-white rounded-xl border-2 border-[#2B427A] shadow-md overflow-hidden">
                   <div className="w-full md:w-64 bg-white border-r-2 border-gray-200 flex flex-col pt-4">
                       <div className="px-6 pb-4 border-b border-gray-200"><h3 className="font-black text-[#2B427A] uppercase text-lg">Menu</h3></div>
                       <nav className="flex-row md:flex-col flex overflow-x-auto md:overflow-visible p-2 md:p-4 gap-2">
                           <button onClick={() => setSettingsTab('payment')} className={`w-full text-left px-4 py-3 rounded-lg font-black text-xs uppercase transition-all ${settingsTab === 'payment' ? 'bg-[#2B427A] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Pembayaran</button>
                           <button onClick={() => setSettingsTab('certificate')} className={`w-full text-left px-4 py-3 rounded-lg font-black text-xs uppercase transition-all ${settingsTab === 'certificate' ? 'bg-[#2B427A] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Sertifikat</button>
                       </nav>
                   </div>
                   <div className="flex-1 overflow-y-auto p-8 bg-white">
                       {settingsTab === 'payment' && (
                          <div className="space-y-8 animate-fade-in">
                             <div className="flex justify-between items-center border-b pb-4">
                                 <h3 className="font-black text-[#2B427A] text-xl uppercase">REKENING & QRIS</h3>
                                 <button onClick={handleSavePaymentSettings} disabled={savingPayment} className="px-6 py-2 bg-[#0B1CDE] text-white rounded-lg font-black text-xs border border-blue-700 shadow-sm hover:bg-blue-800 transition-colors uppercase">
                                     {savingPayment ? 'Menyimpan...' : 'SIMPAN'}
                                 </button>
                             </div>
                             <div className="grid md:grid-cols-2 gap-12">
                                {/* Left Column: Bank Accounts */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-500 mb-4 uppercase tracking-wide">DAFTAR BANK</h4>
                                    
                                    {/* Existing Accounts */}
                                    <div className="space-y-3 mb-6">
                                        {paymentSettings.bankAccounts.map((acc, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center group">
                                                <div>
                                                    <div className="font-black text-[#2B427A] text-sm uppercase">{acc.bankName}</div>
                                                    <div className="text-xs font-mono text-gray-600 my-1">{acc.accountNumber}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{acc.accountHolder}</div>
                                                </div>
                                                <button onClick={()=>{const u=paymentSettings.bankAccounts.filter((_,i)=>i!==idx);setPaymentSettings({...paymentSettings,bankAccounts:u})}} className="text-red-400 hover:text-red-600 bg-white p-2 rounded border border-gray-200 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ))}
                                        {paymentSettings.bankAccounts.length === 0 && <p className="text-gray-400 text-xs italic">Belum ada rekening bank.</p>}
                                    </div>

                                    {/* Add New Form */}
                                    <div className="bg-[#F0F9FF] p-5 rounded-xl border border-blue-200">
                                        <div className="space-y-3">
                                            <input placeholder="Bank (Contoh: BCA)" value={tempAccount.bankName} onChange={e=>setTempAccount({...tempAccount,bankName:e.target.value})} className="w-full p-2 text-xs border border-gray-300 rounded font-bold outline-none focus:border-[#0B1CDE]" />
                                            <input placeholder="No. Rekening" value={tempAccount.accountNumber} onChange={e=>setTempAccount({...tempAccount,accountNumber:e.target.value})} className="w-full p-2 text-xs border border-gray-300 rounded font-bold outline-none focus:border-[#0B1CDE]" />
                                            <input placeholder="Atas Nama" value={tempAccount.accountHolder} onChange={e=>setTempAccount({...tempAccount,accountHolder:e.target.value})} className="w-full p-2 text-xs border border-gray-300 rounded font-bold outline-none focus:border-[#0B1CDE]" />
                                            <button onClick={()=>{if(tempAccount.bankName){setPaymentSettings({...paymentSettings,bankAccounts:[...paymentSettings.bankAccounts,{...tempAccount,id:Date.now().toString()}]});setTempAccount({id:'',bankName:'',accountNumber:'',accountHolder:''})}}} className="w-full bg-[#2B427A] text-white py-2 rounded-lg text-xs font-black uppercase hover:bg-[#1a2c55] transition-colors">
                                                TAMBAH
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: QRIS */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-500 mb-4 uppercase tracking-wide">UPLOAD QRIS</h4>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                                        <input type="file" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setQrisFile(file);
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setQrisPreview(ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        
                                        {qrisPreview ? (
                                            <div className="flex flex-col items-center">
                                                <img src={qrisPreview} className="h-48 object-contain mb-4 rounded border shadow-sm"/>
                                                <span className="text-xs font-bold text-[#0B1CDE] bg-blue-50 px-3 py-1 rounded-full">Ganti Gambar</span>
                                            </div>
                                        ) : (
                                            <div className="py-10 flex flex-col items-center justify-center text-gray-400">
                                                <QrCode className="w-12 h-12 mb-2 opacity-50"/>
                                                <span className="text-xs font-bold">Klik untuk upload QRIS</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold">*Format: JPG/PNG. Max 2MB.</p>
                                </div>
                             </div>
                          </div>
                       )}
                       {settingsTab === 'certificate' && (
                           <div className="text-center py-20 animate-fade-in">
                               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                   <Award className="w-10 h-10 text-gray-400" />
                               </div>
                               <h3 className="text-lg font-black text-[#2B427A] uppercase mb-2">Template Global</h3>
                               <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">Gunakan editor sertifikat di menu "Buat Acara" untuk pengaturan sertifikat per event yang lebih spesifik.</p>
                               <button onClick={() => { setActiveTab('event-editor'); resetWizard(); setWizardStep(5); }} className="px-6 py-2 bg-[#2B427A] text-white rounded-lg font-black text-xs uppercase shadow hover:bg-[#1a2c55]">
                                   Buka Editor Sertifikat
                               </button>
                           </div>
                       )}
                   </div>
               </div>
            )}

            {/* UPDATED SCAN HISTORY VIEW */}
            {activeTab === 'scan-history' && renderScanHistory()}

            {activeTab === 'events' && renderEventsList()}
            {activeTab === 'registrations' && renderRegistrations()}
            {activeTab === 'overview' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                     <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between"><div><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Acara</h3><p className="text-3xl font-black text-[#2B427A]">{events.length}</p></div><div className="p-2 bg-blue-50 rounded-lg text-[#2B427A]"><CalendarIcon className="w-6 h-6"/></div></div>
                     <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between"><div><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Pendaftar</h3><p className="text-3xl font-black text-[#0B1CDE]">{registrations.length}</p></div><div className="p-2 bg-blue-50 rounded-lg text-[#0B1CDE]"><UsersIcon className="w-6 h-6"/></div></div>
                     <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between"><div><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total User</h3><p className="text-3xl font-black text-[#DFFF00] drop-shadow-sm text-outline">{uniqueUserCount}</p></div><div className="p-2 bg-blue-50 rounded-lg text-[#2B427A]"><UserCheck className="w-6 h-6"/></div></div>
                 </div>
            )}
        </div>
      </main>
      <style>{`@keyframes slide-up {0% { transform: translate(-50%, 100%); opacity: 0; }100% { transform: translate(-50%, 0); opacity: 1; }}.animate-slide-up {animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;} .text-outline { -webkit-text-stroke: 1px #2B427A; text-shadow: 2px 2px 0px #2B427A; }`}</style>
    </div>
  );
};

export default AdminDashboard;
