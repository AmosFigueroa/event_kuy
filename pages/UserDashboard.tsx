
import React, { useState, useEffect } from 'react';
import { Search, Ticket, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Calendar, MapPin, ArrowRight, Loader, History, LayoutDashboard } from 'lucide-react';
import { fetchUserRegistrations, fetchEvents, sendCertificate, getUserSession, createSlug } from '../services/api';
import { Registration, RegistrationStatus, Event } from '../types';
import { useNavigate } from 'react-router-dom';

const UserDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<(Registration & { eventDetails?: Event })[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [certLoading, setCertLoading] = useState<string | null>(null);
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
      alert("Sertifikat telah dikirim ke email Anda!");
    } catch (e: any) {
      alert("Gagal mengirim sertifikat. " + e.message);
    } finally {
      setCertLoading(null);
    }
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
      const eventDate = new Date(t.eventDetails.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      return eventDate >= now; // Upcoming or today
  });

  const historyTickets = tickets.filter(t => {
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
              <div className="flex flex-col md:flex-row">
                {/* Event Image (Left) */}
                <div className="w-full md:w-56 h-48 md:h-auto bg-[#2B427A] relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-[#2B427A]">
                  {ticket.eventDetails?.bannerUrl ? (
                     <img src={ticket.eventDetails.bannerUrl} alt="Acara" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 mix-blend-overlay opacity-80" />
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
                <div className="flex-1 p-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-[#2B427A] mb-3 group-hover:text-[#0B1CDE] transition-colors uppercase leading-none">{ticket.eventTitle}</h3>
                      <div className="space-y-2 text-sm text-gray-600 font-bold">
                         {ticket.eventDetails && (
                           <>
                             <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#0B1CDE]" /> {new Date(ticket.eventDetails.date).toDateString()} | {ticket.eventDetails.time}</div>
                             <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#0B1CDE]" /> {ticket.eventDetails.location}</div>
                           </>
                         )}
                         <div className="pt-3 text-xs text-gray-400 font-mono uppercase tracking-widest">ID: {ticket.id.substring(0,8)}...</div>
                      </div>
                    </div>
                    
                    {/* Status Badge (Desktop) */}
                    <div className="hidden md:block">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black border-2 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Actions (Right) */}
                <div className="bg-[#F8FAFC] p-8 flex flex-col justify-center items-center gap-4 border-t-2 md:border-t-0 md:border-l-2 border-[#2B427A] md:w-72">
                    {ticket.status === RegistrationStatus.APPROVED ? (
                        <>
                            <div className="text-center w-full">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Tiket</span>
                                <span className="text-3xl font-black text-[#0B1CDE] tracking-tighter">VALID</span>
                            </div>
                            <button 
                                onClick={() => requestCertificate(ticket.id)}
                                disabled={certLoading === ticket.id}
                                className="w-full text-sm bg-white border-2 border-[#0B1CDE] text-[#0B1CDE] hover:bg-[#0B1CDE] hover:text-white px-4 py-3 rounded-lg font-black transition-all shadow-[2px_2px_0px_0px_#0B1CDE] hover:translate-y-0.5 hover:shadow-none uppercase"
                            >
                                {certLoading === ticket.id ? 'MENGIRIM...' : 'KIRIM SERTIFIKAT'}
                            </button>
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
                    
                    {ticket.eventDetails && ticket.eventDetails.isOpen && (
                         <a href={`/#/event/${createSlug(ticket.eventDetails.title) || ticket.eventId}`} className="text-sm text-[#2B427A] font-black hover:text-[#0B1CDE] flex items-center gap-1 mt-2 group/link uppercase tracking-wide">
                            LIHAT DETAIL <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                         </a>
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
