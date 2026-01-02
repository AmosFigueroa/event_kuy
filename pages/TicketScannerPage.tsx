
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Loader, CheckCircle, XCircle, ArrowLeft, Camera, QrCode } from 'lucide-react';
import { validateTicket, fetchEvents } from '../services/api';
import { Event } from '../types';

const TicketScannerPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [loading, setLoading] = useState(false);
    const [eventTitle, setEventTitle] = useState("Memuat Event...");
    const [scannerActive, setScannerActive] = useState(true);
    
    // Ref to track if scanner is currently rendered to prevent React StrictMode double-init issues
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Validate Event Existence first
        const init = async () => {
            try {
                const events = await fetchEvents();
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
    }, [eventId]);

    useEffect(() => {
        if (!eventId || !scannerActive) return;

        // Define success callback
        const onScanSuccess = async (decodedText: string, decodedResult: any) => {
            if (loading) return;
            
            // Pause scanner immediately upon read
            if (scannerRef.current) {
                scannerRef.current.pause();
            }
            
            setLoading(true);

            try {
                // Assume QR contains just the Ticket ID (Registration UUID)
                const res = await validateTicket(decodedText, eventId);
                setScanResult({ 
                    success: true, 
                    message: "TIKET VALID", 
                    data: res 
                });
            } catch (error: any) {
                setScanResult({ 
                    success: false, 
                    message: error.message || "TIKET TIDAK VALID" 
                });
            } finally {
                setLoading(false);
            }
        };

        const onScanFailure = (error: any) => {
            // Ignore frame parse errors
        };

        // Initialize Scanner with a small delay to ensure DOM is ready and previous cleanup is done
        const timeoutId = setTimeout(() => {
            // Prevent multiple instances
            if (scannerRef.current) return;

            const scanner = new Html5QrcodeScanner(
                "reader", 
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                },
                /* verbose= */ false
            );
            
            scannerRef.current = scanner;

            scanner.render(onScanSuccess, onScanFailure);
        }, 100);

        // Cleanup function
        return () => {
            clearTimeout(timeoutId);
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(error => {
                        console.warn("Failed to clear scanner", error);
                    });
                } catch (e) {
                    console.warn("Scanner clear error", e);
                }
                scannerRef.current = null;
            }
        };
    }, [eventId, scannerActive]); // Removed 'loading' dependency to prevent scanner re-init loop

    const handleReset = () => {
        setScanResult(null);
        // Resume scanning if paused
        if (scannerRef.current) {
            try {
                scannerRef.current.resume();
            } catch (e) {
                // If resume fails (e.g. wasn't paused or cleared), just reload page as fallback
                window.location.reload();
            }
        } else {
             window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
             <div className="w-full max-w-md">
                 <div className="flex items-center gap-4 mb-6">
                     <button onClick={() => navigate('/dashboard/admin')} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"><ArrowLeft className="w-5 h-5"/></button>
                     <div>
                         <h1 className="font-black text-[#DFFF00] uppercase text-lg leading-none">SCANNER TIKET</h1>
                         <p className="text-gray-400 text-xs font-bold truncate max-w-[200px]">{eventTitle}</p>
                     </div>
                 </div>

                 {!scanResult ? (
                     <div className="bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-[#DFFF00] relative min-h-[300px]">
                         {scannerActive ? (
                            <>
                                <div id="reader" className="w-full bg-black h-full"></div>
                                {/* Fallback/Loading message if camera takes time */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 pointer-events-none -z-0">
                                    <Loader className="w-8 h-8 animate-spin mx-auto"/>
                                </div>
                            </>
                         ) : (
                            <div className="p-8 text-center text-gray-800 font-bold h-full flex items-center justify-center">SCANNER NONAKTIF</div>
                         )}
                         <div className="p-4 bg-gray-100 text-center relative z-10">
                             <p className="text-[#2B427A] font-bold text-sm flex items-center justify-center gap-2">
                                 <Camera className="w-4 h-4"/> Arahkan kamera ke QR Code Peserta
                             </p>
                         </div>
                     </div>
                 ) : (
                     <div className={`rounded-xl p-8 text-center animate-scale-up border-4 shadow-2xl ${scanResult.success ? 'bg-green-500 border-green-300' : 'bg-red-600 border-red-400'}`}>
                         <div className="flex justify-center mb-4">
                             {scanResult.success ? <CheckCircle className="w-20 h-20 text-white"/> : <XCircle className="w-20 h-20 text-white"/>}
                         </div>
                         <h2 className="text-3xl font-black text-white uppercase mb-2">{scanResult.message}</h2>
                         
                         {scanResult.success && scanResult.data && (
                             <div className="bg-white/20 rounded-lg p-4 text-white text-left mt-4 backdrop-blur-sm">
                                 <p className="text-xs uppercase opacity-75 font-bold">Nama Peserta</p>
                                 <p className="text-xl font-black mb-2">{scanResult.data.participantName}</p>
                                 <p className="text-xs uppercase opacity-75 font-bold">Waktu Check-in</p>
                                 <p className="text-sm font-bold">{new Date(scanResult.data.checkInTime).toLocaleTimeString()}</p>
                             </div>
                         )}
                         
                         <button 
                            onClick={handleReset}
                            className="mt-8 w-full py-4 bg-white text-gray-900 font-black rounded-xl hover:scale-105 transition-transform shadow-lg uppercase"
                         >
                             SCAN BERIKUTNYA
                         </button>
                     </div>
                 )}
                 
                 {loading && (
                     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                         <div className="flex flex-col items-center">
                             <Loader className="w-12 h-12 text-[#DFFF00] animate-spin mb-4"/>
                             <p className="font-bold text-[#DFFF00]">MEMVERIFIKASI TIKET...</p>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default TicketScannerPage;
