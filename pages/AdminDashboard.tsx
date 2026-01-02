import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw, LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, Settings as SettingsIcon } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate, getUserSession } from '../services/api';
import { generateEventDescription } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus } from '../types';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'registrations' | 'settings'>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCert, setProcessingCert] = useState<string | null>(null);
  const navigate = useNavigate();
  const session = getUserSession();
  
  // New Event Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    category: EventCategory.SEMINAR,
    price: 0,
    maxParticipants: 100
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  
  // Settings
  const [scriptUrl, setScriptUrl] = useState(getApiUrl());
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    // Auth Check
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
      const [evts, regs] = await Promise.all([fetchEvents(), fetchRegistrations()]);
      setEvents(evts || []);
      setRegistrations(regs || []);
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!newEvent.title) {
        alert("Mohon masukkan judul terlebih dahulu");
        return;
    }
    setGeneratingDesc(true);
    const desc = await generateEventDescription(
        newEvent.title, 
        newEvent.category || "General", 
        `Lokasi: ${newEvent.location}, Tanggal: ${newEvent.date}`
    );
    setNewEvent({...newEvent, description: desc});
    setGeneratingDesc(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerFile) {
        alert("Gambar banner diperlukan");
        return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(bannerFile);
    reader.onload = async () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        
        try {
            await createEvent(newEvent as any, base64);
            setShowCreateModal(false);
            loadData();
            alert("Acara berhasil dibuat!");
        } catch (err: any) {
            alert("Gagal: " + err.message);
        }
    };
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try {
        await updateRegistrationStatus(id, status);
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
        alert("Gagal memperbarui status");
    }
  };

  const handleSendCertificate = async (id: string) => {
    setProcessingCert(id);
    try {
      await sendCertificate(id);
      alert("Sertifikat berhasil dikirim melalui email!");
    } catch (e: any) {
      alert("Gagal mengirim sertifikat: " + e.message);
    } finally {
      setProcessingCert(null);
    }
  };

  const copyLink = (eventId: string) => {
    const url = `${window.location.origin}/#/event/${eventId}`;
    navigator.clipboard.writeText(url);
    alert("Tautan acara disalin ke papan klip!");
  };

  const saveSettings = () => {
    setApiUrl(scriptUrl);
    alert("URL API Disimpan. Memuat ulang data...");
    loadData();
  };
  
  const testConnection = async () => {
    if (!scriptUrl) {
        alert("Mohon masukkan URL terlebih dahulu.");
        return;
    }
    setTestingConnection(true);
    setApiUrl(scriptUrl);
    try {
        await fetchEvents();
        alert("Sukses! Backend terhubung.");
        loadData();
    } catch (e: any) {
        alert("Koneksi gagal: " + e.message);
    } finally {
        setTestingConnection(false);
    }
  };

  const chartData = events.map(e => ({
    name: e.title ? (e.title.length > 10 ? e.title.substring(0, 10) + '...' : e.title) : 'Tanpa Judul',
    Participants: e.currentParticipants || 0
  }));

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] flex items-center justify-between hover:translate-y-1 hover:shadow-none transition-all">
          <div>
            <div className="text-gray-500 text-xs font-black uppercase tracking-wide mb-1">Total Acara</div>
            <div className="text-4xl font-black text-[#2B427A]">{events.length}</div>
          </div>
          <div className="w-12 h-12 bg-[#DFFF00] text-[#2B427A] rounded-lg border-2 border-[#2B427A] flex items-center justify-center">
             <CalendarIcon className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] flex items-center justify-between hover:translate-y-1 hover:shadow-none transition-all">
           <div>
            <div className="text-gray-500 text-xs font-black uppercase tracking-wide mb-1">Menunggu Konfirmasi</div>
            <div className="text-4xl font-black text-[#0B1CDE]">
                {registrations.filter(r => r.status === RegistrationStatus.PENDING).length}
            </div>
           </div>
           <div className="w-12 h-12 bg-[#2B427A] text-white rounded-lg border-2 border-[#2B427A] flex items-center justify-center">
             <Clock className="w-6 h-6" />
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] flex items-center justify-between hover:translate-y-1 hover:shadow-none transition-all">
          <div>
            <div className="text-gray-500 text-xs font-black uppercase tracking-wide mb-1">Total Peserta</div>
            <div className="text-4xl font-black text-[#2B427A]">
                {events.reduce((acc, curr) => acc + (curr.currentParticipants || 0), 0)}
            </div>
          </div>
          <div className="w-12 h-12 bg-[#0B1CDE] text-white rounded-lg border-2 border-[#2B427A] flex items-center justify-center">
             <UsersIcon className="w-6 h-6" />
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A]">
        <h3 className="text-xl font-black mb-6 text-[#2B427A] uppercase tracking-tight">Statistik Partisipasi</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#2B427A', fontSize: 12, fontWeight: 700}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#2B427A', fontSize: 12, fontWeight: 700}} />
              <Tooltip 
                cursor={{fill: '#F0F9FF'}} 
                contentStyle={{borderRadius: '8px', border: '2px solid #2B427A', boxShadow: '4px 4px 0px 0px #2B427A', fontWeight: 'bold', color: '#2B427A'}} 
              />
              <Bar dataKey="Participants" fill="#0B1CDE" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderRegistrations = () => (
    <div className="bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden animate-fade-in">
        <div className="p-6 border-b-2 border-[#2B427A] flex justify-between items-center bg-[#F0F9FF]">
            <h2 className="text-xl font-black text-[#2B427A] uppercase tracking-tight">Manajemen Pendaftaran</h2>
            <div className="text-sm font-bold text-[#2B427A] bg-white px-3 py-1 rounded border-2 border-[#2B427A]">Total: {registrations.length}</div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-[#2B427A] text-white text-xs font-black uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Acara</th>
                        <th className="px-6 py-4">Pengguna</th>
                        <th className="px-6 py-4">Bukti</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#2B427A]/10">
                    {registrations.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">Belum ada pendaftaran yang masuk.</td>
                        </tr>
                    ) : (
                        registrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-[#F0F9FF] transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-[#2B427A]">{reg.eventTitle}</td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-[#2B427A]">{reg.userName}</div>
                                <div className="text-xs text-gray-500 font-medium">{reg.userEmail}</div>
                            </td>
                            <td className="px-6 py-4">
                                <a href={reg.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-[#2B427A] rounded-lg text-[#2B427A] text-xs font-bold hover:bg-[#DFFF00] hover:text-[#2B427A] transition-colors shadow-[2px_2px_0px_0px_#2B427A]">
                                    <ImageIcon className="w-3 h-3" /> LIHAT
                                </a>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-3 py-1 text-xs font-black rounded-lg tracking-wide uppercase border-2
                                    ${reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700 border-green-700' : 
                                      reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-700' : 
                                      'bg-yellow-100 text-yellow-700 border-yellow-700'}`}>
                                    {reg.status === RegistrationStatus.APPROVED ? 'DISETUJUI' : 
                                     reg.status === RegistrationStatus.REJECTED ? 'DITOLAK' : 'MENUNGGU'}
                                </span>
                            </td>
                            <td className="px-6 py-4 flex items-center gap-2">
                                {reg.status === RegistrationStatus.PENDING && (
                                    <>
                                        <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.APPROVED)} className="p-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border-2 border-green-600 rounded-lg transition-colors" title="Setujui"><CheckCircle className="w-5 h-5"/></button>
                                        <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.REJECTED)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border-2 border-red-600 rounded-lg transition-colors" title="Tolak"><XCircle className="w-5 h-5"/></button>
                                    </>
                                )}
                                {reg.status === RegistrationStatus.APPROVED && (
                                  <button 
                                    onClick={() => handleSendCertificate(reg.id)} 
                                    disabled={processingCert === reg.id}
                                    className={`p-2 rounded-lg bg-[#0B1CDE] text-white hover:bg-[#DFFF00] hover:text-[#2B427A] border-2 border-[#2B427A] transition-colors shadow-[2px_2px_0px_0px_#2B427A] ${processingCert === reg.id ? 'opacity-50' : ''}`}
                                    title="Kirim Sertifikat"
                                  >
                                    {processingCert === reg.id ? <Loader className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                                  </button>
                                )}
                            </td>
                        </tr>
                    )))}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#2B427A] border-r-2 border-[#2B427A] h-auto md:min-h-screen sticky top-0 text-white z-10">
        <div className="p-8 border-b-2 border-white/10">
          <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-tighter">
            ADMIN PANEL <div className="w-3 h-3 bg-[#DFFF00]"></div>
          </h1>
          <p className="text-xs text-blue-200 mt-2 font-bold tracking-widest uppercase">Bisnis Digital Dashboard</p>
          <div className="mt-4 text-xs bg-[#0B1CDE] p-2 rounded text-white">
            Login sebagai: <br/> {session?.email}
          </div>
        </div>
        <nav className="p-6 space-y-3">
            {[
                {id: 'overview', label: 'Ringkasan', icon: LayoutDashboard},
                {id: 'events', label: 'Acara', icon: CalendarIcon},
                {id: 'registrations', label: 'Pendaftaran', icon: UsersIcon},
                {id: 'settings', label: 'Pengaturan', icon: SettingsIcon},
            ].map(item => (
                <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)} 
                    className={`w-full text-left px-5 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 font-black border-2 uppercase tracking-wide ${activeTab === item.id ? 'bg-[#DFFF00] text-[#2B427A] border-[#2B427A] shadow-[4px_4px_0px_0px_#000] transform -translate-y-1' : 'text-white border-transparent hover:bg-white/10'}`}
                >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#2B427A]' : 'text-[#DFFF00]'}`} />
                    {item.label}
                </button>
            ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {loading && <div className="mb-6 bg-[#DFFF00] text-[#2B427A] px-4 py-2 rounded-lg inline-flex items-center gap-2 animate-pulse font-black border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A]"><Loader className="w-4 h-4 animate-spin"/> MENYINKRONKAN DATABASE...</div>}

        {activeTab === 'overview' && renderOverview()}
        
        {activeTab === 'registrations' && renderRegistrations()}

        {activeTab === 'settings' && (
            <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] max-w-2xl animate-fade-in">
                <h2 className="text-xl font-black mb-6 text-[#2B427A] uppercase tracking-tight">Konfigurasi Sistem</h2>
                <div className="mb-6">
                    <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">URL Web App Google Apps Script</label>
                    <input 
                        type="text" 
                        value={scriptUrl} 
                        onChange={(e) => setScriptUrl(e.target.value)}
                        className="w-full px-5 py-3 border-2 border-[#2B427A] rounded-lg focus:bg-[#F0F9FF] focus:outline-none transition-all font-mono text-sm font-bold text-[#2B427A]"
                        placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <p className="text-xs text-gray-500 mt-3 font-medium">
                        Deploy kode backend sebagai Web App dengan akses 'Anyone'. Tempel URL hasil deploy di sini.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button onClick={saveSettings} className="bg-[#0B1CDE] text-white px-6 py-3 rounded-lg font-black hover:bg-[#2B427A] flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#2B427A] border-2 border-[#2B427A] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#2B427A]">
                        SIMPAN KONFIGURASI
                    </button>
                    <button onClick={testConnection} disabled={testingConnection} className="bg-white border-2 border-[#2B427A] text-[#2B427A] px-6 py-3 rounded-lg font-black hover:bg-[#DFFF00] flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#2B427A]">
                        {testingConnection ? <Loader className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />}
                        {testingConnection ? 'MENGHUBUNGKAN...' : 'TES KONEKSI'}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'events' && (
            <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-[#2B427A] uppercase tracking-tighter">Acara Anda</h2>
                        <p className="text-gray-500 mt-1 font-bold">Kelola semua acara yang aktif dan draf</p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] px-6 py-3 rounded-lg font-black flex items-center gap-2 hover:bg-white transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none">
                        <Plus className="w-5 h-5" /> BUAT ACARA
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="bg-white p-6 rounded-xl shadow-[6px_6px_0px_0px_#2B427A] border-2 border-[#2B427A] flex justify-between items-start hover:shadow-[8px_8px_0px_0px_#0B1CDE] transition-all group">
                            <div className="flex gap-4">
                                <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border-2 border-[#2B427A]">
                                    {event.bannerUrl ? (
                                        <img src={event.bannerUrl} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6"/></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-[#2B427A] group-hover:text-[#0B1CDE] transition-colors uppercase leading-tight mb-1">{event.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 font-bold">{new Date(event.date).toLocaleDateString('id-ID')}</p>
                                    <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border-2 tracking-wider ${event.isOpen ? 'bg-green-100 text-green-700 border-green-700' : 'bg-gray-100 text-gray-600 border-gray-600'}`}>
                                        {event.isOpen ? 'BUKA' : 'TUTUP'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => copyLink(event.id)} className="p-2 text-gray-400 hover:text-[#0B1CDE] hover:bg-[#F0F9FF] border-2 border-transparent hover:border-[#0B1CDE] rounded-lg transition-all" title="Salin Tautan">
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#2B427A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-4 border-[#DFFF00]">
                <div className="flex justify-between items-center mb-8 border-b-2 border-gray-100 pb-4">
                    <h2 className="text-2xl font-black text-[#2B427A] uppercase">Buat Acara Baru</h2>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors border-2 border-transparent hover:border-red-500"><XCircle className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleCreateEvent} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Judul Acara</label>
                            <input type="text" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kategori</label>
                            <select className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all bg-white font-bold" onChange={e => setNewEvent({...newEvent, category: e.target.value as EventCategory})}>
                                {Object.values(EventCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Tanggal</label>
                            <input type="date" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Waktu</label>
                            <input type="time" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Lokasi</label>
                        <input type="text" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" placeholder="Misal: Zoom Meeting atau Aula Kampus" onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-black text-[#2B427A] uppercase">Deskripsi</label>
                            <button 
                                type="button" 
                                onClick={handleGenerateDescription}
                                disabled={generatingDesc}
                                className="text-xs flex items-center gap-1.5 text-[#2B427A] bg-[#DFFF00] border-2 border-[#2B427A] px-3 py-1 rounded font-black hover:bg-white disabled:opacity-50 transition-all shadow-[2px_2px_0px_0px_#2B427A]"
                            >
                                <Sparkles className="w-3 h-3" /> {generatingDesc ? 'MEMPROSES...' : 'AI GENERATE'}
                            </button>
                        </div>
                        <textarea 
                            rows={4} 
                            required 
                            className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all resize-none font-medium" 
                            placeholder="Jelaskan detail acara Anda..."
                            value={newEvent.description || ''}
                            onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Harga (IDR)</label>
                            <input type="number" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" onChange={e => setNewEvent({...newEvent, price: Number(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Maks Peserta</label>
                            <input type="number" required className="w-full border-2 border-[#2B427A]/20 rounded-lg p-3 focus:border-[#0B1CDE] outline-none transition-all font-bold" onChange={e => setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Gambar Banner</label>
                         <div className="border-2 border-dashed border-[#2B427A]/20 rounded-lg p-6 text-center hover:border-[#0B1CDE] hover:bg-[#F0F9FF] transition-colors cursor-pointer relative bg-gray-50">
                             <input type="file" accept="image/*" required onChange={e => setBannerFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                             <div className="flex flex-col items-center">
                                <ImageIcon className="w-8 h-8 text-gray-400 mb-2"/>
                                <span className="text-sm font-bold text-gray-500">{bannerFile ? bannerFile.name : "KLIK UNTUK UNGGAH GAMBAR"}</span>
                             </div>
                         </div>
                    </div>

                    <div className="pt-6 flex gap-4 justify-end border-t-2 border-gray-100 mt-6">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">BATAL</button>
                        <button type="submit" className="px-6 py-3 bg-[#0B1CDE] text-white rounded-lg font-black hover:bg-[#2B427A] transition-all shadow-[4px_4px_0px_0px_#2B427A] border-2 border-[#2B427A]">SIMPAN ACARA</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;