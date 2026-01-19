import React, { useState, useEffect } from 'react';
import { Search, Ticket, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Calendar, MapPin, ArrowRight, Loader, History, LayoutDashboard, QrCode, Download, MessageCircle } from 'lucide-react';
import { fetchUserRegistrations, fetchEvents, sendCertificate, getUserSession, createSlug, formatTime } from '../services/api';
import { Registration, RegistrationStatus, Event } from '../types';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import CustomAlert from '../components/CustomAlert';

const UserDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<(Registration & { eventDetails?: Event })[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [certLoading, setCertLoading] = useState<string | null>(null);
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(null);
  
  // Alert State
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };
  
  const navigate = useNavigate();
  const session = getUserSession();
  
  useEffect(() => {
    // Auth Check
    if (!session || session.role !== 'USER') {
        // If admin tries to access, redirect to admin. If no session, login.
        if (session?.role === 'ADMIN') navigate('/dashboard/admin');
        else navigate('/login');
        return;
    }

    const loadData = async () => {
        try {
            const [userRegs, allEvents] = await Promise.all([
                fetchUserRegistrations(session.email),
                fetchEvents()
            ]);

            const enrichedTickets = userRegs.map(reg => ({
                ...reg,
                eventDetails: allEvents.find(ev => ev.id === reg.eventId)
            }));

            // Sort newest first
            setTickets(enrichedTickets.sort((a, b) => 
                new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
            ));
        } catch (error) {
            console.error("Failed to fetch tickets", error);
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, [navigate]);

  const requestCertificate = async (regId: string) => {
    setCertLoading(regId);
    try {
      await sendCertificate(regId);
      showAlert('success', 'Terkirim', 'Sertifikat telah dikirim ke email Anda!');
    } catch (e: any) {
      showAlert('error', 'Gagal', "Gagal mengirim sertifikat. " + e.message);
    } finally {
      setCertLoading(null);
    }
  };

  const handleDownloadTicket = async (ticket: Registration & { eventDetails?: Event }) => {
      setDownloadingTicket(ticket.id);
      
      // Delay slightly to ensure the hidden element is rendered if it depends on state
      setTimeout(async () => {
          try {
              const element = document.getElementById(`ticket-export-${ticket.id}`);
              if (!element) throw new Error("Ticket element not found");

              const canvas = await html2canvas(element, {
                  scale: 3, // High quality
                  backgroundColor: null,
                  useCORS: true
              });

              const link = document.createElement('a');
              link.download = `E-Ticket_${ticket.eventTitle.substring(0, 10)}_${ticket.userName.split(' ')[0]}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
          } catch (err) {
              console.error("Download failed:", err);
              showAlert('error', 'Gagal', "Gagal mengunduh tiket.");
          } finally {
              setDownloadingTicket(null);
          }
      }, 100);
  };

  // Helper to check if certificate button should be shown (24 hours after event date)
  const isCertificateUnlocked = (eventDateStr: string | undefined) => {
      if (!eventDateStr) return false;
      const eventDate = new Date(eventDateStr);
      // Logic: Event Date + 24 Hours
      const unlockDate = new Date(eventDate);
      unlockDate.setHours(eventDate.getHours() + 24);
      
      return new Date() >= unlockDate;
  };

  const getUnlockDateString = (eventDateStr: string | undefined) => {
      if (!eventDateStr) return "-";
      const eventDate = new Date(eventDateStr);
      const unlockDate = new Date(eventDate);
      unlockDate.setHours(eventDate.getHours() + 24); // H+1
      return unlockDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-700';
      case RegistrationStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-700';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-700';
    }
  };

  const getStatusIcon = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.APPROVED: return <CheckCircle className="w-5 h-5" />;
      case RegistrationStatus.REJECTED: return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.APPROVED: return 'DISETUJUI';
      case RegistrationStatus.REJECTED: return 'DITOLAK';
      default: return 'MENUNGGU';
    }
  };

  // Filter Tickets Logic
  const activeTickets = tickets.filter(t => {
      if (!t.eventDetails) return false;
      
      // Jika tiket sudah CHECKED_IN, pindahkan ke history (bukan aktif lagi)
      if (t.checkInStatus === 'CHECKED_IN') return false;

      const eventDate = new Date(t.eventDetails.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      return eventDate >= now; // Upcoming or today
  });

  const historyTickets = tickets.filter(t => {
      // Jika tiket sudah CHECKED_IN, masuk ke history/selesai
      if (t.checkInStatus === 'CHECKED_IN') return true;

      if (!t.eventDetails) return true; // Keep deleted events in history
      const eventDate = new Date(t.eventDetails.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      return eventDate < now; // Past events
  });

  const displayedTickets = activeTab === 'active' ? activeTickets : historyTickets;

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <Loader className="w-10 h-10 animate-spin text-[#2B427A]" />
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#DFFF00] text-[#2B427A] px-4 py-1 rounded-full text-sm font-black mb-4 border border-[#2B427A]">
             AKUN: {session?.email}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#2B427A] mb-4 uppercase tracking-tighter">PORTAL TIKET SAYA</h1>
          <p className="text-lg text-gray-500 font-bold max-w-lg mx-auto">Kelola tiket acara yang akan datang dan lihat riwayat acara Anda.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
            <button 
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-black transition-all ${activeTab === 'active' ? 'bg-[#2B427A] text-white border-[#2B427A] shadow-[4px_4px_0px_0px_#DFFF00]' : 'bg-white text-[#2B427A] border-[#2B427A] hover:bg-gray-50'}`}
            >
                <Ticket className="w-5 h-5"/> TIKET AKTIF ({activeTickets.length})
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-black transition-all ${activeTab === 'history' ? 'bg-[#2B427A] text-white border-[#2B427A] shadow-[4px_4px_0px_0px_#DFFF00]' : 'bg-white text-[#2B427A] border-[#2B427A] hover:bg-gray-50'}`}
            >
                <History className="w-5 h-5"/> RIWAYAT SELESAI ({historyTickets.length})
            </button>
        </div>

        {displayedTickets.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-[#2B427A] shadow-[8px_8px_0px_0px_#DFFF00]">
            <div className="w-20 h-20 bg-gray-100 rounded-full border-2 border-[#2B427A] flex items-center justify-center mx-auto mb-6">
                <Ticket className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-[#2B427A] mb-2 uppercase">
                {activeTab === 'active' ? "Tidak ada tiket aktif" : "Belum ada riwayat"}
            </h3>
            <p className="text-gray-500 font-medium">
                {activeTab === 'active' ? "Anda belum mendaftar di acara yang akan datang." : "Anda belum pernah mengikuti acara sebelumnya."}
            </p>
            {activeTab === 'active' && (
                <a href="#/events" className="mt-6 inline-block bg-[#2B427A] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#DFFF00] hover:text-[#2B427A] transition-colors">Cari Acara Baru</a>
            )}
          </div>
        )}

        <div className="grid gap-8">
          {displayedTickets.map((ticket) => (
            <div key={ticket.id} className="group bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] overflow-hidden hover:shadow-[8px_8px_0px_0px_#0B1CDE] transition-all duration-300">
              
              {/* HIDDEN TICKET EXPORT TEMPLATE (Portrait / B3 Style scaled down) */}
              <div id={`ticket-export-${ticket.id}`} style={{ position: 'fixed', top: -9999, left: -9999, width: '375px', height: '600px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, backgroundColor: '#2B427A', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', borderBottom: '4px dashed #DFFF00' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.3, backgroundImage: `url(${ticket.eventDetails?.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(100%)' }}></div>
                      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', color: 'white' }}>
                          <div style={{ backgroundColor: '#DFFF00', color: '#2B427A', padding: '5px 15px', fontWeight: 900, fontSize: '14px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px' }}>E-TICKET</div>
                          <h1 style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.1, marginBottom: '5px', textTransform: 'uppercase' }}>{ticket.eventTitle}</h1>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#DFFF00', marginTop: '10px' }}>{ticket.eventDetails ? new Date(ticket.eventDetails.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) : ''}</p>
                      </div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'white', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {/* Cutout Circles */}
                      <div style={{ position: 'absolute', top: -15, left: -15, width: 30, height: 30, borderRadius: '50%', backgroundColor: '#F8FAFC' }}></div>
                      <div style={{ position: 'absolute', top: -15, right: -15, width: 30, height: 30, borderRadius: '50%', backgroundColor: '#F8FAFC' }}></div>
                      
                      <div style={{ width: '100%', textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>PEMEGANG TIKET</p>
                          <h2 style={{ fontSize: '24px', color: '#2B427A', fontWeight: 900, margin: '5px 0 20px 0', textTransform: 'uppercase' }}>{ticket.userName}</h2>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left', backgroundColor: '#F0F9FF', padding: '15px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                              <div>
                                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8' }}>LOKASI</p>
                                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#2B427A' }}>{ticket.eventDetails?.location}</p>
                              </div>
                              <div>
                                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8' }}>WAKTU</p>
                                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#2B427A' }}>{formatTime(ticket.eventDetails?.time)} WIB</p>
                              </div>
                          </div>
                      </div>

                      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '2px solid #2B427A', boxShadow: '4px 4px 0px 0px #0B1CDE' }}>
                          <QRCode value={ticket.id} size={120} fgColor="#2B427A" />
                      </div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: '#CBD5E1', marginTop: '10px' }}>ID: {ticket.id}</p>
                  </div>
              </div>
              {/* END HIDDEN TEMPLATE */}

              <div className="flex flex-col md:flex-row h-full">
                {/* Event Image (Left) */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-[#2B427A] relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-[#2B427A] flex-shrink-0">
                  {ticket.eventDetails?.thumbnailUrl || ticket.eventDetails?.bannerUrl ? (
                     <img src={ticket.eventDetails.thumbnailUrl || ticket.eventDetails.bannerUrl} alt="Acara" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 mix-blend-overlay opacity-80" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">EVENT SELESAI/DIHAPUS</div>
                  )}
                  {/* Overlay for small screens */}
                  <div className="absolute top-4 left-4 md:hidden">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border-2 shadow-sm uppercase ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                {/* Ticket Details (Middle) */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-black text-[#2B427A] group-hover:text-[#0B1CDE] transition-colors uppercase leading-none">{ticket.eventTitle}</h3>
                        {/* Status Badge (Desktop) */}
                        <div className="hidden md:block">
                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black border-2 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] ${getStatusColor(ticket.status)}`}>
                                {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                            </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 font-bold mt-4">
                         {ticket.eventDetails && (
                           <>
                             <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#0B1CDE]" /> {new Date(ticket.eventDetails.date).toDateString()} | {formatTime(ticket.eventDetails.time)}</div>
                             <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#0B1CDE]" /> 
                                <a 
                                    href={ticket.eventDetails.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.eventDetails.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#0B1CDE] hover:underline transition-colors"
                                >
                                    {ticket.eventDetails.location}
                                </a>
                             </div>
                           </>
                         )}
                         <div className="pt-2 text-xs text-gray-400 font-mono uppercase tracking-widest">ID: {ticket.id.substring(0,8)}...</div>
                      </div>
                  </div>
                  
                  {ticket.eventDetails && ticket.eventDetails.isOpen && (
                       <a href={`/#/event/${createSlug(ticket.eventDetails.title) || ticket.eventId}`} className="text-sm text-[#2B427A] font-black hover:text-[#0B1CDE] flex items-center gap-1 mt-6 group/link uppercase tracking-wide self-start">
                          LIHAT DETAIL <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                       </a>
                  )}
                </div>

                {/* Actions & QR (Right) */}
                <div className="bg-[#F8FAFC] p-6 flex flex-col justify-center items-center gap-4 border-t-2 md:border-t-0 md:border-l-2 border-[#2B427A] md:w-80">
                    {ticket.status === RegistrationStatus.APPROVED ? (
                        <>
                            {/* QR CODE SECTION */}
                            <div className="text-center w-full">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">STATUS TIKET</span>
                                
                                {ticket.checkInStatus === 'CHECKED_IN' ? (
                                     <span className="text-xl font-black text-green-600 tracking-tighter bg-green-100 px-4 py-2 rounded block w-full border border-green-200">SUDAH CHECK-IN</span>
                                ) : (
                                     <div className="flex flex-col items-center">
                                         <h4 className="text-3xl font-black text-[#0B1CDE] tracking-tighter mb-4">VALID</h4>
                                         {/* Embedded QR Code */}
                                         <div className="bg-white p-2 rounded-lg border-2 border-[#2B427A] shadow-sm">
                                             <QRCode value={ticket.id} size={100} fgColor="#2B427A" />
                                         </div>
                                         <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Scan saat masuk</p>
                                     </div>
                                )}
                            </div>

                            {/* ACTIONS */}
                            <div className="w-full space-y-2 mt-2">
                                {/* NEW: Group Link Button */}
                                {ticket.eventDetails?.groupLink && (
                                    <a 
                                        href={ticket.eventDetails.groupLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 text-sm bg-green-500 text-white border-2 border-green-600 hover:bg-green-600 px-4 py-2 rounded-lg font-black transition-all shadow-sm"
                                    >
                                        <MessageCircle className="w-4 h-4" /> GABUNG GRUP
                                    </a>
                                )}

                                <button 
                                    onClick={() => handleDownloadTicket(ticket)}
                                    disabled={downloadingTicket === ticket.id}
                                    className="w-full flex items-center justify-center gap-2 text-sm bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:bg-[#2B427A] hover:text-[#DFFF00] px-4 py-2 rounded-lg font-black transition-all shadow-sm"
                                >
                                    {downloadingTicket === ticket.id ? <Loader className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                                    {downloadingTicket === ticket.id ? 'MENYIAPKAN...' : 'DOWNLOAD TIKET'}
                                </button>

                                {isCertificateUnlocked(ticket.eventDetails?.date) ? (
                                    <button 
                                        onClick={() => requestCertificate(ticket.id)}
                                        disabled={certLoading === ticket.id}
                                        className="w-full text-sm bg-white border-2 border-[#0B1CDE] text-[#0B1CDE] hover:bg-[#0B1CDE] hover:text-white px-4 py-2 rounded-lg font-black transition-all shadow-sm"
                                    >
                                        {certLoading === ticket.id ? 'MENGIRIM...' : 'KIRIM SERTIFIKAT'}
                                    </button>
                                ) : (
                                    <div className="mt-2 bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 text-center w-full">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Sertifikat Tersedia Mulai</p>
                                        <p className="text-xs font-black text-[#2B427A]">{getUnlockDateString(ticket.eventDetails?.date)}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : ticket.status === RegistrationStatus.REJECTED ? (
                        <div className="text-center text-red-500 font-bold flex flex-col items-center p-4 bg-red-50 border-2 border-red-200 rounded-lg w-full">
                            <AlertTriangle className="w-8 h-8 mb-2" />
                            PENDAFTARAN DITOLAK
                        </div>
                    ) : (
                        <div className="text-center text-yellow-700 font-bold p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg w-full text-sm flex flex-col items-center">
                            <Clock className="w-8 h-8 mb-2 opacity-50"/>
                            MENUNGGU PERSETUJUAN
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;