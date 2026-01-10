
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon, Trash2, Power, Eye, CreditCard, ChevronRight, ChevronLeft, PlusCircle, MinusCircle, Upload, Filter, Trash, Edit2, Pencil, Save, PlusSquare, Move, Type, MapPin, Tag, AlignLeft, AlignCenter, AlignRight, DollarSign, Hash, MousePointer2, FileText, Image as ImgIcon, FileSpreadsheet, Scaling, X, Send, QrCode, ScanLine, Download, ChevronDown, ChevronUp, LayoutList, FormInput, Palette, FileCheck, Info, Bot, ExternalLink, Paperclip, Database, Type as TypeIcon, ImagePlus, Bold, AlignJustify, UserCheck, CheckSquare, ListChecks, TrendingUp, Activity, DollarSign as DollarIcon, ArrowUpFromLine, ArrowDownFromLine } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession, createSlug, deleteEvent, toggleEventStatus, savePaymentSettings, fetchPaymentSettings, updateEvent, fetchCertificateSettings, saveCertificateSettings, sendBulkCertificates, fetchParticipantsCsv } from '../services/api';
import { generateEventDescription, analyzePaymentProof, PaymentAnalysisResult } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus, FormField, FormFieldType, PaymentSettings, BankAccount, CertificateConfig, CertificateElement } from '../types';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';

// Constants for Certificate Canvas (A4 Landscape aspect ratio)
const CANVAS_WIDTH = 842;
const CANVAS_HEIGHT = 595;

