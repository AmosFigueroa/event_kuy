
import React, { useState, useEffect } from 'react';
import { Search, Ticket, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Calendar, MapPin, ArrowRight, Loader, History, LayoutDashboard, QrCode, Download, Award } from 'lucide-react';
import { fetchUserRegistrations, fetchEvents, getUserSession, createSlug } from '../services/api';
import { Registration, RegistrationStatus, Event } from '../types';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import CustomAlert from '../components/CustomAlert';

const UserDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<(Registration & { eventDetails?: Event })[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
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

  const handleDownloadTicket = async (ticket: Registration & { eventDetails?: Event }) => {
      setDownloadingTicket(ticket.id);
      
      setTimeout(async () => {
          try {
              const element = document.getElementById(`ticket-export-${ticket.id}`);
              if (!element) throw new Error("Ticket element not found");

              const canvas = await html2canvas(element, {
                  scale: 3, 
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

  const isCertificateUnlocked = (eventDateStr: string | undefined) => {
      if (!eventDateStr) return false;
      const eventDate = new Date(eventDateStr);
      const unlockDate = new Date(eventDate);
      unlockDate.setHours(eventDate.getHours() + 24);
      return new Date() >= unlockDate;
  };

  const getUnlockDateString = (eventDateStr: string | undefined) => {
      if (!eventDateStr) return "-";
      const eventDate = new Date(eventDateStr);
      const unlockDate = new Date(eventDate);
      unlockDate.setHours(eventDate.getHours() + 24); 
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
      case RegistrationStatus.APPROVED: return <CheckCircle className="w-4 h-4" />;
      case RegistrationStatus.REJECTED: return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
      if (t.checkInStatus === 'CHECKED_IN') return false;
      const eventDate = new Date(t.eventDetails.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      return eventDate >= now; 
  });

  const historyTickets = tickets.filter(t => {
      if (t.checkInStatus === 'CHECKED_IN') return true;
      if (!t.eventDetails) return true; 
      const eventDate = new Date(t.eventDetails.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      return eventDate < now; 
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
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-block bg-[#DFFF00] text-[#2B427A] px-3 py-1 rounded-full text-xs font-black mb-3 border border-[#2B427A]">
             AKUN: {session?.email}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-[#2B427A] mb-2 uppercase tracking-tighter">PORTAL TIKET</h1>
          <p className="text-sm md:text-lg text-gray-500 font-bold max-w-lg mx-auto">Kelola tiket acara Anda di sini.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-3 mb-6 justify-center">
            <button 
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm md:px-6 md:py-3 rounded-xl border-2 font-black transition-all ${activeTab === 'active' ? 'bg-[#2B427A] text-white border-[#2B427A] shadow-[3px_3px_0px_0px_#DFFF00]' : 'bg-white text-[#2B427A] border-[#2B427A] hover:bg-gray-50'}`}
            >
                <Ticket className="w-4 h-4"/> AKTIF ({activeTickets.length})
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm md:px-6 md:py-3 rounded-xl border-2 font-black transition-all ${activeTab === 'history' ? 'bg-[#2B427A] text-white border-[#2B427A] shadow-[3px_3px_0px_0px_#DFFF00]' : 'bg-white text-[#2B427A] border-[#2B427A] hover:bg-gray-50'}`}
            >
                <History className="w-4 h-4"/> RIWAYAT ({historyTickets.length})
            </button>
        </div>

        {displayedTickets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#DFFF00]">
            <div className="w-16 h-16 bg-gray-100 rounded-full border-2 border-[#2B427A] flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-[#2B427A] mb-1 uppercase">
                {activeTab === 'active' ? "Tidak ada tiket aktif" : "Belum ada riwayat"}
            </h3>
            <p className="text-xs text-gray-500 font-medium px-4">
                {activeTab === 'active' ? "Anda belum mendaftar di acara yang akan datang." : "Anda belum pernah mengikuti acara sebelumnya."}
            </p>
            {activeTab === 'active' && (
                <a href="#/events" className="mt-4 inline-block bg-[#2B427A] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-[#DFFF00] hover:text-[#2B427A] transition-colors">Cari Acara</a>
            )}
          </div>
        )}

        <div className="grid gap-6">
          {displayedTickets.map((ticket) => (
            <div key={ticket.id} className="group bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] overflow-hidden hover:shadow-[6px_6px_0px_0px_#0B1CDE] transition-all duration-300">
              
              {/* HIDDEN TICKET EXPORT (Same as before) */}
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
                      <div style={{ position: 'absolute', top: -15, left: -15, width: 30, height: 30, borderRadius: '50%', backgroundColor: '#F8FAFC' }}></div>
                      <div style={{ position: 'absolute', top: -15, right: -15, width: 30, height: 30, borderRadius: '50%', backgroundColor: '#F8FAFC' }}></div>
                      <div style={{ width: '100%', textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>PEMEGANG TIKET</p>
                          <h2 style={{ fontSize: '24px', color: '#2B427A', fontWeight: 900, margin: '5px 0 20px 0', textTransform: 'uppercase' }}>{ticket.userName}</h2>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left', backgroundColor: '#F0F9FF', padding: '15px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                              <div><p style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8' }}>LOKASI</p><p style={{ fontSize: '11px', fontWeight: 800, color: '#2B427A' }}>{ticket.eventDetails?.location}</p></div>
                              <div><p style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8' }}>WAKTU</p><p style={{ fontSize: '11px', fontWeight: 800, color: '#2B427A' }}>{ticket.eventDetails?.time} WIB</p></div>
                          </div>
                      </div>
                      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '2px solid #2B427A', boxShadow: '4px 4px 0px 0px #0B1CDE' }}><QRCode value={ticket.id} size={120} fgColor="#2B427A" /></div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: '#CBD5E1', marginTop: '10px' }}>ID: {ticket.id}</p>
                  </div>
              </div>

              <div className="flex flex-col md:flex-row h-full">
                {/* Event Image (Left) - Smaller on mobile */}
                <div className="w-full md:w-64 h-32 md:h-auto bg-[#2B427A] relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-[#2B427A] flex-shrink-0">
                  {ticket.eventDetails?.thumbnailUrl || ticket.eventDetails?.bannerUrl ? (
                     <img src={ticket.eventDetails.thumbnailUrl || ticket.eventDetails.bannerUrl} alt="Acara" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 mix-blend-overlay opacity-80" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-white/50 font-bold text-xs">SELESAI</div>
                  )}
                  <div className="absolute top-2 left-2 md:hidden">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black border uppercase ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                {/* Ticket Details (Middle) */}
                <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg md:text-2xl font-black text-[#2B427A] uppercase leading-tight line-clamp-2">{ticket.eventTitle}</h3>
                        <div className="hidden md:block">
                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black border-2 uppercase shadow-sm ${getStatusColor(ticket.status)}`}>
                                {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                            </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs md:text-sm text-gray-600 font-bold mt-2 md:mt-4">
                         {ticket.eventDetails && (
                           <>
                             <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-[#0B1CDE]" /> {new Date(ticket.eventDetails.date).toDateString()} | {ticket.eventDetails.time}</div>
                             <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-[#0B1CDE]" /> {ticket.eventDetails.location}</div>
                           </>
                         )}
                         <div className="pt-2 text-[10px] text-gray-400 font-mono uppercase tracking-widest">ID: {ticket.id.substring(0,8)}...</div>
                      </div>
                  </div>
                  
                  {ticket.eventDetails && ticket.eventDetails.isOpen && (
                       <a href={`/#/event/${createSlug(ticket.eventDetails.title) || ticket.eventId}`} className="text-xs md:text-sm text-[#2B427A] font-black hover:text-[#0B1CDE] flex items-center gap-1 mt-4 group/link uppercase tracking-wide self-start">
                          LIHAT DETAIL <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                       </a>
                  )}
                </div>

                {/* Actions & QR (Right) - Stacked at bottom on mobile */}
                <div className="bg-[#F8FAFC] p-4 md:p-6 flex flex-col justify-center items-center gap-4 border-t-2 md:border-t-0 md:border-l-2 border-[#2B427A] md:w-80">
                    {ticket.status === RegistrationStatus.APPROVED ? (
                        <>
                            <div className="text-center w-full">
                                {ticket.checkInStatus === 'CHECKED_IN' ? (
                                     <span className="text-sm md:text-xl font-black text-green-600 tracking-tighter bg-green-100 px-4 py-2 rounded block w-full border border-green-200">SUDAH CHECK-IN</span>
                                ) : (
                                     <div className="flex flex-col items-center">
                                         <div className="bg-white p-2 rounded-lg border-2 border-[#2B427A] shadow-sm">
                                             <QRCode value={ticket.id} size={80} fgColor="#2B427A" />
                                         </div>
                                         <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Scan saat masuk</p>
                                     </div>
                                )}
                            </div>

                            <div className="w-full space-y-2">
                                <button 
                                    onClick={() => handleDownloadTicket(ticket)}
                                    disabled={downloadingTicket === ticket.id}
                                    className="w-full flex items-center justify-center gap-2 text-xs bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] hover:bg-[#2B427A] hover:text-[#DFFF00] px-3 py-2 rounded-lg font-black transition-all shadow-sm"
                                >
                                    {downloadingTicket === ticket.id ? <Loader className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
                                    {downloadingTicket === ticket.id ? '...' : 'DOWNLOAD TIKET'}
                                </button>

                                {isCertificateUnlocked(ticket.eventDetails?.date) ? (
                                    <button 
                                        onClick={() => navigate(`/certificate/${ticket.id}`)}
                                        className="w-full text-xs bg-white border-2 border-[#0B1CDE] text-[#0B1CDE] hover:bg-[#0B1CDE] hover:text-white px-3 py-2 rounded-lg font-black transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <Award className="w-3 h-3" />
                                        LIHAT SERTIFIKAT
                                    </button>
                                ) : (
                                    <div className="bg-gray-100 px-2 py-1 rounded text-center w-full border">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase">Sertifikat: {getUnlockDateString(ticket.eventDetails?.date)}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : ticket.status === RegistrationStatus.REJECTED ? (
                        <div className="text-center text-red-500 font-bold flex flex-col items-center p-3 bg-red-50 border-2 border-red-200 rounded-lg w-full text-xs">
                            <AlertTriangle className="w-6 h-6 mb-1" />
                            DITOLAK
                        </div>
                    ) : (
                        <div className="text-center text-yellow-700 font-bold p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg w-full text-xs flex flex-col items-center">
                            <Clock className="w-6 h-6 mb-1 opacity-50"/>
                            MENUNGGU
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
