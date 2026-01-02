
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Loader, CheckCircle, XCircle, ArrowLeft, Camera, QrCode, RefreshCw, AlertCircle } from 'lucide-react';
import { validateTicket, fetchEvents } from '../services/api';
import { Event } from '../types';

const TicketScannerPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [loading, setLoading] = useState(false);
    const [eventTitle, setEventTitle] = useState("Memuat Event...");
    const [scannerActive, setScannerActive] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [cameraError, setCameraError] = useState<string>('');
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        // Validate Event Existence first
        const init = async () => {
            try {
                const events = await fetchEvents();
                if (!isMounted.current) return;
                
                const evt = events.find(e => e.id === eventId);
                if (evt) {
                    setEventTitle(evt.title);
                    if (!evt.isOpen) {
                         setScanResult({ success: false, message: "EVENT SUDAH DITUTUP. LINK TIDAK VALID." });
                         setScannerActive(false);
                    }
                } else {
                    setScanResult({ success: false, message: "EVENT TIDAK DITEMUKAN" });
                    setScannerActive(false);
                }
            } catch(e) { console.error(e); }
        };
        if(eventId) init();
        
        return () => { isMounted.current = false; };
    }, [eventId]);

    useEffect(() => {
        if (!eventId || !scannerActive || scanResult) return;

        const startScanner = async () => {
            // Cleanup existing scanner if any
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (e) { /* ignore stop errors */ }
            }

            // Move formatsToSupport to the constructor config
            const html5QrCode = new Html5Qrcode("reader", {
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
                verbose: false
            });
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // Success
                        handleScanSuccess(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore frame errors
                    }
                );
                setPermissionDenied(false);
                setCameraError('');
            } catch (err: any) {
                console.error("Camera start error:", err);
                if (isMounted.current) {
                    setPermissionDenied(true);
                    setCameraError(err?.message || "Gagal mengakses kamera.");
                }
            }
        };

        // Delay start slightly to ensure DOM is ready
        const timer = setTimeout(startScanner, 500);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {}).finally(() => {
                    scannerRef.current?.clear();
                });
            }
        };
    }, [eventId, scannerActive, scanResult]);

    const handleScanSuccess = async (decodedText: string) => {
        if (loading) return;
        
        // Stop scanner immediately to freeze frame logic visually (though we just unmount/hide it via state)
        if (scannerRef.current) {
            try {
                await scannerRef.current.pause();
            } catch(e) {}
        }
        
        setLoading(true);

        try {
            const res = await validateTicket(decodedText, eventId || '');
            if (isMounted.current) {
                setScanResult({ 
                    success: true, 
                    message: "TIKET VALID", 
                    data: res 
                });
            }
        } catch (error: any) {
            if (isMounted.current) {
                setScanResult({ 
                    success: false, 
                    message: error.message || "TIKET TIDAK VALID" 
                });
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const handleReset = () => {
        setScanResult(null);
        setLoading(false);
        // Effect will re-trigger scanner start because scanResult is null
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
             <div className="w-full max-w-md">
                 <div className="flex items-center gap-4 mb-6">
                     <button onClick={() => navigate('/dashboard/admin')} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"><ArrowLeft className="w-5 h-5"/></button>
                     <div className="flex-1 min-w-0">
                         <h1 className="font-black text-[#DFFF00] uppercase text-lg leading-none truncate">SCANNER TIKET</h1>
                         <p className="text-gray-400 text-xs font-bold truncate">{eventTitle}</p>
                     </div>
                 </div>

                 {!scanResult ? (
                     <div className="bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-[#DFFF00] relative aspect-square flex flex-col">
                         {scannerActive && !permissionDenied ? (
                            <>
                                <div id="reader" className="w-full h-full object-cover"></div>
                                {/* Overlay Design */}
                                <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50 flex items-center justify-center">
                                    <div className="w-64 h-64 border-2 border-[#DFFF00]/50 relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#DFFF00]"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#DFFF00]"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#DFFF00]"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#DFFF00]"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                    <span className="bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2 inline-flex">
                                        <Camera className="w-3 h-3"/> Arahkan ke QR Code
                                    </span>
                                </div>
                            </>
                         ) : permissionDenied ? (
                            <div className="p-8 text-center text-white h-full flex flex-col items-center justify-center bg-gray-800">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-4"/>
                                <h3 className="font-bold text-lg mb-2">Akses Kamera Ditolak</h3>
                                <p className="text-sm text-gray-400 mb-4">{cameraError || "Mohon izinkan akses kamera di browser Anda untuk memindai tiket."}</p>
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#DFFF00] text-[#2B427A] font-bold rounded-lg text-sm">Muat Ulang Halaman</button>
                            </div>
                         ) : (
                            <div className="p-8 text-center text-gray-500 font-bold h-full flex items-center justify-center">SCANNER NONAKTIF</div>
                         )}
                     </div>
                 ) : (
                     <div className={`rounded-xl p-8 text-center animate-scale-up border-4 shadow-2xl ${scanResult.success ? 'bg-green-500 border-green-300' : 'bg-red-600 border-red-400'}`}>
                         <div className="flex justify-center mb-4">
                             {scanResult.success ? <CheckCircle className="w-20 h-20 text-white drop-shadow-md"/> : <XCircle className="w-20 h-20 text-white drop-shadow-md"/>}
                         </div>
                         <h2 className="text-3xl font-black text-white uppercase mb-2 tracking-tight">{scanResult.message}</h2>
                         
                         {scanResult.success && scanResult.data && (
                             <div className="bg-white/20 rounded-lg p-4 text-white text-left mt-4 backdrop-blur-sm border border-white/10">
                                 <div className="mb-2">
                                     <p className="text-[10px] uppercase opacity-80 font-bold tracking-wider">Nama Peserta</p>
                                     <p className="text-xl font-black">{scanResult.data.participantName}</p>
                                 </div>
                                 <div className="flex justify-between items-end">
                                     <div>
                                         <p className="text-[10px] uppercase opacity-80 font-bold tracking-wider">Waktu Check-in</p>
                                         <p className="text-sm font-bold font-mono">{new Date(scanResult.data.checkInTime).toLocaleTimeString('id-ID')}</p>
                                     </div>
                                     <div className="bg-white/30 p-1 rounded">
                                         <CheckCircle className="w-5 h-5"/>
                                     </div>
                                 </div>
                             </div>
                         )}
                         
                         <button 
                            onClick={handleReset}
                            className="mt-8 w-full py-4 bg-white text-gray-900 font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl uppercase flex items-center justify-center gap-2"
                         >
                             <RefreshCw className="w-5 h-5"/> SCAN BERIKUTNYA
                         </button>
                     </div>
                 )}
                 
                 {loading && (
                     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                         <div className="flex flex-col items-center animate-bounce-slight">
                             <Loader className="w-16 h-16 text-[#DFFF00] animate-spin mb-4"/>
                             <p className="font-black text-xl text-[#DFFF00] tracking-widest">MEMVERIFIKASI...</p>
                         </div>
                     </div>
                 )}
             </div>
             
             {/* Info Footer */}
             <div className="mt-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                 Event Bisdig Scanner System
             </div>
        </div>
    );
};

export default TicketScannerPage;