// Chart Colors
const COLORS = ['#0B1CDE', '#DFFF00', '#EF4444', '#2B427A'];

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
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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
    mapUrl: ''
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

  // Helper to fix Drive URLs
  const formatDriveUrl = (url: string) => {
      if (!url) return '';
      // If it's already a direct link or not a google drive link, return as is
      if (url.includes('lh3.googleusercontent.com') || !url.includes('google.com')) return url;
      
      // Extract ID
      let id = '';
      // Pattern 1: /file/d/ID/view
      const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match1) id = match1[1];
      
      // Pattern 2: id=ID
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

  // AUTO AI TRIGGER
  useEffect(() => {
    if (viewingProof && viewingProof.proofUrl && !aiResult && !isAnalyzing) {
        handleAiAnalysis();
    }
  }, [viewingProof]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
          fetchEvents(), 
          fetchRegistrations(), 
          fetchPaymentSettings(),
          fetchCertificateSettings()
      ]);

      const evts = results[0].status === 'fulfilled' ? results[0].value : [];
      const regs = results[1].status === 'fulfilled' ? results[1].value : [];
      const payment = results[2].status === 'fulfilled' ? results[2].value : { bankAccounts: [], qrisUrl: '' };
      const certs = results[3].status === 'fulfilled' ? results[3].value : { backgroundUrl: '', elements: [] };

      setEvents(evts || []);
      setRegistrations(regs || []);
      setPaymentSettings(payment || { bankAccounts: [], qrisUrl: '' });
      
      // Calculate Unique Users (based on unique emails in registrations as proxy)
      const uniqueEmails = new Set(regs?.map(r => r.userEmail.toLowerCase()) || []);
      setUniqueUserCount(uniqueEmails.size);

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

  // ... (AI and update handlers unchanged) ...
  const handleAiAnalysis = async () => {
      if (!viewingProof || !viewingProof.proofUrl) return;
      
      const event = events.find(e => e.id === viewingProof.eventId);
      const expectedAmount = event ? event.price : 0;

      setIsAnalyzing(true);
      setAiResult(null);

      try {
          const directUrl = formatDriveUrl(viewingProof.proofUrl);
          
          // Convert Image URL to Base64 (Using fetch)
          // Note: This relies on the image URL allowing CORS or being accessible
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
          setAiResult({ isValid: false, reason: "Gagal mengambil gambar (CORS/Network). Cek manual.", confidence: 'LOW' });
      }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
      try {
          await updateRegistrationStatus(id, status);
          setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
          if (viewingProof?.id === id) {
               setViewingProof(null); // Close modal
          }
          setToast({ show: true, msg: `Status diperbarui menjadi ${status}` });
          setTimeout(() => setToast({show: false, msg: ''}), 3000);
      } catch (error: any) {
          showAlert('error', 'Gagal', error.message);
      }
  };

  // ... (Export handler unchanged) ...
  const handleExportData = async () => {
      setExportLoading(true);
      try {
          const csvString = await fetchParticipantsCsv(selectedEventFilter);
          const blob = new Blob([csvString], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `participants_export_${new Date().toISOString()}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          setShowExportModal(false);
      } catch (e: any) {
          showAlert('error', 'Gagal', 'Gagal mengunduh CSV.');
      } finally {
          setExportLoading(false);
      }
  };

  const handleExportAttendance = () => {
      if (selectedEventFilter === 'ALL') {
          showAlert('error', 'Pilih Acara', 'Silakan filter berdasarkan acara terlebih dahulu untuk mendownload laporan kehadiran.');
          return;
      }

      // Filter Logic for Client-Side CSV
      const checkedInUsers = registrations.filter(r => 
          r.eventId === selectedEventFilter && r.checkInStatus === 'CHECKED_IN'
      );

      if (checkedInUsers.length === 0) {
          showAlert('info', 'Data Kosong', 'Belum ada peserta yang check-in untuk acara ini.');
          return;
      }

      const eventTitle = events.find(e => e.id === selectedEventFilter)?.title || "Event";
      
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

  // NEW: Handle Bulk Send Certificates
  const handleBulkSendCertificates = () => {
      if (selectedEventFilter === 'ALL') {
          showAlert('error', 'Pilih Acara', 'Silakan pilih spesifik acara terlebih dahulu di menu filter.');
          return;
      }

      // Get approved registrations for this event
      const eligibleRegistrations = registrations.filter(r => 
          r.eventId === selectedEventFilter && r.status === RegistrationStatus.APPROVED
      );

      if (eligibleRegistrations.length === 0) {
          showAlert('info', 'Tidak Ada Peserta', 'Tidak ada peserta dengan status APPROVED untuk acara ini.');
          return;
      }

      showConfirm(
          'Kirim Semua Sertifikat?',
          `Akan mengirim ${eligibleRegistrations.length} email sertifikat untuk acara ini. Pastikan acara sudah selesai. Lanjutkan?`,
          async () => {
              setIsBulkSending(true);
              try {
                  const ids = eligibleRegistrations.map(r => r.id);
                  const result = await sendBulkCertificates(ids);
                  showAlert('success', 'Selesai', `Berhasil terkirim: ${result.sent}. Gagal: ${result.failed}`);
              } catch (e: any) {
                  showAlert('error', 'Gagal', e.message || 'Terjadi kesalahan saat pengiriman massal.');
              } finally {
                  setIsBulkSending(false);
              }
          },
          'KIRIM SEKARANG'
      );
  };

  // ... (Settings handlers, Wizard handlers unchanged) ...
  const handleSaveCertSettings = async () => {
      setSavingCertSettings(true);
      try {
           let bgBase64 = undefined;
          if (certTemplateFile) {
              bgBase64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                 reader.readAsDataURL(certTemplateFile);
             });
          }
          await saveCertificateSettings(certSettings, bgBase64);
          showAlert('success', 'Tersimpan', 'Template sertifikat default disimpan.');
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setSavingCertSettings(false);
      }
  };

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
          await savePaymentSettings(paymentSettings, qrisBase64);
          showAlert('success', 'Tersimpan', 'Pengaturan pembayaran berhasil disimpan.');
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setSavingPayment(false);
      }
  };

  const resetWizard = () => {
    setNewEvent({
      category: EventCategory.SEMINAR,
      price: 0,
      maxParticipants: 100,
      formFields: [],
      time: '09:00',
      certificateConfig: { backgroundUrl: '', elements: [] },
      enableTicketScanner: false,
      mapUrl: ''
    });
    setBannerFile(null);
    setBannerPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setCertBgFile(null);
    setCertBgPreview(null);
    setIsCustomCat(false);
    setCustomCategory('');
    setWizardStep(1);
    setEditingId(null);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setBannerPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateDescription = async () => {
    if (!newEvent.title || !newEvent.category) {
        showAlert('error', 'Error', 'Mohon isi Judul dan Kategori terlebih dahulu.');
        return;
    }
    setGeneratingDesc(true);
    try {
        const desc = await generateEventDescription(
            newEvent.title, 
            isCustomCat ? customCategory : newEvent.category || '', 
            `Lokasi: ${newEvent.location || '-'}, Waktu: ${newEvent.time || '-'}`
        );
        setNewEvent(prev => ({ ...prev, description: desc }));
    } catch (e: any) {
        showAlert('error', 'AI Error', e.message);
    } finally {
        setGeneratingDesc(false);
    }
  };

  const addFormField = () => {
    setNewEvent(prev => ({
        ...prev,
        formFields: [...(prev.formFields || []), { id: Date.now().toString(), label: '', type: 'text', required: true, options: [] }]
    }));
  };

  const updateFormField = (index: number, updates: Partial<FormField>) => {
    const fields = [...(newEvent.formFields || [])];
    fields[index] = { ...fields[index], ...updates };
    setNewEvent(prev => ({ ...prev, formFields: fields }));
  };

  const removeFormField = (index: number) => {
    const fields = [...(newEvent.formFields || [])];
    fields.splice(index, 1);
    setNewEvent(prev => ({ ...prev, formFields: fields }));
  };

  const handleCreateOrUpdateEvent = async () => {
      setIsSubmittingEvent(true);
      try {
          // Prepare Base64s
          let bannerBase64 = undefined;
          if (bannerFile) {
             bannerBase64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                 reader.readAsDataURL(bannerFile);
             });
          }

          let thumbnailBase64 = undefined;
          if (thumbnailFile) {
             thumbnailBase64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                 reader.readAsDataURL(thumbnailFile);
             });
          }

          let certBgBase64 = undefined;
          if (certBgFile) {
              certBgBase64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                 reader.readAsDataURL(certBgFile);
             });
          }

          const eventPayload = {
              ...newEvent,
              category: isCustomCat ? customCategory : newEvent.category
          };

          if (editingId) {
              await updateEvent({ ...eventPayload, id: editingId }, bannerBase64, certBgBase64, thumbnailBase64);
              showAlert('success', 'Berhasil', 'Acara berhasil diperbarui.');
          } else {
              await createEvent(eventPayload, bannerBase64 || '', certBgBase64, thumbnailBase64);
              showAlert('success', 'Berhasil', 'Acara berhasil dibuat.');
          }
          // Switch back to list view
          setActiveTab('events');
          loadData();
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setIsSubmittingEvent(false);
      }
  };

  // ... (renderDesigner implementation identical to original) ...
  const renderDesigner = (isEventSpecific: boolean) => {
      const currentConfig = isEventSpecific ? newEvent.certificateConfig : certSettings;
      const elements = currentConfig?.elements || [];
      const bgUrl = isEventSpecific ? (certBgPreview || currentConfig?.backgroundUrl) : (certSettingsBgPreview || currentConfig?.backgroundUrl);

      const updateConfig = (newElements: CertificateElement[]) => {
          if (isEventSpecific) {
              setNewEvent(prev => ({ ...prev, certificateConfig: { ...prev.certificateConfig!, elements: newElements } }));
          } else {
              setCertSettings(prev => ({ ...prev, elements: newElements }));
          }
      };

      const handleAddElement = (type: 'text'|'dynamic'|'image') => {
          const newEl: CertificateElement = {
              id: Date.now().toString(),
              type,
              field: type === 'dynamic' ? 'userName' : (type === 'text' ? 'Teks Baru' : 'https://via.placeholder.com/150'),
              label: 'Element Baru',
              x: 421, // Center of A4 width (842)
              y: 297, // Center of A4 height (595)
              fontSize: 24,
              fontFamily: 'Helvetica',
              align: 'center',
              width: type === 'image' ? 150 : undefined,
              color: '#000000',
              fontWeight: 'bold'
          };
          updateConfig([...elements, newEl]);
          setActiveElementId(newEl.id);
      };

      const handleMouseDown = (e: React.MouseEvent, id: string) => {
         setActiveElementId(id);
         setDragStart({ x: e.clientX, y: e.clientY });
         const el = elements.find(el => el.id === id);
         if (el) setInitialPos({ x: el.x, y: el.y });
      };

      const handleMouseMove = (e: React.MouseEvent) => {
          if (dragStart && activeElementId && initialPos) {
              const dx = e.clientX - dragStart.x;
              const dy = e.clientY - dragStart.y;
              const updated = elements.map(el => el.id === activeElementId ? { ...el, x: initialPos.x + dx, y: initialPos.y + dy } : el);
              updateConfig(updated);
          }
      };

      const handleMouseUp = () => {
          setDragStart(null);
          setInitialPos(null);
      };

      const activeElement = elements.find(el => el.id === activeElementId);

      return (
          <div className="flex flex-col lg:flex-row h-full bg-white rounded-xl overflow-hidden border border-gray-200">
              {/* LEFT SIDEBAR: TOOLS + PROPERTIES */}
              <div className="w-full lg:w-80 bg-gray-50 border-r border-gray-200 flex flex-col z-30 shadow-xl h-full">
                  
                  {/* TOP SCROLLABLE: TOOLS */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      {/* Add Elements Group */}
                      <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">TAMBAH ELEMEN</h4>
                          <div className="space-y-2">
                              <button onClick={() => handleAddElement('dynamic')} className="w-full p-3 bg-white border border-gray-200 text-[#2B427A] rounded-xl text-sm font-bold flex items-center gap-3 hover:border-[#0B1CDE] hover:text-[#0B1CDE] hover:shadow-md transition-all group">
                                  <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-[#0B1CDE] group-hover:text-white transition-colors"><Database className="w-4 h-4"/></div>
                                  Data Dinamis
                              </button>
                              <button onClick={() => handleAddElement('text')} className="w-full p-3 bg-white border border-gray-200 text-[#2B427A] rounded-xl text-sm font-bold flex items-center gap-3 hover:border-[#0B1CDE] hover:text-[#0B1CDE] hover:shadow-md transition-all group">
                                  <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-[#0B1CDE] group-hover:text-white transition-colors"><TypeIcon className="w-4 h-4"/></div>
                                  Teks Statis
                              </button>
                              <button onClick={() => handleAddElement('image')} className="w-full p-3 bg-white border border-gray-200 text-[#2B427A] rounded-xl text-sm font-bold flex items-center gap-3 hover:border-[#0B1CDE] hover:text-[#0B1CDE] hover:shadow-md transition-all group">
                                  <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-[#0B1CDE] group-hover:text-white transition-colors"><ImagePlus className="w-4 h-4"/></div>
                                  Gambar/Logo
                              </button>
                          </div>
                      </div>

                      {/* Background Group */}
                      <div className="pt-4 border-t border-gray-200">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">BACKGROUND</h4>
                          <label className="w-full cursor-pointer group">
                               <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-white flex flex-col items-center justify-center gap-2 group-hover:border-[#0B1CDE] group-hover:bg-blue-50 transition-all overflow-hidden relative">
                                   {bgUrl ? (
                                       <>
                                         <img src={bgUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40" />
                                         <div className="relative z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-bold text-[#0B1CDE] backdrop-blur-sm">Ganti Gambar</div>
                                       </>
                                   ) : (
                                       <>
                                         <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#0B1CDE]" />
                                         <span className="text-xs font-bold text-gray-400 group-hover:text-[#0B1CDE]">Upload Template</span>
                                       </>
                                   )}
                               </div>
                               <input type="file" className="hidden" onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if(file) {
                                       if (isEventSpecific) {
                                           setCertBgFile(file);
                                           const reader = new FileReader();
                                           reader.onload = (ev) => setCertBgPreview(ev.target?.result as string);
                                           reader.readAsDataURL(file);
                                       } else {
                                           setCertTemplateFile(file);
                                           const reader = new FileReader();
                                           reader.onload = (ev) => setCertSettingsBgPreview(ev.target?.result as string);
                                           reader.readAsDataURL(file);
                                       }
                                   }
                               }} accept="image/*" />
                          </label>
                          <p className="text-[10px] text-gray-400 mt-2 font-medium">Format: JPG/PNG, Orientasi Landscape (A4)</p>
                      </div>
                  </div>

                  {/* BOTTOM AREA: PROPERTIES PANEL (Sticky at bottom of sidebar) */}
                  <div className="bg-white border-t-2 border-gray-200 p-5 flex-shrink-0 max-h-[50%] overflow-y-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] custom-scrollbar">
                      {/* ... Properties content same as before ... */}
                      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                        <h4 className="text-xs font-black text-[#2B427A] uppercase tracking-wider flex items-center gap-2">
                            <SettingsIcon className="w-3 h-3"/> PROPERTI ITEM
                        </h4>
                        {activeElement && (
                           <button onClick={() => {
                                updateConfig(elements.filter(el => el.id !== activeElementId));
                                setActiveElementId(null);
                            }} className="text-red-500 text-[10px] font-bold hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-100 hover:bg-red-100 transition-colors">
                                <Trash2 className="w-3 h-3"/> HAPUS
                            </button>
                        )}
                      </div>
                      
                      {activeElement ? (
                          <div className="space-y-4 animate-fade-in">
                              {/* 1. CONTENT (Full Width) */}
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Konten / Isi</label>
                                  {activeElement.type === 'dynamic' ? (
                                      <div className="relative">
                                          <Database className="w-4 h-4 absolute left-3 top-3 text-gray-400"/>
                                          <select value={activeElement.field} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, field: e.target.value } : el))} className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] bg-gray-50 focus:bg-white text-gray-700">
                                              <option value="userName">Nama Peserta</option>
                                              <option value="eventTitle">Judul Acara</option>
                                              <option value="date">Tanggal Acara</option>
                                              <option value="certificateNumber">Nomor Sertifikat</option>
                                          </select>
                                      </div>
                                  ) : activeElement.type === 'image' ? (
                                      <div className="relative">
                                          <input type="text" value={activeElement.field} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, field: e.target.value } : el))} className="w-full p-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] bg-gray-50 focus:bg-white text-gray-700" placeholder="URL Gambar..." />
                                      </div>
                                  ) : (
                                      <div className="relative">
                                          <TypeIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400"/>
                                          <input type="text" value={activeElement.field} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, field: e.target.value } : el))} className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] bg-gray-50 focus:bg-white text-gray-700" />
                                      </div>
                                  )}
                              </div>

                              {/* 2. STYLE PROPS (Grid 2 cols) */}
                              <div className="grid grid-cols-2 gap-3">
                                  {activeElement.type !== 'image' && (
                                    <>
                                      <div>
                                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Size (px)</label>
                                          <input type="number" value={activeElement.fontSize || 12} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, fontSize: Number(e.target.value) } : el))} className="w-full p-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] text-gray-700" />
                                      </div>
                                      
                                      <div>
                                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Warna</label>
                                          <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg p-1 focus-within:border-[#0B1CDE] bg-white h-[38px]">
                                               <input type="color" value={activeElement.color || '#000000'} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, color: e.target.value } : el))} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                                               <span className="text-[10px] font-mono font-bold text-gray-500 uppercase truncate">{activeElement.color}</span>
                                          </div>
                                      </div>

                                      <div className="col-span-2">
                                           <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ketebalan</label>
                                           <div className="relative">
                                               <Bold className="w-3 h-3 absolute left-3 top-3 text-gray-400"/>
                                               <select value={activeElement.fontWeight || 'bold'} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, fontWeight: e.target.value as any } : el))} className="w-full pl-8 pr-2 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] text-gray-700">
                                                   <option value="normal">Normal</option>
                                                   <option value="bold">Bold</option>
                                               </select>
                                           </div>
                                      </div>
                                    </>
                                  )}

                                  <div className="col-span-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Posisi (Align Horizontal)</label>
                                      <div className="relative">
                                          <AlignJustify className="w-3 h-3 absolute left-3 top-3 text-gray-400"/>
                                          <select value={activeElement.align || 'center'} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, align: e.target.value as any } : el))} className="w-full pl-8 pr-2 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] text-gray-700">
                                              <option value="left">Kiri</option>
                                              <option value="center">Tengah</option>
                                              <option value="right">Kanan</option>
                                          </select>
                                      </div>
                                  </div>

                                  <div className="col-span-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Posisi (Align Vertical)</label>
                                      <div className="relative">
                                          <ArrowUpFromLine className="w-3 h-3 absolute left-3 top-3 text-gray-400"/>
                                          <select value={activeElement.verticalAlign || 'middle'} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, verticalAlign: e.target.value as any } : el))} className="w-full pl-8 pr-2 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] text-gray-700">
                                              <option value="top">Atas (Top)</option>
                                              <option value="middle">Tengah (Middle)</option>
                                              <option value="bottom">Bawah (Bottom)</option>
                                          </select>
                                      </div>
                                  </div>

                                  {activeElement.type === 'image' && (
                                      <div className="col-span-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Lebar (px)</label>
                                          <input type="number" value={activeElement.width || 100} onChange={e => updateConfig(elements.map(el => el.id === activeElement.id ? { ...el, width: Number(e.target.value) } : el))} className="w-full p-2 border-2 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#0B1CDE] text-gray-700" />
                                      </div>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="py-6 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                              <MousePointer2 className="w-6 h-6 mb-2 opacity-30 mx-auto" />
                              <p className="text-[10px] font-bold">Pilih elemen di canvas</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* RIGHT: CANVAS */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#F0F2F5] relative">
                  <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative shadow-inner" 
                      onMouseMove={handleMouseMove} 
                      onMouseUp={handleMouseUp} 
                      onMouseLeave={handleMouseUp}
                  >
                      {/* The Paper Canvas */}
                      <div className="relative bg-white shadow-2xl transition-shadow" style={{ width: 842, height: 595, flexShrink: 0 }}>
                          {bgUrl ? (
                              <img src={bgUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                          ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold text-4xl uppercase select-none border-2 border-dashed border-gray-300 m-4">Area Sertifikat</div>
                          )}
                          
                          {elements.map(el => {
                              // Determine Transform based on Horizontal and Vertical Alignment
                              let translateX = '-50%';
                              if (el.align === 'left') translateX = '0';
                              if (el.align === 'right') translateX = '-100%';

                              let translateY = '-50%';
                              if (el.verticalAlign === 'top') translateY = '0';
                              if (el.verticalAlign === 'bottom') translateY = '-100%';

                              const transform = `translate(${translateX}, ${translateY})`;

                              return (
                                <div 
                                    key={el.id} 
                                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                                    className={`absolute cursor-move select-none group ${activeElementId === el.id ? 'z-50' : 'z-10'}`}
                                    style={{ 
                                        left: el.x, top: el.y, 
                                        transform: transform,
                                        width: el.width || 'auto'
                                    }}
                                >
                                    {/* Selection Box Visual */}
                                    <div className={`absolute -inset-2 border-2 rounded ${activeElementId === el.id ? 'border-[#0B1CDE] bg-[#0B1CDE]/5' : 'border-transparent group-hover:border-gray-300'}`}></div>
                                    
                                    {/* Content Render */}
                                    <div style={{
                                        fontSize: el.fontSize, 
                                        fontFamily: el.fontFamily, 
                                        color: el.color, 
                                        fontWeight: el.fontWeight,
                                        textAlign: el.align,
                                        position: 'relative' // to sit above selection box
                                    }}>
                                        {el.type === 'image' ? <img src={el.field} style={{width: '100%', height: 'auto', pointerEvents: 'none'}} /> : (el.type === 'dynamic' ? `{${el.field}}` : el.field)}
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderScanHistory = () => {
      // 1. Filter registrations that are CHECKED_IN
      let checkedInRegs = registrations.filter(r => r.checkInStatus === 'CHECKED_IN');
      
      // 2. Filter by specific Event if selected
      if (selectedEventFilter !== 'ALL') {
          checkedInRegs = checkedInRegs.filter(r => r.eventId === selectedEventFilter);
      }

      // 3. Sort by check-in time (Newest first)
      checkedInRegs.sort((a, b) => {
          const tA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          const tB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          return tB - tA;
      });

      // Stats for the header
      const totalForFilter = selectedEventFilter === 'ALL' 
          ? registrations.filter(r => r.status === 'APPROVED').length 
          : registrations.filter(r => r.eventId === selectedEventFilter && r.status === 'APPROVED').length;
      
      const attendanceRate = totalForFilter > 0 ? Math.round((checkedInRegs.length / totalForFilter) * 100) : 0;

      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-[#2B427A] text-2xl uppercase">Riwayat Scan Kehadiran</h3>
                  <button onClick={handleExportAttendance} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4"/> DOWNLOAD LAPORAN (CSV)
                  </button>
              </div>

              {/* Event Filter */}
              <div className="bg-white p-4 rounded-xl border-2 border-[#2B427A] mb-6">
                   <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filter Acara:</label>
                   <select value={selectedEventFilter} onChange={e => setSelectedEventFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold outline-none">
                       <option value="ALL">Semua Acara</option>
                       {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                   </select>
               </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Hadir (Checked-In)</p>
                          <p className="text-3xl font-black text-[#0B1CDE]">{checkedInRegs.length}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg"><UserCheck className="w-6 h-6 text-[#0B1CDE]"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Total Peserta (Valid)</p>
                          <p className="text-3xl font-black text-[#2B427A]">{totalForFilter}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg"><UsersIcon className="w-6 h-6 text-[#2B427A]"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Tingkat Kehadiran</p>
                          <p className="text-3xl font-black text-[#DFFF00] text-outline">{attendanceRate}%</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg"><CheckSquare className="w-6 h-6 text-[#DFFF00] stroke-black"/></div>
                  </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden">
                   <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="bg-[#2B427A] text-white">
                                   <th className="p-4 font-black uppercase text-sm">Waktu Check-In</th>
                                   <th className="p-4 font-black uppercase text-sm">Peserta</th>
                                   <th className="p-4 font-black uppercase text-sm">Acara</th>
                                   <th className="p-4 font-black uppercase text-sm">Ticket ID</th>
                               </tr>
                           </thead>
                           <tbody>
                               {checkedInRegs.map(reg => (
                                   <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                                       <td className="p-4">
                                           <div className="flex items-center gap-2 font-bold text-[#0B1CDE]">
                                               <Clock className="w-4 h-4"/>
                                               {reg.checkInTime ? new Date(reg.checkInTime).toLocaleString('id-ID') : '-'}
                                           </div>
                                       </td>
                                       <td className="p-4">
                                           <div className="font-bold text-[#2B427A]">{reg.userName}</div>
                                           <div className="text-xs text-gray-500">{reg.userEmail}</div>
                                       </td>
                                       <td className="p-4 text-sm font-medium text-gray-600">{reg.eventTitle}</td>
                                       <td className="p-4 font-mono text-xs text-gray-400">{reg.id}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   {checkedInRegs.length === 0 && <div className="p-12 text-center text-gray-400 font-bold border-t border-gray-100">Belum ada data check-in untuk filter ini.</div>}
               </div>
          </div>
      );
  };

  const renderEventsList = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[#2B427A] text-2xl uppercase">Daftar Acara</h3>
              <button onClick={() => { resetWizard(); setActiveTab('event-editor'); }} className="px-6 py-2 bg-[#DFFF00] text-[#2B427A] rounded-lg font-black border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                  <Plus className="w-5 h-5"/> BUAT ACARA BARU
              </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
                <div key={event.id} className="bg-white rounded-2xl border-2 border-[#2B427A] overflow-hidden flex flex-col shadow-[6px_6px_0px_0px_#2B427A] hover:translate-y-[-2px] transition-transform">
                    {/* Top Image Section */}
                    <div className="h-48 relative bg-gray-200">
                        {event.bannerUrl ? (
                            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 font-bold">NO IMAGE</div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 bg-[#DFFF00] text-[#2B427A] font-black px-3 py-1 text-xs uppercase border border-[#2B427A] rounded shadow-sm">
                            {event.category}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex-1">
                        <h4 className="text-2xl font-black text-[#2B427A] uppercase mb-3 leading-tight line-clamp-2">{event.title}</h4>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 font-bold mb-2">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-[#0B1CDE]" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-[#0B1CDE]" />
                                <span>{event.currentParticipants}/{event.maxParticipants}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase mt-2">
                            <span className={`w-2 h-2 rounded-full ${event.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {event.isOpen ? 'PENDAFTARAN DIBUKA' : 'DITUTUP'}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 bg-gray-50 border-t-2 border-dashed border-[#2B427A]/20 flex gap-2">
                        <button 
                            onClick={() => {
                                resetWizard();
                                setEditingId(event.id);
                                setNewEvent(event);
                                setBannerPreview(event.bannerUrl);
                                setThumbnailPreview(event.thumbnailUrl);
                                setCertBgPreview(event.certificateConfig?.backgroundUrl || null);
                                setActiveTab('event-editor');
                            }} 
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-[#0B1CDE] font-black rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors uppercase text-xs"
                        >
                            <Edit2 className="w-4 h-4"/> EDIT
                        </button>
                        
                        <button 
                            onClick={async () => { await toggleEventStatus(event.id); loadData(); }} 
                            className={`flex-1 flex items-center justify-center gap-2 py-2 font-black rounded-lg border transition-colors uppercase text-xs ${event.isOpen ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`}
                        >
                            <Power className="w-4 h-4"/> {event.isOpen ? 'TUTUP' : 'BUKA'}
                        </button>

                        <button 
                            onClick={() => showConfirm('Hapus Acara?', 'Yakin ingin menghapus acara ini? Data pendaftar juga akan hilang.', async () => {
                                await deleteEvent(event.id);
                                loadData();
                            })} 
                            className="p-2 bg-red-50 text-red-500 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="w-5 h-5"/>
                        </button>
                        
                        <button onClick={() => navigate(`/scanner/${event.id}`)} className="p-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-200" title="Scan Tiket">
                            <ScanLine className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            ))}
          </div>
          {events.length === 0 && <div className="text-center py-12 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">Belum ada acara yang dibuat.</div>}
      </div>
  );

  const renderRegistrations = () => {
      // Calculate display rows based on filters (for bulk button visibility logic)
      const filteredRegistrations = registrations.filter(r => selectedEventFilter === 'ALL' || r.eventId === selectedEventFilter);
      const hasApprovedUsers = filteredRegistrations.some(r => r.status === RegistrationStatus.APPROVED);

      return (
          <div className="animate-fade-in space-y-4">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#2B427A] text-2xl uppercase">Data Pendaftar</h3>
                  <div className="flex gap-2">
                      {/* Bulk Send Button - Only shows if specific event is selected */}
                      {selectedEventFilter !== 'ALL' && hasApprovedUsers && (
                          <button 
                            onClick={handleBulkSendCertificates}
                            disabled={isBulkSending}
                            className="px-4 py-2 bg-[#2B427A] text-white font-bold rounded hover:bg-[#0B1CDE] flex items-center gap-2"
                          >
                              {isBulkSending ? <Loader className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                              KIRIM SEMUA SERTIFIKAT
                          </button>
                      )}
                      
                      <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4"/> EXPORT CSV</button>
                  </div>
               </div>
               
               {/* Event Filter Dropdown */}
               <div className="bg-white p-4 rounded-xl border-2 border-[#2B427A] mb-4">
                   <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filter Acara:</label>
                   <select value={selectedEventFilter} onChange={e => setSelectedEventFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg p-2 font-bold outline-none">
                       <option value="ALL">Semua Acara</option>
                       {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                   </select>
               </div>

               <div className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden">
                   <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="bg-[#2B427A] text-white">
                                   <th className="p-4 font-black uppercase text-sm">Peserta</th>
                                   <th className="p-4 font-black uppercase text-sm">Acara</th>
                                   <th className="p-4 font-black uppercase text-sm">Status</th>
                                   <th className="p-4 font-black uppercase text-sm text-center">Aksi</th>
                               </tr>
                           </thead>
                           <tbody>
                               {filteredRegistrations.map(reg => (
                                   <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                                       <td className="p-4">
                                           <div className="font-bold text-[#2B427A]">{reg.userName}</div>
                                           <div className="text-xs text-gray-500">{reg.userEmail}</div>
                                       </td>
                                       <td className="p-4 text-sm font-medium text-gray-600">{reg.eventTitle}</td>
                                       <td className="p-4">
                                           <span className={`px-2 py-1 rounded text-xs font-black uppercase ${
                                               reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                               reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                           }`}>{reg.status}</span>
                                       </td>
                                       <td className="p-4 flex justify-center gap-2">
                                           <button onClick={() => setViewingProof(reg)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Lihat Bukti"><Eye className="w-4 h-4"/></button>
                                           {reg.status === RegistrationStatus.APPROVED && (
                                               <button onClick={() => {
                                                    showConfirm(
                                                        "Kirim Sertifikat",
                                                        `Apakah Anda yakin ingin mengirim e-Sertifikat ke email ${reg.userName}?`,
                                                        async () => {
                                                            try {
                                                                await sendCertificate(reg.id);
                                                                showAlert('success', 'Berhasil', 'Sertifikat telah dikirim ke email peserta.');
                                                            } catch (err: any) {
                                                                showAlert('error', 'Gagal', err.message);
                                                            }
                                                        },
                                                        "KIRIM SEKARANG"
                                                    );
                                               }} className="p-2 text-purple-600 bg-purple-50 rounded hover:bg-purple-100" title="Kirim Sertifikat"><Award className="w-4 h-4"/></button>
                                           )}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   {filteredRegistrations.length === 0 && <div className="p-8 text-center text-gray-400 font-bold">Belum ada pendaftar untuk filter ini.</div>}
               </div>
          </div>
      );
  };

  const renderOverview = () => {
      // 1. Data Preparation for Chart (Trend Pendaftaran)
      // Sort registrations by date first
      const sortedRegs = [...registrations].sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());
      
      const trendMap = new Map<string, number>();
      sortedRegs.forEach(r => {
          const d = new Date(r.registrationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          trendMap.set(d, (trendMap.get(d) || 0) + 1);
      });
      const chartData = Array.from(trendMap).map(([name, count]) => ({ name, count })).slice(-7); // Last 7 days

      // 2. Data Preparation for Pie Chart (Status)
      const statusCounts = registrations.reduce((acc, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      
      const pieData = [
          { name: 'Disetujui', value: statusCounts['APPROVED'] || 0, color: '#16a34a' }, // Green
          { name: 'Menunggu', value: statusCounts['PENDING'] || 0, color: '#ca8a04' }, // Yellow
          { name: 'Ditolak', value: statusCounts['REJECTED'] || 0, color: '#dc2626' } // Red
      ].filter(d => d.value > 0);

      // 3. Stats Calculation
      const totalRevenue = registrations.filter(r => r.status === 'APPROVED').reduce((sum, r) => {
          const evt = events.find(e => e.id === r.eventId);
          return sum + (evt ? evt.price : 0);
      }, 0);

      const approvalRate = registrations.length > 0 
          ? Math.round(((statusCounts['APPROVED'] || 0) / registrations.length) * 100) 
          : 0;

      // 4. Popular Events
      const topEvents = [...events].sort((a, b) => b.currentParticipants - a.currentParticipants).slice(0, 5);

      // 5. Recent Activity
      const recentActivity = [...registrations].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()).slice(0, 5);

      return (
          <div className="space-y-6 animate-fade-in">
             {/* TOP CARDS */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Total Events */}
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                     <div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Acara</h3>
                        <p className="text-3xl font-black text-[#2B427A]">{events.length}</p>
                     </div>
                     <div className="p-3 bg-blue-50 rounded-lg text-[#2B427A]"><CalendarIcon className="w-6 h-6"/></div>
                 </div>
                 {/* Total Registrants */}
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                     <div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Pendaftar</h3>
                        <p className="text-3xl font-black text-[#0B1CDE]">{registrations.length}</p>
                     </div>
                     <div className="p-3 bg-blue-50 rounded-lg text-[#0B1CDE]"><UsersIcon className="w-6 h-6"/></div>
                 </div>
                 {/* Estimated Revenue */}
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                     <div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Estimasi Pendapatan</h3>
                        <p className="text-3xl font-black text-[#2B427A] truncate">Rp {(totalRevenue/1000).toFixed(0)}k</p>
                     </div>
                     <div className="p-3 bg-green-50 rounded-lg text-green-600"><DollarIcon className="w-6 h-6"/></div>
                 </div>
                 {/* Approval Rate */}
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] flex items-center justify-between">
                     <div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Tingkat Persetujuan</h3>
                        <p className="text-3xl font-black text-[#DFFF00] text-outline">{approvalRate}%</p>
                     </div>
                     <div className="p-3 bg-yellow-50 rounded-lg text-[#DFFF00] stroke-black"><CheckSquare className="w-6 h-6 text-[#DFFF00] stroke-black"/></div>
                 </div>
             </div>

             {/* CHARTS ROW */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Activity Trend */}
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-sm">
                     <h3 className="font-black text-[#2B427A] uppercase mb-6 flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-[#0B1CDE]"/> Tren Pendaftaran (7 Hari Terakhir)
                     </h3>
                     <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={chartData}>
                                 <defs>
                                     <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#0B1CDE" stopOpacity={0.8}/>
                                         <stop offset="95%" stopColor="#0B1CDE" stopOpacity={0}/>
                                     </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} allowDecimals={false} />
                                 <Tooltip contentStyle={{borderRadius: '8px', border: '2px solid #2B427A', fontWeight: 'bold'}} />
                                 <Area type="monotone" dataKey="count" stroke="#0B1CDE" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                             </AreaChart>
                         </ResponsiveContainer>
                     </div>
                 </div>

                 {/* Status Distribution */}
                 <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-sm">
                     <h3 className="font-black text-[#2B427A] uppercase mb-4 flex items-center gap-2">
                         <Activity className="w-5 h-5 text-[#0B1CDE]"/> Status Tiket
                     </h3>
                     <div className="h-64 w-full relative">
                         <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                 <Pie
                                     data={pieData}
                                     cx="50%"
                                     cy="50%"
                                     innerRadius={60}
                                     outerRadius={80}
                                     paddingAngle={5}
                                     dataKey="value"
                                 >
                                     {pieData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                     ))}
                                 </Pie>
                                 <Tooltip />
                                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
                             </PieChart>
                         </ResponsiveContainer>
                         {/* Center Text */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                             <div className="text-center">
                                 <span className="text-2xl font-black text-[#2B427A]">{registrations.length}</span>
                                 <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>

             {/* BOTTOM LISTS */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Popular Events */}
                 <div className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden">
                     <div className="p-4 bg-[#2B427A] text-white flex justify-between items-center">
                         <h3 className="font-bold uppercase text-sm">Event Terpopuler</h3>
                         <Award className="w-4 h-4 text-[#DFFF00]"/>
                     </div>
                     <div>
                         {topEvents.map((evt, idx) => (
                             <div key={evt.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                                 <div className="flex items-center gap-3">
                                     <span className={`font-black text-lg w-6 ${idx === 0 ? 'text-[#DFFF00] text-outline' : 'text-gray-300'}`}>#{idx+1}</span>
                                     <div>
                                         <p className="font-bold text-sm text-[#2B427A] truncate max-w-[200px]">{evt.title}</p>
                                         <p className="text-[10px] text-gray-400">{new Date(evt.date).toLocaleDateString()}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <p className="font-black text-[#0B1CDE]">{evt.currentParticipants}</p>
                                     <p className="text-[10px] text-gray-400">Peserta</p>
                                 </div>
                             </div>
                         ))}
                         {topEvents.length === 0 && <div className="p-8 text-center text-gray-400 text-xs">Belum ada data event.</div>}
                     </div>
                 </div>

                 {/* Recent Activity */}
                 <div className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden">
                     <div className="p-4 bg-white border-b-2 border-[#2B427A] flex justify-between items-center">
                         <h3 className="font-bold uppercase text-sm text-[#2B427A]">Pendaftar Terbaru</h3>
                         <Clock className="w-4 h-4 text-[#0B1CDE]"/>
                     </div>
                     <div>
                         {recentActivity.map((reg) => (
                             <div key={reg.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-2 h-8 rounded-full ${reg.status === 'APPROVED' ? 'bg-green-500' : reg.status === 'REJECTED' ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                                     <div>
                                         <p className="font-bold text-sm text-[#2B427A]">{reg.userName}</p>
                                         <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{reg.eventTitle}</p>
                                     </div>
                                 </div>
                                 <span className="text-[10px] font-mono text-gray-400">{new Date(reg.registrationDate).toLocaleDateString()}</span>
                             </div>
                         ))}
                         {recentActivity.length === 0 && <div className="p-8 text-center text-gray-400 text-xs">Belum ada aktivitas.</div>}
                     </div>
                 </div>
             </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans relative">
      <CustomAlert isOpen={alertState.isOpen} type={alertState.type} title={alertState.title} message={alertState.message} onClose={closeAlert} onConfirm={alertState.onConfirm} confirmText={alertState.confirmText}/>
      
      {/* PROOF MODAL WITH AI */}
      {viewingProof && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setViewingProof(null)}>
              {/* ... (Existing Proof Modal Code) ... */}
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                  <div className="w-full md:w-1/2 bg-gray-900 flex items-center justify-center p-4 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                      <img 
                        src={formatDriveUrl(viewingProof.proofUrl)} 
                        className="max-w-full max-h-[60vh] md:max-h-full object-contain rounded shadow-2xl border border-gray-700 bg-gray-800" 
                        alt="Bukti Pembayaran" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://placehold.co/400x300/1a202c/FFF?text=Gagal+Memuat+Gambar";
                        }}
                      />
                      <a href={formatDriveUrl(viewingProof.proofUrl)} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/40 text-white backdrop-blur-sm transition-colors" title="Buka Asli"><ExternalLink className="w-5 h-5"/></a>
                  </div>
                  <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto bg-white">
                      <div className="flex justify-between items-start mb-6"><div><h3 className="text-xl font-black text-[#2B427A] uppercase">Verifikasi Pembayaran</h3><p className="text-sm text-gray-500 font-bold">{viewingProof.userName}</p></div><button onClick={() => setViewingProof(null)} className="text-gray-400 hover:text-red-500"><XCircle className="w-8 h-8"/></button></div>
                      <div className="space-y-6 flex-1">
                          <div className="bg-gradient-to-r from-blue-50 to-[#F0F9FF] p-5 rounded-xl border border-blue-100 relative overflow-hidden">
                              <div className="flex justify-between items-center mb-3 relative z-10"><h4 className="font-black text-[#0B1CDE] flex items-center gap-2"><Sparkles className="w-4 h-4"/> AI Auto Check</h4>{isAnalyzing && (<span className="text-xs font-bold text-[#0B1CDE] bg-white px-2 py-1 rounded-lg animate-pulse flex items-center gap-1"><Loader className="w-3 h-3 animate-spin"/> Menganalisis...</span>)}</div>
                              {aiResult ? (<div className="animate-fade-in relative z-10"><div className={`p-3 rounded-lg border-l-4 mb-3 ${aiResult.isValid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}><div className="flex items-center gap-2 font-bold mb-1">{aiResult.isValid ? <CheckCircle className="w-4 h-4 text-green-600"/> : <XCircle className="w-4 h-4 text-red-600"/>}<span className={aiResult.isValid ? 'text-green-700' : 'text-red-700'}>{aiResult.isValid ? 'Tampak Valid' : 'Perlu Pengecekan'}</span></div><p className="text-xs text-gray-600 leading-relaxed">{aiResult.reason}</p></div><div className="flex justify-between text-xs font-bold text-gray-400"><span>Confidence: {aiResult.confidence}</span><span>Nominal: {aiResult.detectedAmount || '-'}</span></div></div>) : (<div className="text-xs text-gray-500 italic py-4 text-center">{isAnalyzing ? "Sistem sedang membaca gambar bukti pembayaran..." : "Menunggu hasil analisis..."}</div>)}
                          </div>
                          <div><label className="block text-xs font-black text-gray-400 uppercase mb-3">Tindakan Manual</label><div className="grid grid-cols-2 gap-4"><button onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.APPROVED)} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all group"><CheckCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/><span className="font-black">TERIMA</span></button><button onClick={() => handleStatusUpdate(viewingProof.id, RegistrationStatus.REJECTED)} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all group"><XCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/><span className="font-black">TOLAK</span></button></div></div>
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
      <aside className={`bg-[#2B427A] border-r-2 border-[#2B427A] h-auto md:min-h-screen sticky top-0 text-white z-10 transition-all duration-300 ${isSidebarCollapsed ? 'md:w-24' : 'md:w-72'} w-full flex flex-col`}>
        {/* Toggle Button - Only visible on Desktop */}
        <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute -right-3 top-9 bg-[#DFFF00] text-[#2B427A] p-1 rounded-full border-2 border-[#2B427A] hover:scale-110 transition-transform z-50 shadow-sm items-center justify-center"
        >
            {isSidebarCollapsed ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
        </button>

        <div className={`p-6 border-b-2 border-white/10 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
            {isSidebarCollapsed ? (
                <div className="w-10 h-10 bg-[#DFFF00] rounded border-2 border-white flex items-center justify-center shadow-md">
                    <div className="w-4 h-4 bg-[#2B427A]"></div>
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-tighter">ADMIN PANEL <div className="w-3 h-3 bg-[#DFFF00]"></div></h1>
                    <div className="mt-4 text-xs bg-[#0B1CDE] p-2 rounded text-white font-mono truncate">{session?.email}</div>
                </>
            )}
        </div>
        
        <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
            {[ 
                {id: 'overview', label: 'Ringkasan', icon: LayoutDashboard}, 
                {id: 'events', label: 'Acara', icon: CalendarIcon}, 
                {id: 'registrations', label: 'Pendaftaran', icon: UsersIcon}, 
                {id: 'scan-history', label: 'Riwayat Scan', icon: QrCode},
                {id: 'settings', label: 'Pengaturan', icon: SettingsIcon} 
            ].map(item => (
                <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    title={isSidebarCollapsed ? item.label : ''}
                    className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg font-black border-2 uppercase tracking-wide transition-all duration-200
                        ${isSidebarCollapsed ? 'justify-center' : 'text-left px-5'}
                        ${activeTab === item.id || (item.id === 'events' && activeTab === 'event-editor') ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A] shadow-[4px_4px_0px_0px_#000] transform -translate-y-1' : 'text-white border-transparent hover:bg-white/10'}
                    `}
                >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-[#2B427A]' : 'text-[#DFFF00]'}`} /> 
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
            ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {loading && <div className="mb-6 bg-[#DFFF00] text-[#2B427A] px-4 py-2 rounded-lg inline-flex items-center gap-2 font-black border-2 border-[#2B427A]"><Loader className="w-4 h-4 animate-spin"/> MEMUAT DATA...</div>}
        
        {/* EVENT EDITOR (Replaced Modal) */}
        {activeTab === 'event-editor' && (
            <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden animate-fade-in">
                {/* Editor Sidebar Steps */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                    <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-black text-[#2B427A] uppercase leading-tight">{editingId ? 'Edit Acara' : 'Buat Acara'}</h2></div>
                    <div className="flex-1 py-4 overflow-y-auto">
                        {[{ step: 1, label: 'Info Dasar', icon: LayoutList }, { step: 2, label: 'Detail & Media', icon: FileText }, { step: 3, label: 'Formulir', icon: FormInput }, { step: 4, label: 'Harga & Kuota', icon: UsersIcon }, { step: 5, label: 'Desain Sertifikat', icon: Palette }].map((item) => (
                            <button key={item.step} onClick={() => setWizardStep(item.step)} className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors border-l-4 ${wizardStep === item.step ? 'bg-white border-[#0B1CDE] text-[#0B1CDE]' : wizardStep > item.step ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${wizardStep === item.step ? 'border-[#0B1CDE] bg-[#0B1CDE] text-white' : wizardStep > item.step ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>{wizardStep > item.step ? <CheckCircle className="w-4 h-4"/> : item.step}</div>
                                <span className="font-bold text-sm">{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <button onClick={() => { setActiveTab('events'); resetWizard(); }} className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"><XCircle className="w-4 h-4"/> BATAL</button>
                    </div>
                </div>
                
                {/* Editor Content */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        {/* STEP 1 */}
                        {wizardStep === 1 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Informasi Dasar</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label><input type="text" value={newEvent.title||''} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" placeholder="Contoh: Seminar Nasional Bisnis" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label><input type="date" value={newEvent.date||''} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu</label><input type="time" value={newEvent.time||'09:00'} onChange={e=>setNewEvent({...newEvent, time:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label><select value={isCustomCat ? 'OTHER' : newEvent.category} onChange={(e) => { if (e.target.value === 'OTHER') { setIsCustomCat(true); setNewEvent({...newEvent, category: ''}); } else { setIsCustomCat(false); setNewEvent({...newEvent, category: e.target.value}); } }} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold bg-white focus:border-[#0B1CDE] outline-none">{Object.values(EventCategory).map(c=><option key={c} value={c}>{c}</option>)}<option value="OTHER">Lainnya...</option></select>{isCustomCat && <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full mt-2 p-3 border-2 border-[#DFFF00] rounded-xl font-bold" placeholder="Ketik Kategori..." />}</div></div></div>)}
                        {/* STEP 2 */}
                        {wizardStep === 2 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Detail & Media</h3><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label><input type="text" value={newEvent.location||''} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-[#0B1CDE] outline-none" placeholder="Link Zoom / Alamat Lengkap" /></div><div><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase flex justify-between">Deskripsi<button onClick={handleGenerateDescription} disabled={generatingDesc} className="text-xs text-[#0B1CDE] flex items-center gap-1 hover:underline">{generatingDesc ? <Loader className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} GENERATE WITH AI</button></label><textarea rows={6} value={newEvent.description||''} onChange={e=>setNewEvent({...newEvent, description:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-medium focus:border-[#0B1CDE] outline-none"/></div><div className="bg-[#F0F9FF] p-6 rounded-xl border border-blue-200 flex items-center justify-between"><div><h4 className="font-black text-[#2B427A] uppercase flex items-center gap-2"><QrCode className="w-5 h-5"/> Sistem Tiket QR Code</h4><p className="text-xs text-gray-500 font-bold mt-1">Aktifkan agar peserta mendapatkan QR Code unik untuk Check-In saat acara.</p></div><div className="flex items-center gap-3"><span className={`text-xs font-bold ${newEvent.enableTicketScanner ? 'text-[#0B1CDE]' : 'text-gray-400'}`}>{newEvent.enableTicketScanner ? 'AKTIF' : 'NONAKTIF'}</span><button onClick={() => setNewEvent({...newEvent, enableTicketScanner: !newEvent.enableTicketScanner})} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${newEvent.enableTicketScanner ? 'bg-[#0B1CDE]' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${newEvent.enableTicketScanner ? 'left-7' : 'left-1'}`} /></button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center"><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Banner Utama</label><input type="file" onChange={handleBannerChange} className="w-full text-xs" />{bannerPreview ? <img src={bannerPreview} className="mt-4 h-32 w-full object-cover rounded-lg border"/> : <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Preview Banner</div>}</div><div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center"><label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Thumbnail (4:5)</label><input type="file" onChange={handleThumbnailChange} className="w-full text-xs" />{thumbnailPreview ? <img src={thumbnailPreview} className="mt-4 h-32 w-auto mx-auto object-cover rounded-lg border"/> : <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Preview Thumbnail</div>}</div></div></div>)}
                        {/* STEP 3 - FORM BUILDER UPDATED */}
                        {wizardStep === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Formulir Pendaftaran</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2"><Info className="w-4 h-4"/> Field <strong>Nama</strong> dan <strong>Email</strong> sudah termasuk secara otomatis.</p>
                                </div>
                                {newEvent.formFields?.map((field, idx) => (
                                    <div key={idx} className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Label Field</label>
                                            <input type="text" value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })} className="w-full p-2 border rounded font-bold text-sm" placeholder="Contoh: No. WhatsApp / Upload CV"/>
                                        </div>
                                        <div className="w-40">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe</label>
                                            <select value={field.type} onChange={e => updateFormField(idx, { type: e.target.value as FormFieldType })} className="w-full p-2 border rounded font-bold text-sm">
                                                <option value="text">Teks Singkat</option>
                                                <option value="number">Angka</option>
                                                <option value="select">Pilihan (Dropdown)</option>
                                                <option value="textarea">Area Teks</option>
                                                <option value="file">Upload File</option>
                                            </select>
                                        </div>
                                        {field.type === 'select' && (
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Opsi (Pisahkan Koma)</label>
                                                <input type="text" value={field.options?.join(',')} onChange={e => updateFormField(idx, { options: e.target.value.split(',').map(s=>s.trim()) })} className="w-full p-2 border rounded font-bold text-sm" placeholder="Pilihan A, Pilihan B"/>
                                            </div>
                                        )}
                                        <button onClick={() => removeFormField(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button onClick={addFormField} className="w-full py-4 border-2 border-dashed border-[#2B427A] text-[#2B427A] font-bold rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"><Plus className="w-5 h-5"/> TAMBAH FIELD CUSTOM</button>
                            </div>
                        )}
                        {/* STEP 4 */}
                        {wizardStep === 4 && (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Harga & Kuota</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><label className="block text-sm font-black text-[#2B427A] mb-4 uppercase">Harga Tiket</label><div className="flex items-center gap-3"><span className="text-2xl font-bold text-gray-400">Rp</span><input type="number" value={newEvent.price} onChange={e=>setNewEvent({...newEvent, price: Number(e.target.value)})} className="flex-1 text-4xl font-black text-[#0B1CDE] outline-none border-b-2 border-gray-200 focus:border-[#0B1CDE] py-2" /></div><p className="text-xs text-gray-400 mt-4 font-bold bg-gray-50 p-2 rounded inline-block">Masukkan 0 untuk Acara GRATIS</p></div><div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><label className="block text-sm font-black text-[#2B427A] mb-4 uppercase">Kuota Peserta</label><div className="flex items-center gap-3"><UsersIcon className="w-8 h-8 text-gray-400"/><input type="number" value={newEvent.maxParticipants} onChange={e=>setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} className="flex-1 text-4xl font-black text-[#0B1CDE] outline-none border-b-2 border-gray-200 focus:border-[#0B1CDE] py-2" /></div></div></div></div>)}
                        {/* STEP 5 */}
                        {wizardStep === 5 && (<div className="space-y-6 animate-fade-in h-full flex flex-col"><h3 className="text-2xl font-black text-[#2B427A] uppercase mb-6 border-b pb-2">Desain Sertifikat</h3><p className="text-sm text-gray-500 mb-4">Buat desain sertifikat khusus untuk acara ini. Jika dikosongkan, sertifikat default akan digunakan.</p><div className="flex-1 border border-gray-200 rounded-xl overflow-hidden">{renderDesigner(true)}</div></div>)}
                    </div>
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        {wizardStep > 1 ? (<button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2"><ChevronLeft className="w-4 h-4"/> KEMBALI</button>) : <div/>}
                        {wizardStep < 5 ? (<button onClick={()=>setWizardStep(prev=>prev+1)} className="px-8 py-3 rounded-xl font-black bg-[#2B427A] text-white flex items-center gap-2 shadow-lg hover:bg-[#0B1CDE] transition-colors">SELANJUTNYA <ChevronRight className="w-4 h-4"/></button>) : (<button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-10 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[-2px] transition-all flex items-center gap-2">{isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} {editingId ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN ACARA'}</button>)}
                    </div>
                </div>
            </div>
        )}

        {/* SETTINGS VIEW */}
        {activeTab === 'settings' && (
           <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden">
               <div className="w-full md:w-64 bg-gray-50 border-r-2 border-gray-200 flex flex-col">
                   <div className="p-6 border-b border-gray-200"><h3 className="font-black text-[#2B427A] uppercase text-lg">Menu Pengaturan</h3></div>
                   <nav className="flex-1 p-4 space-y-2">
                       <button onClick={() => setSettingsTab('payment')} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${settingsTab === 'payment' ? 'bg-[#2B427A] text-white shadow-[2px_2px_0px_0px_#000]' : 'text-gray-600 hover:bg-gray-200'}`}><CreditCard className="w-5 h-5"/> Pembayaran & QRIS</button>
                       <button onClick={() => setSettingsTab('certificate')} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${settingsTab === 'certificate' ? 'bg-[#2B427A] text-white shadow-[2px_2px_0px_0px_#000]' : 'text-gray-600 hover:bg-gray-200'}`}><Award className="w-5 h-5"/> Sertifikat Default</button>
                   </nav>
               </div>
               <div className="flex-1 overflow-y-auto p-8 bg-white">
                   {settingsTab === 'certificate' && (<div className="animate-fade-in h-full flex flex-col"><div className="mb-6 flex justify-between items-center border-b pb-4"><div><h3 className="font-black text-[#2B427A] uppercase mb-1">Desain Sertifikat Default</h3><p className="text-gray-500 text-sm">Template ini akan digunakan jika acara tidak memiliki desain spesifik.</p></div><button onClick={handleSaveCertSettings} disabled={savingCertSettings} className="px-5 py-2 bg-[#0B1CDE] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#2B427A]">{savingCertSettings ? <Loader className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SIMPAN TEMPLATE</button></div><div className="flex-1 relative border border-gray-200 rounded-xl overflow-hidden">{renderDesigner(false)}</div></div>)}
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
        {activeTab === 'scan-history' && renderScanHistory()}
        {activeTab === 'overview' && renderOverview()}
      </main>
      
      <style>{`@keyframes slide-up {0% { transform: translate(-50%, 100%); opacity: 0; }100% { transform: translate(-50%, 0); opacity: 1; }}.animate-slide-up {animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;} .text-outline { -webkit-text-stroke: 1px #2B427A; text-shadow: 2px 2px 0px #2B427A; }`}</style>
    </div>
  );
};

export default AdminDashboard;
