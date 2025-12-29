import React, { useState } from 'react';
import { Search, Ticket, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { fetchUserRegistrations, fetchEvents, sendCertificate } from '../services/api';
import { Registration, RegistrationStatus, Event } from '../types';

const UserDashboard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<(Registration & { eventDetails?: Event })[]>([]);
  const [certLoading, setCertLoading] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setHasSearched(true);
    try {
      // Fetch registrations and events in parallel to enrich data
      const [userRegs, allEvents] = await Promise.all([
        fetchUserRegistrations(email),
        fetchEvents()
      ]);

      // Combine registration data with event details
      const enrichedTickets = userRegs.map(reg => ({
        ...reg,
        eventDetails: allEvents.find(ev => ev.id === reg.eventId)
      }));

      // Sort by newest first
      setTickets(enrichedTickets.sort((a, b) => 
        new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
      ));
    } catch (error) {
      console.error("Failed to fetch tickets", error);
      alert("Tidak dapat memuat tiket. Silakan periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

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
      case RegistrationStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-200';
      case RegistrationStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Portal Tiket Saya</h1>
          <p className="mt-2 text-gray-600">Masukkan alamat email terdaftar Anda untuk melihat tiket dan status.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="nama@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 border border-transparent font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Mencari...' : 'Cari Tiket'}
            </button>
          </form>
        </div>

        {hasSearched && !loading && tickets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Tiket tidak ditemukan</h3>
            <p className="text-gray-500">Kami tidak dapat menemukan pendaftaran untuk {email}.</p>
          </div>
        )}

        <div className="grid gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Event Image (Left) */}
                <div className="w-full md:w-48 h-32 md:h-auto bg-gray-200 relative">
                  {ticket.eventDetails?.bannerUrl ? (
                     <img src={ticket.eventDetails.bannerUrl} alt="Acara" className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">Tanpa Gambar</div>
                  )}
                  <div className="absolute top-2 left-2 md:hidden">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                {/* Ticket Details (Middle) */}
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{ticket.eventTitle}</h3>
                      <div className="space-y-1 text-sm text-gray-500">
                         {ticket.eventDetails && (
                           <>
                             <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(ticket.eventDetails.date).toDateString()} pukul {ticket.eventDetails.time}</div>
                             <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {ticket.eventDetails.location}</div>
                           </>
                         )}
                         <div className="pt-2 text-xs text-gray-400">ID Pendaftaran: {ticket.id}</div>
                      </div>
                    </div>
                    
                    {/* Status Badge (Desktop) */}
                    <div className="hidden md:block">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)} {getStatusText(ticket.status)}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Actions (Right) */}
                <div className="bg-gray-50 p-6 flex flex-col justify-center items-center gap-3 border-t md:border-t-0 md:border-l md:w-48">
                    {ticket.status === RegistrationStatus.APPROVED ? (
                        <>
                            <div className="text-center">
                                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">E-Ticket</span>
                                <span className="text-2xl font-bold text-indigo-600">VALID</span>
                            </div>
                            <button 
                                onClick={() => requestCertificate(ticket.id)}
                                disabled={certLoading === ticket.id}
                                className="w-full text-xs bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded shadow-sm font-medium transition-colors"
                            >
                                {certLoading === ticket.id ? 'Mengirim...' : 'Email Sertifikat'}
                            </button>
                        </>
                    ) : ticket.status === RegistrationStatus.REJECTED ? (
                        <div className="text-center text-red-600 text-sm font-medium flex flex-col items-center">
                            <AlertTriangle className="w-6 h-6 mb-1" />
                            Pendaftaran Ditolak
                        </div>
                    ) : (
                        <div className="text-center text-yellow-600 text-sm font-medium">
                            Menunggu Persetujuan
                        </div>
                    )}
                    
                    {ticket.eventDetails && ticket.eventDetails.isOpen && (
                         <a href={`/#/event/${ticket.eventId}`} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 mt-2">
                            Lihat Acara <ExternalLink className="w-3 h-3" />
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