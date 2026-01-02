
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award, CheckCircle } from 'lucide-react';
import { fetchRegistrationById } from '../services/api';
import { Registration, RegistrationStatus, CertificateConfig } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [certConfig, setCertConfig] = useState<CertificateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  
  // Responsive Scaling State
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const response = await fetchRegistrationById(id);
        const data = response.registration;
        const config = response.certificateConfig;

        if (data.status !== RegistrationStatus.APPROVED) {
            setError("Sertifikat belum tersedia atau pendaftaran belum disetujui.");
        } else {
            setRegistration(data);
            setCertConfig(config);
        }
      } catch (e: any) {
        setError("Data sertifikat tidak ditemukan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Handle Resize for Responsive Scaling
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            const parentWidth = containerRef.current.offsetWidth;
            const padding = 32; // Total horizontal padding
            const availableWidth = parentWidth - padding;
            const baseWidth = 1123; // A4 Landscape width in pixels
            
            // Calculate scale: if screen is smaller than baseWidth, scale down. Max scale 1.
            const newScale = Math.min(availableWidth / baseWidth, 1);
            setScale(newScale);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    // Recalculate after a slight delay to ensure layout is settled
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  const handleDownload = async () => {
    if (!certRef.current || !registration) return;
    setDownloading(true);

    try {
        // Force specific scale for better quality regardless of screen display
        const canvas = await html2canvas(certRef.current, {
            scale: 3, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        // A4 Landscape size
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Sertifikat_${registration.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        alert("Gagal mengunduh sertifikat.");
        console.error(e);
    } finally {
        setDownloading(false);
    }
  };

  const getElementContent = (field: string) => {
      if (!registration) return '';
      if (field === 'userName') return registration.userName;
      if (field === 'eventTitle') return registration.eventTitle;
      if (field === 'date') return new Date(registration.registrationDate).toLocaleDateString('id-ID'); 
      if (field === 'id') return registration.id;
      if (field.startsWith('custom:')) {
          const key = field.split(':')[1];
          try {
              const customData = registration.customData ? JSON.parse(registration.customData) : {};
              return customData[key] || '-';
          } catch(e) { return '-'; }
      }
      return field;
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <Loader className="w-10 h-10 animate-spin text-[#2B427A]" />
      </div>
  );

  if (error || !registration) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4"><Award className="w-10 h-10 text-red-500" /></div>
          <h2 className="text-xl font-black text-[#2B427A] mb-2">AKSES DITOLAK</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#2B427A] text-white rounded-lg font-bold">Kembali ke Beranda</button>
      </div>
  );

  const hasConfig = certConfig && certConfig.backgroundUrl;
  const CERT_WIDTH = 1123;
  const CERT_HEIGHT = 794;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
         <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#2B427A] font-bold hover:text-[#0B1CDE] self-start md:self-auto">
             <ArrowLeft className="w-5 h-5"/> Kembali
         </button>
         <button 
            onClick={handleDownload} 
            disabled={downloading}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#DFFF00] text-[#2B427A] px-6 py-3 rounded-lg font-black border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
         >
             {downloading ? <Loader className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>} DOWNLOAD PDF
         </button>
      </div>

      <div 
        className="w-full flex justify-center pb-10 overflow-hidden" 
        ref={containerRef}
      >
          {/* 
             Wrapper for scaling. 
             Height must be explicitly set based on scale to prevent extra whitespace or clipping.
          */}
          <div style={{ width: CERT_WIDTH * scale, height: CERT_HEIGHT * scale, position: 'relative' }}>
              
              {/* The Actual Certificate Node (Fixed Resolution) being Scaled */}
              <div 
                ref={certRef}
                className="bg-white flex-shrink-0 text-center overflow-hidden flex flex-col items-center justify-center origin-top-left"
                style={{ 
                    width: `${CERT_WIDTH}px`, 
                    height: `${CERT_HEIGHT}px`, 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    transform: `scale(${scale})`,
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
              >
                 {hasConfig ? (
                     <>
                         <div className="absolute inset-0 z-0">
                             <img 
                                src={certConfig.backgroundUrl} 
                                alt="Certificate Background" 
                                className="w-full h-full object-cover" 
                                crossOrigin="anonymous" 
                             />
                         </div>
                         {certConfig.elements.map(el => (
                             <div
                                 key={el.id}
                                 className="absolute z-10"
                                 style={{
                                     left: el.x,
                                     top: el.y,
                                     color: el.color,
                                     fontSize: `${el.fontSize}px`,
                                     fontFamily: el.fontFamily || 'Helvetica',
                                     fontWeight: el.fontWeight || 'bold',
                                     textAlign: el.align || 'center',
                                     width: el.width ? `${el.width}px` : 'auto',
                                     transform: 'translate(-50%, -50%)', 
                                     whiteSpace: 'nowrap'
                                 }}
                             >
                                 {el.type === 'dynamic' ? getElementContent(el.field) : el.field}
                             </div>
                         ))}
                     </>
                 ) : (
                     <>
                        <div className="absolute inset-0 border-[20px] border-[#2B427A] z-10 pointer-events-none"></div>
                        <div className="absolute inset-0 border-[24px] border-[#DFFF00] z-0 m-[10px]"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0B1CDE]/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#DFFF00]/30 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
                        
                        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-20">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-[#2B427A] rounded-lg"></div>
                                <h2 className="text-2xl font-black text-[#2B427A] tracking-widest uppercase">HMP BISNIS DIGITAL</h2>
                            </div>
                            <h1 className="text-6xl font-serif text-[#0B1CDE] font-bold mb-4 tracking-tight">SERTIFIKAT</h1>
                            <p className="text-xl text-[#2B427A] font-bold tracking-widest uppercase mb-12">APRESIASI</p>
                            <p className="text-lg text-gray-500 font-medium italic mb-2">Diberikan dengan bangga kepada:</p>

                            <div className="relative px-12 pb-2 mb-8">
                                 <h2 className="text-5xl font-black uppercase text-[#2B427A]">{registration.userName}</h2>
                                 <div className="w-full h-1 bg-[#DFFF00] mt-2 mx-auto max-w-2xl"></div>
                            </div>

                            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
                                 Atas partisipasi dan kontribusinya sebagai Peserta dalam acara:
                                 <br/>
                                 <span className="text-2xl font-black text-[#0B1CDE] block mt-2 uppercase">"{registration.eventTitle}"</span>
                            </p>
                            
                            <p className="absolute bottom-8 text-xs text-gray-400 font-mono">
                                 ID: {registration.id}
                            </p>
                        </div>
                     </>
                 )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default CertificatePage;
