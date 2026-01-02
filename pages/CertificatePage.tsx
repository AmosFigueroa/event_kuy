
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award, CheckCircle } from 'lucide-react';
import { fetchRegistrationById } from '../services/api';
import { Registration, RegistrationStatus, CertificateConfig, CertificateElement } from '../types';
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

  // Constants MUST match AdminDashboard canvas size to ensure WYSIWYG
  const CERT_WIDTH = 842; 
  const CERT_HEIGHT = 595;
  // Frame thickness for preview (visual only)
  const FRAME_PADDING = 20; 
  const VISUAL_WIDTH = CERT_WIDTH + (FRAME_PADDING * 2);
  const VISUAL_HEIGHT = CERT_HEIGHT + (FRAME_PADDING * 2);

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
            const padding = 24; // Total horizontal padding of container
            const availableWidth = parentWidth - padding;
            
            // Calculate scale based on the VISUAL WIDTH (Certificate + Frame)
            // This ensures the frame fits in the screen
            const newScale = Math.min(availableWidth / VISUAL_WIDTH, 1);
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
        // High resolution scale for PDF generation (3x of 842px is plenty for A4)
        // Note: We capture certRef, which is INSIDE the frame, so the frame is NOT captured.
        const canvas = await html2canvas(certRef.current, {
            scale: 4, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        // A4 Landscape size in mm
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // FORMAT NAMA FILE: sertifikat_namaevent_namapeserta_nourutan
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');
        const eventName = sanitize(registration.eventTitle);
        const participantName = sanitize(registration.userName);
        const refNumber = registration.id.substring(0, 8); // Menggunakan 8 digit pertama ID sebagai nomor urut/referensi

        const fileName = `sertifikat_${eventName}_${participantName}_${refNumber}.pdf`;

        pdf.save(fileName);
    } catch (e) {
        alert("Gagal mengunduh sertifikat.");
        console.error(e);
    } finally {
        setDownloading(false);
    }
  };

  const getElementContent = (field: string) => {
      if (!registration) return '';
      // Force Uppercase for Name as requested
      if (field === 'userName') return registration.userName.toUpperCase();
      
      if (field === 'eventTitle') return registration.eventTitle;
      if (field === 'date') return new Date(registration.registrationDate).toLocaleDateString('id-ID'); 
      if (field === 'id') return registration.id;
      if (field === 'certificateNumber') return `NO: ${registration.id.substring(0,8).toUpperCase()}`;
      
      if (field.startsWith('custom:')) {
          const key = field.split(':')[1];
          try {
              const customData = registration.customData ? JSON.parse(registration.customData) : {};
              return customData[key] || '-';
          } catch(e) { return '-'; }
      }
      return field;
  };

  const renderElement = (el: CertificateElement) => {
      let content: React.ReactNode = el.field;
      let textContent = '';
      let dynamicFontSize = el.fontSize || 12;

      if (el.type === 'dynamic') {
          textContent = getElementContent(el.field);
          content = textContent;

          // Auto-resize logic for Long Names (userName)
          if (el.field === 'userName') {
              const len = textContent.length;
              if (len > 40) {
                  dynamicFontSize = dynamicFontSize * 0.5; // Very long name
              } else if (len > 30) {
                  dynamicFontSize = dynamicFontSize * 0.65; // Long name
              } else if (len > 20) {
                  dynamicFontSize = dynamicFontSize * 0.8; // Medium name
              }
          }

      } else if (el.type === 'text') {
          textContent = el.field;
          content = textContent;
      } else if (el.type === 'image') {
          content = <img src={el.field} alt="element" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />;
      }

      // Enforce Uppercase via JS Logic (Stronger than CSS for PDF capture)
      if (el.type !== 'image' && el.textTransform === 'uppercase') {
          content = String(textContent).toUpperCase();
      } else if (el.type !== 'image' && el.textTransform === 'lowercase') {
          content = String(textContent).toLowerCase();
      }

      // Determine Transform based on Alignment to ensure position stays predictable
      let transform = 'translate(-50%, -50%)'; // Default (Center)
      if (el.align === 'left') transform = 'translate(0, -50%)';
      if (el.align === 'right') transform = 'translate(-100%, -50%)';

      const strokeStyle = el.strokeWidth && el.strokeWidth > 0 
        ? { 
            WebkitTextStrokeWidth: `${el.strokeWidth}px`, 
            WebkitTextStrokeColor: el.strokeColor || '#FFFFFF',
            // Paint order ensures the stroke doesn't eat the text fill too much
            paintOrder: 'stroke fill'
          } 
        : {};

      return (
        <div
            key={el.id}
            className="absolute z-10"
            style={{
                left: el.x,
                top: el.y,
                color: el.color || '#000000',
                fontSize: el.type === 'image' ? undefined : `${dynamicFontSize}px`,
                fontFamily: el.fontFamily || 'Helvetica',
                fontWeight: el.fontWeight || 'bold',
                textAlign: el.align || 'center',
                width: el.width ? `${el.width}px` : 'auto',
                transform: transform, 
                whiteSpace: el.type === 'image' ? 'normal' : 'nowrap',
                textTransform: el.textTransform || 'none',
                ...strokeStyle
            }}
        >
            {content}
        </div>
      );
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
        className="w-full flex justify-center pb-10" 
        ref={containerRef}
      >
          {/* Scaling Wrapper */}
          <div style={{ width: VISUAL_WIDTH * scale, height: VISUAL_HEIGHT * scale, position: 'relative' }}>
              
              {/* THE VISUAL FRAME (Scale Applied Here) */}
              {/* HTML2CANVAS Targets the CHILD (certRef), so this frame is ignored during download */}
              <div 
                style={{
                    width: VISUAL_WIDTH,
                    height: VISUAL_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    backgroundColor: '#1a1a1a', // Dark Gray Frame
                    padding: `${FRAME_PADDING}px`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', // Deep Shadow
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    // Frame Texture Effect
                    backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, #1a1a1a 25%, #1a1a1a 50%, #2a2a2a 50%, #2a2a2a 75%, #1a1a1a 75%, #1a1a1a 100%)',
                    backgroundSize: '20px 20px'
                }}
              >
                 {/* Gold Inner Border for the Frame */}
                 <div className="absolute inset-4 border-2 border-[#DFFF00] rounded-lg opacity-50 pointer-events-none"></div>

                 {/* The Actual Certificate Node (Clean for PDF) */}
                 <div 
                    ref={certRef}
                    className="bg-white flex-shrink-0 text-center overflow-hidden flex flex-col items-center justify-center relative shadow-xl"
                    style={{ 
                        width: `${CERT_WIDTH}px`, 
                        height: `${CERT_HEIGHT}px`, 
                        // No scale here, it inherits from parent or is captured natively
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
                             {certConfig.elements.map(renderElement)}
                         </>
                     ) : (
                         // Default Fallback Template
                         <>
                            <div className="absolute inset-0 border-[20px] border-[#2B427A] z-10 pointer-events-none"></div>
                            <div className="absolute inset-0 border-[24px] border-[#DFFF00] z-0 m-[10px]"></div>
                            <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-20">
                                <h1 className="text-6xl font-serif text-[#0B1CDE] font-bold mb-4">SERTIFIKAT</h1>
                                <div className="relative px-12 pb-2 mb-8">
                                     <h2 className="text-5xl font-black uppercase text-[#2B427A]">{registration.userName.toUpperCase()}</h2>
                                     <div className="w-full h-1 bg-[#DFFF00] mt-2 mx-auto max-w-2xl"></div>
                                </div>
                                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
                                     Atas partisipasi dalam acara <span className="text-2xl font-black text-[#0B1CDE] block mt-2 uppercase">"{registration.eventTitle}"</span>
                                </p>
                            </div>
                         </>
                     )}
                 </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CertificatePage;
