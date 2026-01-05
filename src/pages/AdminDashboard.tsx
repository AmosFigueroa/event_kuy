
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Plus, Calendar, Users, Settings, LogOut, 
  ChevronRight, ChevronLeft, Save, Loader, CheckCircle, 
  Search, Trash2, Edit2, X, Upload, Image as ImageIcon, 
  FileText, DollarSign, MapPin, Tag, RefreshCw, Filter,
  MoreVertical, Download, Mail, Award, Eye, QrCode,
  AlertCircle, Wand2, Check, XCircle, ArrowUpRight, Copy, CreditCard
} from 'lucide-react';
import { 
  fetchEvents, createEvent, updateEvent, deleteEvent, 
  fetchRegistrations, updateRegistrationStatus, sendCertificate,
  fetchPaymentSettings, savePaymentSettings,
  getUserSession, logout, createSlug, toggleEventStatus, sendBulkCertificates, deleteRegistration
} from '../services/api';
import { generateEventDescription, analyzePaymentProof, PaymentAnalysisResult } from '../services/geminiService';
import { 
  Event, Registration, RegistrationStatus, 
  PaymentSettings, CertificateElement, CertificateConfig, FormField 
} from '../types';
import CustomAlert from '../components/CustomAlert';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getUserSession();
  
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<'events' | 'registrations' | 'settings'>('events');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ bankAccounts: [] });
  
  // --- Alert State ---
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  // --- Event Wizard State ---
  const [showEventModal, setShowEventModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  const initialEventState: Partial<Event> = {
      title: '', category: 'Seminar', price: 0, maxParticipants: 100, 
      date: '', time: '', location: '', description: '', 
      isOpen: true, formFields: [], 
      certificateConfig: { backgroundUrl: '', elements: [] },
      enableTicketScanner: true
  };
  const [eventFormData, setEventFormData] = useState<Partial<Event>>(initialEventState);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [certBgFile, setCertBgFile] = useState<File | null>(null);
  const [certBgPreview, setCertBgPreview] = useState<string>('');

  // --- Registration Management State ---
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysisResult | null>(null);
  const [isAnalyzingPayment, setIsAnalyzingPayment] = useState(false);
  const [regFilterEvent, setRegFilterEvent] = useState<string>('ALL');
  const [regFilterStatus, setRegFilterStatus] = useState<string>('ALL');
  const [regSearch, setRegSearch] = useState('');
  const [sendingCertId, setSendingCertId] = useState<string | null>(null);

  // --- Initialization ---
  useEffect(() => {
      if (!session || session.role !== 'ADMIN') {
          navigate('/login');
          return;
      }
      loadInitialData();
  }, [session, navigate]);

  const loadInitialData = async () => {
      setLoading(true);
      try {
          const [evs, regs, pay] = await Promise.all([
              fetchEvents(),
              fetchRegistrations(),
              fetchPaymentSettings()
          ]);
          setEvents(evs);
          setRegistrations(regs);
          setPaymentSettings(pay);
      } catch (e) {
          showAlert('error', 'Error', 'Gagal memuat data dashboard.');
      } finally {
          setLoading(false);
      }
  };

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onConfirm?: () => void) => {
    setAlertState({ isOpen: true, type, title, message, onConfirm });
  };

  // --- Event Handlers ---

  const handleOpenEventModal = (eventToEdit?: Event) => {
      if (eventToEdit) {
          setEditingId(eventToEdit.id);
          setEventFormData(eventToEdit);
          setBannerPreview(eventToEdit.bannerUrl);
          setThumbnailPreview(eventToEdit.thumbnailUrl || '');
          setCertBgPreview(eventToEdit.certificateConfig?.backgroundUrl || '');
      } else {
          setEditingId(null);
          setEventFormData(initialEventState);
          setBannerPreview('');
          setThumbnailPreview('');
          setCertBgPreview('');
      }
      setWizardStep(1);
      setBannerFile(null);
      setThumbnailFile(null);
      setCertBgFile(null);
      setShowEventModal(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'banner' | 'certBg' | 'thumbnail') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (type === 'banner') {
                  setBannerFile(file);
                  setBannerPreview(ev.target?.result as string);
              } else if (type === 'thumbnail') {
                  setThumbnailFile(file);
                  setThumbnailPreview(ev.target?.result as string);
              } else {
                  setCertBgFile(file);
                  setCertBgPreview(ev.target?.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateDescription = async () => {
      if (!eventFormData.title || !eventFormData.category) {
          showAlert('info', 'Info', 'Isi Judul dan Kategori terlebih dahulu.');
          return;
      }
      setIsGeneratingDesc(true);
      try {
          const desc = await generateEventDescription(
              eventFormData.title, 
              eventFormData.category, 
              `Lokasi: ${eventFormData.location}, Waktu: ${eventFormData.time}`
          );
          setEventFormData(prev => ({ ...prev, description: desc }));
      } catch (e: any) {
          showAlert('error', 'Gagal AI', e.message);
      } finally {
          setIsGeneratingDesc(false);
      }
  };

  const handleCreateOrUpdateEvent = async () => {
      // Validation
      if (!eventFormData.title || !eventFormData.date || !eventFormData.price?.toString()) {
           showAlert('error', 'Validasi', 'Mohon lengkapi informasi dasar event.');
           setWizardStep(1);
           return;
      }

      setIsSubmittingEvent(true);
      try {
          // Convert files to base64 if needed
          const bannerBase64 = bannerFile ? await fileToBase64(bannerFile) : undefined;
          const thumbnailBase64 = thumbnailFile ? await fileToBase64(thumbnailFile) : undefined;
          const certBgBase64 = certBgFile ? await fileToBase64(certBgFile) : undefined;

          // Prepare Payload
          const payload = { ...eventFormData };
          
          if (editingId) {
              await updateEvent(payload, bannerBase64, certBgBase64, thumbnailBase64);
              showAlert('success', 'Berhasil', 'Event berhasil diperbarui.');
          } else {
              if (!bannerBase64) throw new Error("Banner wajib diupload untuk event baru.");
              await createEvent(payload, bannerBase64, certBgBase64, thumbnailBase64);
              showAlert('success', 'Berhasil', 'Event baru berhasil dibuat.');
          }
          
          setShowEventModal(false);
          loadInitialData();
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setIsSubmittingEvent(false);
      }
  };

  const handleDeleteEvent = (id: string) => {
      showAlert('info', 'Konfirmasi Hapus', 'Yakin ingin menghapus event ini? Data tidak bisa dikembalikan.', async () => {
          try {
              await deleteEvent(id);
              showAlert('success', 'Terhapus', 'Event berhasil dihapus.');
              loadInitialData();
          } catch (e: any) {
              showAlert('error', 'Gagal', e.message);
          }
      });
  };
  
  const handleToggleStatus = async (id: string) => {
      try {
          await toggleEventStatus(id);
          // Optimistic update
          setEvents(prev => prev.map(e => e.id === id ? { ...e, isOpen: !e.isOpen } : e));
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      }
  };

  // --- Registration Handlers ---

  const handleDeleteRegistration = (id: string) => {
      showAlert('info', 'Hapus Peserta', 'Yakin ingin menghapus data peserta ini? Data tidak bisa dikembalikan.', async () => {
          try {
              await deleteRegistration(id);
              setRegistrations(prev => prev.filter(r => r.id !== id));
              showAlert('success', 'Terhapus', 'Data peserta berhasil dihapus.');
              // Manually update local event count if possible, otherwise rely on reload next time
              const reg = registrations.find(r => r.id === id);
              if(reg) {
                  setEvents(prev => prev.map(e => e.id === reg.eventId ? {...e, currentParticipants: Math.max(0, e.currentParticipants - 1)} : e));
              }
          } catch (e: any) {
              showAlert('error', 'Gagal', e.message);
          }
      });
  };

  const handleAnalyzePayment = async () => {
      if (!selectedReg || !selectedReg.proofUrl) return;
      
      // Find event price
      const evt = events.find(e => e.id === selectedReg.eventId);
      if (!evt) return;

      setIsAnalyzingPayment(true);
      try {
          // Check if proofUrl is a full URL or base64. Usually from drive it's a proxy url. 
          // For analysis we need base64. 
          // Limitation: If image is cross-origin, might verify if we can fetch it. 
          // Here assuming we fetch the blob then convert.
          
          let base64Image = '';
          if (selectedReg.proofUrl.startsWith('data:')) {
             base64Image = selectedReg.proofUrl.split(',')[1];
          } else {
              // Fetch via proxy or cors aware fetch
              const resp = await fetch(selectedReg.proofUrl);
              const blob = await resp.blob();
              base64Image = await blobToBase64(blob) as string; 
          }

          const result = await analyzePaymentProof(base64Image, evt.price);
          setPaymentAnalysis(result);
      } catch (e: any) {
          showAlert('error', 'Gagal Analisis', 'Tidak dapat menganalisis gambar. Pastikan gambar dapat diakses.');
      } finally {
          setIsAnalyzingPayment(false);
      }
  };

  const handleUpdateRegStatus = async (id: string, status: RegistrationStatus) => {
      try {
          await updateRegistrationStatus(id, status);
          setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
          if (selectedReg && selectedReg.id === id) {
              setSelectedReg({ ...selectedReg, status });
          }
          showAlert('success', 'Update Berhasil', `Status pendaftaran diubah menjadi ${status}`);
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      }
  };

  const handleSendCert = async (id: string) => {
      setSendingCertId(id);
      try {
          await sendCertificate(id);
          showAlert('success', 'Terkirim', 'Sertifikat berhasil dikirim ke email peserta.');
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      } finally {
          setSendingCertId(null);
      }
  };

  // --- Settings Handlers ---

  const handleSaveSettings = async () => {
      try {
          await savePaymentSettings(paymentSettings);
          showAlert('success', 'Tersimpan', 'Pengaturan pembayaran berhasil disimpan.');
      } catch (e: any) {
          showAlert('error', 'Gagal', e.message);
      }
  };

  const handleQrisUpload = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async (ev) => {
              const base64 = (ev.target?.result as string).split(',')[1];
              try {
                  await savePaymentSettings(paymentSettings, base64);
                  loadInitialData(); // Reload to get new URL
                  showAlert('success', 'Berhasil', 'QRIS berhasil diupload.');
              } catch(e:any) {
                   showAlert('error', 'Gagal', e.message);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // --- Utilities ---
  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  };

  // --- Render Helpers ---

  const renderWizardStep = () => {
      switch (wizardStep) {
          case 1: // Basic Info
              return (
                  <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Judul Event</label>
                              <input type="text" value={eventFormData.title} onChange={e => setEventFormData({...eventFormData, title: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Masukkan judul event" />
                          </div>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Kategori</label>
                              <select value={eventFormData.category} onChange={e => setEventFormData({...eventFormData, category: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none bg-white">
                                  <option value="Seminar">Seminar</option>
                                  <option value="Workshop">Workshop</option>
                                  <option value="Webinar">Webinar</option>
                                  <option value="Competition">Competition</option>
                                  <option value="Concert">Concert</option>
                              </select>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Tanggal</label>
                              <input type="date" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" />
                          </div>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Waktu</label>
                              <input type="time" value={eventFormData.time} onChange={e => setEventFormData({...eventFormData, time: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" />
                          </div>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Lokasi</label>
                              <input type="text" value={eventFormData.location} onChange={e => setEventFormData({...eventFormData, location: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" placeholder="Online / Nama Gedung" />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Harga Tiket (Rp)</label>
                              <input type="number" value={eventFormData.price} onChange={e => setEventFormData({...eventFormData, price: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" placeholder="0 untuk Gratis" />
                          </div>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-1">Kuota Peserta</label>
                              <input type="number" value={eventFormData.maxParticipants} onChange={e => setEventFormData({...eventFormData, maxParticipants: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold focus:border-[#0B1CDE] outline-none" />
                          </div>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <input 
                            type="checkbox" 
                            checked={eventFormData.enableTicketScanner} 
                            onChange={e => setEventFormData({...eventFormData, enableTicketScanner: e.target.checked})}
                            id="enableScanner"
                            className="w-5 h-5 accent-[#0B1CDE]"
                          />
                          <label htmlFor="enableScanner" className="text-sm font-bold text-gray-700 cursor-pointer">Aktifkan Fitur Scanner Tiket (QR Code)</label>
                      </div>
                  </div>
              );
          case 2: // Details & Visuals
              return (
                  <div className="space-y-6 animate-fade-in">
                      <div>
                          <label className="block text-sm font-black text-[#2B427A] mb-1">Deskripsi Acara</label>
                          <div className="relative">
                              <textarea rows={6} value={eventFormData.description} onChange={e => setEventFormData({...eventFormData, description: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-3 font-medium focus:border-[#0B1CDE] outline-none" placeholder="Jelaskan detail acara..."></textarea>
                              <button 
                                onClick={handleGenerateDescription}
                                disabled={isGeneratingDesc}
                                className="absolute bottom-3 right-3 bg-[#DFFF00] text-[#2B427A] px-3 py-1.5 rounded-md text-xs font-black flex items-center gap-2 border border-[#2B427A] hover:bg-white transition-colors shadow-sm"
                              >
                                {isGeneratingDesc ? <Loader className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                                GENERATE WITH AI
                              </button>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-1">Banner (Landscape 16:9)</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative h-40 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {bannerPreview ? (
                                    <img src={bannerPreview} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-xs font-bold text-gray-500">Upload Banner</span>
                                    </>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <span className="text-white font-bold text-xs"><Edit2 className="w-6 h-6"/></span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-1">Thumbnail (Portrait 4:5)</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative h-40 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {thumbnailPreview ? (
                                    <img src={thumbnailPreview} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-xs font-bold text-gray-500">Upload Thumbnail</span>
                                    </>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <span className="text-white font-bold text-xs"><Edit2 className="w-6 h-6"/></span>
                                </div>
                            </div>
                        </div>
                      </div>
                  </div>
              );
          case 3: // Custom Form Fields
              const addField = () => setEventFormData(prev => ({...prev, formFields: [...(prev.formFields || []), { id: Date.now().toString(), label: '', type: 'text', required: true }]}));
              const updateField = (idx: number, field: Partial<FormField>) => {
                  const newFields = [...(eventFormData.formFields || [])];
                  newFields[idx] = { ...newFields[idx], ...field };
                  setEventFormData(prev => ({ ...prev, formFields: newFields }));
              };
              const removeField = (idx: number) => {
                  const newFields = [...(eventFormData.formFields || [])];
                  newFields.splice(idx, 1);
                  setEventFormData(prev => ({ ...prev, formFields: newFields }));
              };

              return (
                  <div className="space-y-4 animate-fade-in">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4"/>
                          Nama dan Email sudah otomatis disertakan dalam setiap formulir.
                      </div>
                      
                      {(eventFormData.formFields || []).map((field, idx) => (
                          <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <input type="text" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} className="col-span-2 border rounded p-2 text-sm" placeholder="Label Pertanyaan (misal: No. WA)" />
                                  <select value={field.type} onChange={e => updateField(idx, { type: e.target.value as any })} className="border rounded p-2 text-sm bg-white">
                                      <option value="text">Text Singkat</option>
                                      <option value="textarea">Text Panjang</option>
                                      <option value="number">Angka</option>
                                      <option value="select">Pilihan (Dropdown)</option>
                                      <option value="file">Upload File</option>
                                  </select>
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} className="w-4 h-4" />
                                      <span className="text-xs">Wajib?</span>
                                  </div>
                              </div>
                              {field.type === 'select' && (
                                  <input type="text" value={field.options?.join(', ')} onChange={e => updateField(idx, { options: e.target.value.split(',').map(s=>s.trim()) })} className="w-full border rounded p-2 text-sm mt-2" placeholder="Opsi pisahkan dengan koma" />
                              )}
                              <button onClick={() => removeField(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      ))}
                      <button onClick={addField} className="w-full py-3 border-2 border-dashed border-[#2B427A] text-[#2B427A] rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#DFFF00]/20 transition-colors">
                          <Plus className="w-4 h-4"/> Tambah Kolom Pertanyaan
                      </button>
                  </div>
              );
          case 4: // Certificate Config
              const addCertElement = () => setEventFormData(prev => ({
                  ...prev, 
                  certificateConfig: { 
                      ...prev.certificateConfig!, 
                      elements: [...prev.certificateConfig!.elements, { 
                          id: Date.now().toString(), type: 'dynamic', field: 'userName', 
                          label: 'Nama Peserta', x: 421, y: 297, fontSize: 24, 
                          fontFamily: 'Helvetica', align: 'center', color: '#000000', width: 400
                      }] 
                  }
              }));
              const updateCertElement = (idx: number, el: Partial<CertificateElement>) => {
                  const newEls = [...eventFormData.certificateConfig!.elements];
                  newEls[idx] = { ...newEls[idx], ...el };
                  setEventFormData(prev => ({ ...prev, certificateConfig: { ...prev.certificateConfig!, elements: newEls } }));
              };
              const removeCertElement = (idx: number) => {
                  const newEls = [...eventFormData.certificateConfig!.elements];
                  newEls.splice(idx, 1);
                  setEventFormData(prev => ({ ...prev, certificateConfig: { ...prev.certificateConfig!, elements: newEls } }));
              };

              return (
                  <div className="space-y-6 animate-fade-in">
                      <div className="flex gap-4">
                           <div className="w-1/3 space-y-4">
                               <div className="border rounded-lg p-3 bg-gray-50">
                                   <label className="block text-xs font-bold mb-2">Background Sertifikat</label>
                                   <input type="file" onChange={(e) => handleFileChange(e, 'certBg')} className="text-xs" />
                                   {certBgPreview && <img src={certBgPreview} className="mt-2 w-full h-auto border" />}
                               </div>
                               <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                   {eventFormData.certificateConfig?.elements.map((el, idx) => (
                                       <div key={idx} className="border p-2 rounded bg-white text-xs space-y-2">
                                           <div className="flex justify-between items-center font-bold">
                                               <span>Elemen {idx+1}</span>
                                               <button onClick={()=>removeCertElement(idx)} className="text-red-500"><X className="w-3 h-3"/></button>
                                           </div>
                                           <select value={el.field} onChange={e=>updateCertElement(idx, {field: e.target.value})} className="w-full border rounded p-1">
                                               <option value="userName">Nama Peserta</option>
                                               <option value="eventTitle">Judul Event</option>
                                               <option value="date">Tanggal</option>
                                               <option value="certificateNumber">Nomor Sertifikat</option>
                                               <option value="custom">Teks Custom (Statis)</option>
                                           </select>
                                           <div className="grid grid-cols-2 gap-2">
                                               <input type="number" placeholder="X" value={el.x} onChange={e=>updateCertElement(idx, {x: Number(e.target.value)})} className="border rounded p-1"/>
                                               <input type="number" placeholder="Y" value={el.y} onChange={e=>updateCertElement(idx, {y: Number(e.target.value)})} className="border rounded p-1"/>
                                               <input type="number" placeholder="Size" value={el.fontSize} onChange={e=>updateCertElement(idx, {fontSize: Number(e.target.value)})} className="border rounded p-1"/>
                                               <input type="color" value={el.color} onChange={e=>updateCertElement(idx, {color: e.target.value})} className="h-8 w-full cursor-pointer"/>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                               <button onClick={addCertElement} className="w-full py-2 bg-[#2B427A] text-white rounded text-xs font-bold">Tambah Elemen</button>
                           </div>
                           <div className="w-2/3 bg-gray-200 rounded-lg flex items-center justify-center p-4 overflow-hidden relative min-h-[400px]">
                               {/* Preview Canvas */}
                               <div className="relative bg-white shadow-lg overflow-hidden" style={{ width: '595px', height: '420px', transform: 'scale(0.8)' }}>
                                   {certBgPreview && <img src={certBgPreview} className="w-full h-full object-cover absolute inset-0" />}
                                   {eventFormData.certificateConfig?.elements.map((el, idx) => (
                                       <div key={idx} style={{
                                           position: 'absolute', left: el.x, top: el.y, 
                                           color: el.color, fontSize: el.fontSize, 
                                           transform: 'translate(-50%, -50%)',
                                           fontFamily: el.fontFamily, fontWeight: 'bold', whiteSpace: 'nowrap',
                                           border: '1px dashed rgba(0,0,0,0.3)', cursor: 'move'
                                       }}>
                                           {el.field === 'userName' ? 'NAMA PESERTA' : el.field}
                                       </div>
                                   ))}
                               </div>
                           </div>
                      </div>
                  </div>
              );
          case 5: // Review
              return (
                  <div className="space-y-4 animate-fade-in text-center py-8">
                      <div className="w-20 h-20 bg-[#DFFF00] rounded-full border-4 border-[#2B427A] flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-10 h-10 text-[#2B427A]"/>
                      </div>
                      <h3 className="text-2xl font-black text-[#2B427A]">Siap Dipublikasikan?</h3>
                      <p className="text-gray-600 max-w-md mx-auto">Pastikan semua data sudah benar. Event akan segera tampil di halaman utama aplikasi.</p>
                      <div className="bg-gray-50 p-4 rounded-xl border max-w-sm mx-auto text-left text-sm space-y-2">
                          <p><strong>Judul:</strong> {eventFormData.title}</p>
                          <p><strong>Tanggal:</strong> {eventFormData.date} {eventFormData.time}</p>
                          <p><strong>Harga:</strong> Rp {eventFormData.price}</p>
                      </div>
                  </div>
              );
          default: return null;
      }
  };

  // --- Main Render ---

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-10 h-10 animate-spin text-[#2B427A]"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
        onConfirm={alertState.onConfirm}
      />

      {/* Sidebar */}
      <aside className="w-64 bg-[#2B427A] text-white flex-shrink-0 hidden md:flex flex-col">
          <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-black text-[#DFFF00] tracking-tight">ADMIN PANEL</h2>
              <p className="text-xs text-blue-200 mt-1 font-bold">Event Management System</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setActiveTab('events')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'events' ? 'bg-[#DFFF00] text-[#2B427A]' : 'text-blue-100 hover:bg-white/10'}`}>
                  <Calendar className="w-5 h-5"/> Kelola Event
              </button>
              <button onClick={() => setActiveTab('registrations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'registrations' ? 'bg-[#DFFF00] text-[#2B427A]' : 'text-blue-100 hover:bg-white/10'}`}>
                  <Users className="w-5 h-5"/> Pendaftar
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-[#DFFF00] text-[#2B427A]' : 'text-blue-100 hover:bg-white/10'}`}>
                  <Settings className="w-5 h-5"/> Pengaturan
              </button>
          </nav>
          <div className="p-4 border-t border-white/10">
              <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-3 text-red-300 hover:text-white font-bold transition-colors">
                  <LogOut className="w-5 h-5"/> Keluar
              </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* Top Bar Mobile */}
          <div className="md:hidden mb-6 flex justify-between items-center">
             <h1 className="text-xl font-black text-[#2B427A]">ADMIN PANEL</h1>
             <button onClick={()=>logout()}><LogOut className="text-red-500"/></button>
          </div>

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
              <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-black text-[#2B427A] uppercase tracking-tight">Daftar Event</h2>
                      <button onClick={() => handleOpenEventModal()} className="bg-[#0B1CDE] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none transition-all">
                          <Plus className="w-5 h-5"/> Buat Event Baru
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {events.map(event => (
                          <div key={event.id} className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden group hover:shadow-[6px_6px_0px_0px_#DFFF00] transition-all">
                              <div className="h-40 bg-gray-200 relative">
                                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-black uppercase ${event.isOpen ? 'bg-[#DFFF00] text-[#2B427A]' : 'bg-red-500 text-white'}`}>
                                      {event.isOpen ? 'OPEN' : 'CLOSED'}
                                  </div>
                              </div>
                              <div className="p-5">
                                  <h3 className="text-lg font-black text-[#2B427A] mb-2 line-clamp-1">{event.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 font-bold mb-4">
                                      <Calendar className="w-4 h-4 text-[#0B1CDE]"/> {new Date(event.date).toLocaleDateString()}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mb-4">
                                      <button onClick={() => navigate(`/scanner/${event.id}`)} className="bg-gray-100 hover:bg-[#2B427A] hover:text-white text-[#2B427A] py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                                          <QrCode className="w-3 h-3"/> Scanner
                                      </button>
                                      <button onClick={() => handleToggleStatus(event.id)} className="bg-gray-100 hover:bg-orange-100 text-gray-600 py-2 rounded-lg text-xs font-bold transition-colors">
                                          {event.isOpen ? 'Tutup Event' : 'Buka Event'}
                                      </button>
                                  </div>
                                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                                      <button onClick={() => handleOpenEventModal(event)} className="flex-1 bg-[#0B1CDE] text-white py-2 rounded-lg font-bold text-sm hover:bg-[#0916B0]">Edit</button>
                                      <button onClick={() => handleDeleteEvent(event.id)} className="px-3 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* REGISTRATIONS TAB */}
          {activeTab === 'registrations' && (
              <div className="space-y-6 animate-fade-in">
                  <h2 className="text-3xl font-black text-[#2B427A] uppercase tracking-tight mb-4">Data Pendaftar</h2>
                  
                  {/* Filters */}
                  <div className="bg-white p-4 rounded-xl border-2 border-[#2B427A] flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                          <div className="relative flex-1 max-w-xs">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                              <input type="text" placeholder="Cari nama / email..." value={regSearch} onChange={e=>setRegSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm focus:border-[#0B1CDE] outline-none"/>
                          </div>
                          <select value={regFilterEvent} onChange={e=>setRegFilterEvent(e.target.value)} className="border-2 border-gray-200 rounded-lg p-2 text-sm font-bold max-w-xs">
                              <option value="ALL">Semua Event</option>
                              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                          </select>
                          <select value={regFilterStatus} onChange={e=>setRegFilterStatus(e.target.value)} className="border-2 border-gray-200 rounded-lg p-2 text-sm font-bold">
                              <option value="ALL">Semua Status</option>
                              <option value="PENDING">Menunggu</option>
                              <option value="APPROVED">Disetujui</option>
                              <option value="REJECTED">Ditolak</option>
                          </select>
                      </div>
                      <button onClick={loadInitialData} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><RefreshCw className="w-5 h-5"/></button>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-xl border-2 border-[#2B427A] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b-2 border-[#2B427A]">
                              <tr>
                                  <th className="p-4 text-xs font-black text-[#2B427A] uppercase">Nama</th>
                                  <th className="p-4 text-xs font-black text-[#2B427A] uppercase">Event</th>
                                  <th className="p-4 text-xs font-black text-[#2B427A] uppercase">Status</th>
                                  <th className="p-4 text-xs font-black text-[#2B427A] uppercase text-right">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {registrations
                                .filter(r => regFilterEvent === 'ALL' || r.eventId === regFilterEvent)
                                .filter(r => regFilterStatus === 'ALL' || r.status === regFilterStatus)
                                .filter(r => r.userName.toLowerCase().includes(regSearch.toLowerCase()) || r.userEmail.toLowerCase().includes(regSearch.toLowerCase()))
                                .map(reg => (
                                  <tr key={reg.id} className="hover:bg-blue-50/50 transition-colors">
                                      <td className="p-4">
                                          <div className="font-bold text-[#2B427A]">{reg.userName}</div>
                                          <div className="text-xs text-gray-400">{reg.userEmail}</div>
                                      </td>
                                      <td className="p-4 text-sm font-medium text-gray-600">{reg.eventTitle}</td>
                                      <td className="p-4">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                              reg.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                              reg.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                              'bg-yellow-100 text-yellow-700'
                                          }`}>
                                              {reg.status}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right flex items-center justify-end gap-2">
                                          <button onClick={() => setSelectedReg(reg)} className="text-[#0B1CDE] hover:bg-blue-50 p-2 rounded-lg font-bold text-xs border border-[#0B1CDE]">
                                              Detail
                                          </button>
                                          <button onClick={() => handleDeleteRegistration(reg.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg border border-red-200">
                                              <Trash2 className="w-4 h-4"/>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                  <h2 className="text-3xl font-black text-[#2B427A] uppercase tracking-tight">Pengaturan Pembayaran</h2>
                  
                  <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] space-y-6">
                      <div>
                          <h3 className="text-lg font-black text-[#2B427A] mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5"/> Rekening Bank</h3>
                          {paymentSettings.bankAccounts.map((acc, idx) => (
                              <div key={idx} className="flex gap-2 mb-2">
                                  <input type="text" value={acc.bankName} onChange={e => {
                                      const newAccs = [...paymentSettings.bankAccounts];
                                      newAccs[idx].bankName = e.target.value;
                                      setPaymentSettings({...paymentSettings, bankAccounts: newAccs});
                                  }} className="border rounded p-2 flex-1 font-bold text-sm" placeholder="Nama Bank"/>
                                  <input type="text" value={acc.accountNumber} onChange={e => {
                                      const newAccs = [...paymentSettings.bankAccounts];
                                      newAccs[idx].accountNumber = e.target.value;
                                      setPaymentSettings({...paymentSettings, bankAccounts: newAccs});
                                  }} className="border rounded p-2 flex-1 font-bold text-sm" placeholder="No. Rekening"/>
                                  <button onClick={() => {
                                       const newAccs = [...paymentSettings.bankAccounts];
                                       newAccs.splice(idx, 1);
                                       setPaymentSettings({...paymentSettings, bankAccounts: newAccs});
                                  }} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                              </div>
                          ))}
                          <button onClick={() => setPaymentSettings(prev => ({ ...prev, bankAccounts: [...prev.bankAccounts, { id: Date.now().toString(), bankName: '', accountNumber: '', accountHolder: 'HMP Bisdig' }] }))} className="text-xs font-black text-[#0B1CDE] flex items-center gap-1 mt-2">
                              <Plus className="w-3 h-3"/> TAMBAH REKENING
                          </button>
                      </div>

                      <div className="border-t pt-6">
                          <h3 className="text-lg font-black text-[#2B427A] mb-4 flex items-center gap-2"><QrCode className="w-5 h-5"/> QRIS Code</h3>
                          <div className="flex gap-6 items-start">
                              <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                  {paymentSettings.qrisUrl ? <img src={paymentSettings.qrisUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No QRIS</div>}
                              </div>
                              <div>
                                  <p className="text-sm text-gray-600 mb-2">Upload gambar QRIS baru untuk mengganti yang lama.</p>
                                  <input type="file" onChange={handleQrisUpload} className="text-xs"/>
                              </div>
                          </div>
                      </div>

                      <button onClick={handleSaveSettings} className="w-full py-3 bg-[#2B427A] text-white font-black rounded-lg hover:bg-[#0B1CDE] transition-colors">SIMPAN PENGATURAN</button>
                  </div>
              </div>
          )}
      </main>

      {/* EVENT WIZARD MODAL */}
      {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-scale-up">
                  {/* Header */}
                  <div className="bg-[#2B427A] p-4 flex justify-between items-center text-white">
                      <h3 className="font-black text-lg uppercase tracking-wider">
                          {editingId ? 'Edit Event' : 'Buat Event Baru'} - Langkah {wizardStep}/5
                      </h3>
                      <button onClick={() => setShowEventModal(false)}><X className="w-6 h-6 hover:text-[#DFFF00]"/></button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-gray-200">
                      <div className="h-full bg-[#DFFF00]" style={{ width: `${(wizardStep/5)*100}%` }}></div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                      {renderWizardStep()}
                  </div>

                  {/* Footer Controls */}
                  <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <div>
                            {wizardStep > 1 && (
                                <button onClick={()=>setWizardStep(prev=>prev-1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-2 transition-colors uppercase text-xs tracking-wider">
                                    <ChevronLeft className="w-4 h-4"/> KEMBALI
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleCreateOrUpdateEvent} 
                                disabled={isSubmittingEvent} 
                                className="px-6 py-3 rounded-xl font-bold text-[#0B1CDE] bg-blue-50 border-2 border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all flex items-center gap-2 uppercase text-xs tracking-wider"
                            >
                                {isSubmittingEvent ? <Loader className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                {editingId ? 'SIMPAN' : 'SIMPAN DRAFT'}
                            </button>

                            {wizardStep < 5 ? (
                                <button onClick={()=>setWizardStep(prev=>prev+1)} className="px-8 py-3 rounded-xl font-black bg-[#2B427A] text-white flex items-center gap-2 shadow-lg hover:bg-[#0B1CDE] transition-colors uppercase text-xs tracking-wider">
                                    SELANJUTNYA <ChevronRight className="w-4 h-4"/>
                                </button>
                            ) : (
                                <button onClick={handleCreateOrUpdateEvent} disabled={isSubmittingEvent} className="px-10 py-3 rounded-xl font-black bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[-2px] transition-all flex items-center gap-2 uppercase text-xs tracking-wider">
                                    {isSubmittingEvent ? <Loader className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>} 
                                    {editingId ? 'SELESAI & SIMPAN' : 'PUBLIKASIKAN'}
                                </button>
                            )}
                        </div>
                  </div>
              </div>
          </div>
      )}

      {/* REGISTRATION DETAIL MODAL */}
      {selectedReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
                  <div className="p-6 border-b flex justify-between items-start">
                      <div>
                          <h3 className="text-xl font-black text-[#2B427A] uppercase">{selectedReg.userName}</h3>
                          <p className="text-sm text-gray-500 font-bold">{selectedReg.eventTitle}</p>
                      </div>
                      <button onClick={()=>setSelectedReg(null)}><X className="w-6 h-6 text-gray-400 hover:text-red-500"/></button>
                  </div>
                  <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/2">
                          <label className="text-xs font-black text-gray-400 uppercase block mb-2">Bukti Pembayaran</label>
                          <div className="rounded-lg overflow-hidden border-2 border-[#2B427A] relative group">
                              <img src={selectedReg.proofUrl} className="w-full h-auto object-cover"/>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={selectedReg.proofUrl} target="_blank" rel="noreferrer" className="text-white font-bold text-xs flex items-center gap-2"><Eye className="w-4 h-4"/> Lihat Full</a>
                              </div>
                          </div>
                          <button 
                            onClick={handleAnalyzePayment}
                            disabled={isAnalyzingPayment}
                            className="mt-3 w-full py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded border border-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-100"
                          >
                              {isAnalyzingPayment ? <Loader className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                              Analisis AI (Cek Nominal)
                          </button>
                          {paymentAnalysis && (
                              <div className={`mt-2 p-2 rounded text-xs border ${paymentAnalysis.isValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                  <strong>AI Result:</strong> {paymentAnalysis.reason} ({paymentAnalysis.confidence} Confidence)
                              </div>
                          )}
                      </div>
                      <div className="w-full md:w-1/2 space-y-4">
                           <div className="grid grid-cols-2 gap-2">
                               <div className="bg-gray-50 p-2 rounded">
                                   <label className="text-[10px] uppercase font-bold text-gray-400">Status</label>
                                   <div className={`font-black ${selectedReg.status === 'APPROVED' ? 'text-green-600' : selectedReg.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedReg.status}</div>
                               </div>
                               <div className="bg-gray-50 p-2 rounded">
                                   <label className="text-[10px] uppercase font-bold text-gray-400">Tanggal Daftar</label>
                                   <div className="font-bold text-[#2B427A] text-sm">{new Date(selectedReg.registrationDate).toLocaleDateString()}</div>
                               </div>
                           </div>
                           
                           {/* Custom Data Display */}
                           {selectedReg.customData && (
                               <div className="bg-gray-50 p-3 rounded border border-gray-100 max-h-40 overflow-y-auto">
                                   <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Data Tambahan</label>
                                   <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{
                                      Object.entries(JSON.parse(selectedReg.customData)).map(([k, v]) => (
                                          <div key={k} className="mb-1"><span className="font-bold">{k}:</span> {typeof v === 'object' ? 'File Uploaded' : String(v)}</div>
                                      ))
                                   }</pre>
                               </div>
                           )}

                           <div className="pt-4 space-y-2">
                               {selectedReg.status !== 'APPROVED' && (
                                   <button onClick={() => handleUpdateRegStatus(selectedReg.id, RegistrationStatus.APPROVED)} className="w-full py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600 flex items-center justify-center gap-2">
                                       <Check className="w-4 h-4"/> Setujui Pendaftaran
                                   </button>
                               )}
                               {selectedReg.status !== 'REJECTED' && (
                                   <button onClick={() => handleUpdateRegStatus(selectedReg.id, RegistrationStatus.REJECTED)} className="w-full py-2 bg-red-100 text-red-600 border border-red-200 rounded font-bold hover:bg-red-200 flex items-center justify-center gap-2">
                                       <XCircle className="w-4 h-4"/> Tolak Pendaftaran
                                   </button>
                               )}
                               {selectedReg.status === 'APPROVED' && (
                                   <button onClick={() => handleSendCert(selectedReg.id)} disabled={sendingCertId === selectedReg.id} className="w-full py-2 bg-[#2B427A] text-white rounded font-bold hover:bg-[#0B1CDE] flex items-center justify-center gap-2 disabled:opacity-50">
                                       {sendingCertId === selectedReg.id ? <Loader className="w-4 h-4 animate-spin"/> : <Award className="w-4 h-4"/>}
                                       Kirim Email Sertifikat
                                   </button>
                               )}
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
      <style>{`
        @keyframes scale-up { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
    