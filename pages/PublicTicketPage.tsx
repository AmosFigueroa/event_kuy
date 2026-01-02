
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRegistrationById, fetchEvents } from '../services/api';
import { Registration, Event, RegistrationStatus } from '../types';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { Loader, Download, AlertTriangle, Calendar, MapPin, CheckCircle, ArrowLeft } from 'lucide-react';
import CustomAlert from '../components/CustomAlert';

const PublicTicketPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ registration: Registration, event?: Event } | null>(null);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);

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

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                // Parallel fetch to get reg data and event details
                // Note: getRegistration in backend doesn't check auth, just ID
                const [regResponse, allEvents] = await Promise.all([
                    fetchRegistrationById(id),
                    fetchEvents()
                ]);

                const reg = regResponse.registration;
                const evt = allEvents.find(e => e.id === reg.eventId);

                if (!reg) throw new Error("Tiket tidak ditemukan.");
                
                // Security check: Only show if approved
                if (reg.status !== RegistrationStatus.APPROVED) {
                    throw new Error("Tiket belum disetujui atau tidak valid.");
                }

                setData({ registration: reg, event: evt });
            } catch (e: any) {
                setError(e.message || "Gagal memuat tiket.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleDownload = async () => {
        setDownloading(true);
        // Slight delay to ensure DOM is ready
        setTimeout(async () => {
            try {
                const element = document.getElementById('ticket-node');
                if (!element) return;
                
                const canvas = await html2canvas(element, {
                    scale: 3,
                    backgroundColor: null,
                    useCORS: true
                });
                
                const link = document.createElement('a');
                link.download = `E-Ticket-${data?.registration.userName.split(' ')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                showAlert('success', 'Berhasil', 'E-Ticket berhasil diunduh ke perangkat Anda.');
            } catch (e) {
                showAlert('error', 'Gagal', 'Terjadi kesalahan saat mengunduh tiket.');
            } finally {
                setDownloading(false);
            }
        }, 100);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <Loader className="w-10 h-10 animate-spin text-[#2B427A]" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4"><AlertTriangle className="w-10 h-10 text-red-500"/></div>
            <h2 className="text-xl font-black text-[#2B427A] mb-2 uppercase">AKSES DITOLAK</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#2B427A] text-white rounded-lg font-bold">Ke Beranda</button>
        </div>
    );

    const { registration, event } = data;

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 flex flex-col items-center">
            <CustomAlert 
                isOpen={alertState.isOpen} 
                type={alertState.type} 
                title={alertState.title} 
                message={alertState.message} 
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
            />

            <div className="w-full max-w-md mb-6 flex justify-between items-center">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#2B427A] font-bold text-sm hover:underline">
                    <ArrowLeft className="w-4 h-4"/> Beranda
                </button>
                <div className="text-xs font-black bg-[#DFFF00] text-[#2B427A] px-3 py-1 rounded border border-[#2B427A]">
                    TIKET RESMI
                </div>
            </div>

            {/* Visual Ticket Container */}
            <div className="relative group perspective">
                {/* TICKET DESIGN (Same as UserDashboard for consistency) */}
                <div id="ticket-node" className="w-[350px] bg-white rounded-xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] border-2 border-[#2B427A]">
                    {/* Header Image */}
                    <div className="h-48 bg-[#2B427A] relative overflow-hidden flex items-center justify-center">
                        {event?.bannerUrl && (
                            <img src={event.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" crossOrigin="anonymous"/>
                        )}
                        <div className="relative z-10 text-center px-4">
                            <h2 className="text-xl font-black text-white uppercase leading-tight drop-shadow-md">{event?.title}</h2>
                            <p className="text-[#DFFF00] text-xs font-bold mt-2 uppercase tracking-widest border border-[#DFFF00] inline-block px-2 py-0.5 rounded">E-Ticket</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 relative bg-white">
                        {/* Cutouts */}
                        <div className="absolute top-[-10px] left-[-10px] w-5 h-5 bg-[#F8FAFC] rounded-full border-r-2 border-b-2 border-[#2B427A]"></div>
                        <div className="absolute top-[-10px] right-[-10px] w-5 h-5 bg-[#F8FAFC] rounded-full border-l-2 border-b-2 border-[#2B427A]"></div>

                        <div className="text-center mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PEMEGANG TIKET</p>
                            <h3 className="text-2xl font-black text-[#2B427A] uppercase">{registration.userName}</h3>
                        </div>

                        <div className="space-y-3 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-[#0B1CDE]"/>
                                <span className="text-xs font-bold text-gray-700">
                                    {event ? new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'} | {event?.time} WIB
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-[#0B1CDE]"/>
                                <span className="text-xs font-bold text-gray-700 truncate">{event?.location}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="bg-white p-2 rounded-lg border-2 border-[#2B427A] shadow-sm mb-2">
                                <QRCode value={registration.id} size={120} fgColor="#2B427A" />
                            </div>
                            <p className="text-[10px] font-mono text-gray-400 font-bold uppercase">{registration.id}</p>
                            
                            {registration.checkInStatus === 'CHECKED_IN' ? (
                                <div className="mt-4 bg-green-100 text-green-700 px-4 py-1 rounded border border-green-200 text-xs font-black uppercase flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3"/> SUDAH CHECK-IN
                                </div>
                            ) : (
                                <div className="mt-4 text-[#0B1CDE] text-[10px] font-black uppercase animate-pulse">
                                    Tunjukkan QR Code ini ke Panitia
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleDownload}
                disabled={downloading}
                className="mt-8 w-full max-w-[350px] py-4 bg-[#2B427A] text-white rounded-xl font-black border-2 border-[#2B427A] hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#2B427A] flex items-center justify-center gap-2"
            >
                {downloading ? <Loader className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                DOWNLOAD GAMBAR
            </button>
            <p className="mt-4 text-xs text-gray-400 font-medium text-center max-w-sm">
                Simpan gambar tiket ini di ponsel Anda untuk ditunjukkan saat registrasi ulang di lokasi acara.
            </p>
        </div>
    );
};

export default PublicTicketPage;
