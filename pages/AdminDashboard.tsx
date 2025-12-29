import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Search, CheckCircle, XCircle, Clock, Sparkles, Image as ImageIcon, Copy, Award, Loader, RefreshCw } from 'lucide-react';
import { createEvent, fetchEvents, fetchRegistrations, getApiUrl, setApiUrl, updateRegistrationStatus, sendCertificate } from '../services/api';
import { generateEventDescription } from '../services/geminiService';
import { Event, EventCategory, Registration, RegistrationStatus } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'registrations' | 'settings'>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCert, setProcessingCert] = useState<string | null>(null);
  
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
    // Only load if a URL is configured
    if (getApiUrl()) {
        loadData();
    }
  }, []);

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
    
    // Simple base64 conversion
    const reader = new FileReader();
    reader.readAsDataURL(bannerFile);
    reader.onload = async () => {
        const result = reader.result as string;
        // Strip prefix if needed, though backend handles it now
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
        // Optimistic update
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
    setApiUrl(scriptUrl); // Temporarily save to test
    try {
        await fetchEvents();
        alert("Sukses! Backend terhubung dan terinisialisasi.");
        loadData();
    } catch (e: any) {
        alert("Koneksi gagal: " + e.message);
    } finally {
        setTestingConnection(false);
    }
  };

  // Safe Charts Data Mapping to avoid crash if title is missing
  const chartData = events.map(e => ({
    name: e.title ? (e.title.length > 10 ? e.title.substring(0, 10) + '...' : e.title) : 'Tanpa Judul',
    Participants: e.currentParticipants || 0
  }));

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Total Acara</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{events.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Menunggu Persetujuan</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            {registrations.filter(r => r.status === RegistrationStatus.PENDING).length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Total Peserta</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">
            {events.reduce((acc, curr) => acc + (curr.currentParticipants || 0), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4">Ringkasan Partisipasi</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Participants" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderRegistrations = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
            <h2 className="text-lg font-bold">Manajemen Pendaftaran</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-3">Acara</th>
                        <th className="px-6 py-3">Pengguna</th>
                        <th className="px-6 py-3">Bukti</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {registrations.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Tidak ada pendaftaran ditemukan.</td>
                        </tr>
                    ) : (
                        registrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium">{reg.eventTitle}</td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{reg.userName}</div>
                                <div className="text-xs text-gray-500">{reg.userEmail}</div>
                            </td>
                            <td className="px-6 py-4">
                                <a href={reg.proofUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
                                    <ImageIcon className="w-4 h-4" /> Lihat
                                </a>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full 
                                    ${reg.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                      reg.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-700' : 
                                      'bg-yellow-100 text-yellow-700'}`}>
                                    {reg.status === RegistrationStatus.APPROVED ? 'DISETUJUI' : 
                                     reg.status === RegistrationStatus.REJECTED ? 'DITOLAK' : 'MENUNGGU'}
                                </span>
                            </td>
                            <td className="px-6 py-4 flex items-center gap-2">
                                {reg.status === RegistrationStatus.PENDING && (
                                    <>
                                        <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.APPROVED)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Setujui"><CheckCircle className="w-5 h-5"/></button>
                                        <button onClick={() => handleStatusUpdate(reg.id, RegistrationStatus.REJECTED)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Tolak"><XCircle className="w-5 h-5"/></button>
                                    </>
                                )}
                                {reg.status === RegistrationStatus.APPROVED && (
                                  <button 
                                    onClick={() => handleSendCertificate(reg.id)} 
                                    disabled={processingCert === reg.id}
                                    className={`p-1 rounded text-indigo-600 hover:bg-indigo-50 ${processingCert === reg.id ? 'opacity-50' : ''}`}
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r h-auto md:min-h-screen">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-indigo-600">Panel Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
            <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Ringkasan</button>
            <button onClick={() => setActiveTab('events')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'events' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Acara</button>
            <button onClick={() => setActiveTab('registrations')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'registrations' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Pendaftaran</button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Pengaturan</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {loading && <div className="mb-4 text-indigo-600 animate-pulse">Menyinkronkan dengan database...</div>}

        {activeTab === 'overview' && renderOverview()}
        
        {activeTab === 'registrations' && renderRegistrations()}

        {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-xl shadow-sm max-w-2xl">
                <h2 className="text-lg font-bold mb-4">Konfigurasi</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Aplikasi Web Google Apps Script</label>
                    <input 
                        type="text" 
                        value={scriptUrl} 
                        onChange={(e) => setScriptUrl(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <p className="text-xs text-gray-500 mt-2">Deploy Code.gs yang disediakan sebagai Aplikasi Web (Execute as: Me, Access: Anyone) dan tempel URL di sini.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={saveSettings} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                        Simpan Konfigurasi
                    </button>
                    <button onClick={testConnection} disabled={testingConnection} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        {testingConnection ? <Loader className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />}
                        {testingConnection ? 'Menghubungkan...' : 'Tes Koneksi'}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'events' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Acara Anda</h2>
                    <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                        <Plus className="w-4 h-4" /> Buat Acara
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{event.title}</h3>
                                <p className="text-sm text-gray-500 mb-2">{new Date(event.date).toLocaleDateString('id-ID')}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${event.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {event.isOpen ? 'Buka' : 'Tutup'}
                                </span>
                            </div>
                            <button onClick={() => copyLink(event.id)} className="text-gray-400 hover:text-indigo-600" title="Salin Tautan">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Buat Acara Baru</h2>
                    <button onClick={() => setShowCreateModal(false)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>

                <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Judul</label>
                            <input type="text" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Kategori</label>
                            <select className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, category: e.target.value as EventCategory})}>
                                {Object.values(EventCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium mb-1">Tanggal</label>
                            <input type="date" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Waktu</label>
                            <input type="time" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Lokasi</label>
                        <input type="text" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Deskripsi</label>
                            <button 
                                type="button" 
                                onClick={handleGenerateDescription}
                                disabled={generatingDesc}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                                <Sparkles className="w-3 h-3" /> {generatingDesc ? 'Membuat...' : 'Buat Otomatis dengan Gemini'}
                            </button>
                        </div>
                        <textarea 
                            rows={4} 
                            required 
                            className="w-full border rounded p-2" 
                            value={newEvent.description || ''}
                            onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Harga (IDR)</label>
                            <input type="number" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, price: Number(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Maks Peserta</label>
                            <input type="number" required className="w-full border rounded p-2" onChange={e => setNewEvent({...newEvent, maxParticipants: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium mb-1">Gambar Banner</label>
                         <input type="file" accept="image/*" required onChange={e => setBannerFile(e.target.files?.[0] || null)} className="w-full" />
                    </div>

                    <div className="pt-4 flex gap-3 justify-end">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Buat Acara</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;