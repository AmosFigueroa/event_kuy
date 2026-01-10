
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award } from 'lucide-react';
import { fetchRegistrationById } from '../services/api';
import { Registration, RegistrationStatus, CertificateConfig, CertificateElement } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CustomAlert from '../components/CustomAlert';

const CertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [certConfig, setCertConfig] = useState<CertificateConfig | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Responsive Scaling State
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  // Constants MUST match AdminDashboard canvas size to ensure WYSIWYG
  const CERT_WIDTH = 842; 
  const CERT_HEIGHT = 595;
  
  // Frame Configuration (Visual Only)
  const FRAME_BORDER = 24;
  const FRAME_MAT = 60;
  const TOTAL_PADDING = FRAME_BORDER + FRAME_MAT;
  
  const VISUAL_WIDTH = CERT_WIDTH + (TOTAL_PADDING * 2);
  const VISUAL_HEIGHT = CERT_HEIGHT + (TOTAL_PADDING * 2);

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
        // Detect mobile device
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        
        if (containerRef.current) {
            const parentWidth = containerRef.current.offsetWidth;
            const padding = 32;
            const availableWidth = parentWidth - padding;
            
            const newScale = Math.min(availableWidth / VISUAL_WIDTH, 1);
            setScale(newScale);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [loading, registration]);

  const handleDownload = async () => {
    if (!certRef.current || !registration) return;
    setDownloading(true);

    try {
        // PERBAIKAN: Force desktop viewport simulation untuk mobile
        const canvas = await html2canvas(certRef.current, {
            scale: 3, // High quality scale
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 20000,
            allowTaint: false,
            removeContainer: true,
            // Force dimensions to prevent mobile inflation
            windowWidth: 1920,
            windowHeight: 1080,
            onclone: (clonedDoc) => {
                // Inject CSS to reset text inflation on mobile browsers during capture
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    html, body {
                        -webkit-text-size-adjust: 100% !important; 
                        text-size-adjust: 100% !important; 
                        width: 1920px !important;
                        height: 1080px !important;
                    }
                    * { 
                        -webkit-text-size-adjust: 100% !important; 
                        text-size-adjust: 100% !important; 
                    }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');
        const eventName = sanitize(registration.eventTitle);
        const participantName = sanitize(registration.userName);
        const refNumber = registration.id.substring(0, 8);

        const fileName = `sertifikat_${eventName}_${participantName}_${refNumber}.pdf`;

        pdf.save(fileName);
        showAlert('success', 'Berhasil', 'Sertifikat berhasil diunduh.');
    } catch (e) {
        showAlert('error', 'Gagal', 'Terjadi kesalahan saat mengunduh sertifikat.');
        console.error(e);
    } finally {
        setDownloading(false);
    }
  };

  const getElementContent = (field: string) => {
      if (!registration) return '';
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

          if (el.field === 'userName') {
              const len = textContent.length;
              const baseSize = el.fontSize || 45;
              
              // Simplified scaling logic that works for both desktop and mobile
              // since canvas capture simulates desktop anyway.
              if (len <= 20) dynamicFontSize = baseSize;
              else if (len <= 25) dynamicFontSize = baseSize * 0.85;
              else if (len <= 30) dynamicFontSize = baseSize * 0.75;
              else if (len <= 35) dynamicFontSize = baseSize * 0.65;
              else if (len <= 45) dynamicFontSize = baseSize * 0.55;
              else dynamicFontSize = baseSize * 0.45;
              
              dynamicFontSize = Math.max(dynamicFontSize, 12);
          }

      } else if (el.type === 'text') {
          textContent = el.field;
          content = textContent;
      } else if (el.type === 'image') {
          content = <img 
            src={el.field} 
            alt="element" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain', 
              pointerEvents: 'none' 
            }}
            crossOrigin="anonymous"
          />;
      }

      if (el.type !== 'image' && el.textTransform === 'uppercase') {
          content = String(textContent).toUpperCase();
      } else if (el.type !== 'image' && el.textTransform === 'lowercase') {
          content = String(textContent).toLowerCase();
      }

      // Consistent positioning logic
      if (el.field === 'userName') {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: '30px', 
                right: '30px',
                top: el.y,
                transform: 'translateY(-50%)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  color: el.color || '#000000',
                  fontSize: `${dynamicFontSize}px`,
                  fontFamily: el.fontFamily || 'Arial, sans-serif',
                  fontWeight: el.fontWeight || 'bold',
                  textAlign: 'center',
                  width: '100%',
                  textTransform: el.textTransform || 'none',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  padding: '0 5px',
                }}
              >
                {content}
              </div>
            </div>
          );
      }

      let containerStyle: React.CSSProperties = {
          left: el.x,
          top: el.y,
          position: 'absolute',
          zIndex: 10,
      };

      if (el.align === 'center' || !el.align) {
          containerStyle.transform = 'translate(-50%, -50%)';
      } else if (el.align === 'left') {
          containerStyle.transform = 'translateY(-50%)';
      } else if (el.align === 'right') {
          containerStyle.transform = 'translate(-100%, -50%)';
      }
      
      const textStyle: React.CSSProperties = {
          color: el.color || '#000000',
          fontSize: el.type === 'image' ? undefined : `${dynamicFontSize}px`,
          fontFamily: el.fontFamily || 'Arial, sans-serif',
          fontWeight: el.fontWeight || 'bold',
          textAlign: el.align || 'center',
          width: el.type === 'image' ? `${el.width || 100}px` : 'auto',
          maxWidth: el.type === 'image' ? undefined : (el.width || 'auto'),
          textTransform: el.textTransform || 'none',
          lineHeight: '1.2',
          whiteSpace: 'nowrap'
      };

      if (el.strokeWidth && el.strokeWidth > 0 && el.type !== 'image') {
          const sw = el.strokeWidth;
          const sc = el.strokeColor || '#FFFFFF';
          textStyle.textShadow = `-${sw}px -${sw}px 0 ${sc}, ${sw}px -${sw}px 0 ${sc}, -${sw}px ${sw}px 0 ${sc}, ${sw}px ${sw}px 0 ${sc}, 0 -${sw}px 0 ${sc}, 0 ${sw}px 0 ${sc}, -${sw}px 0 0 ${sc}, ${sw}px 0 0 ${sc}`;
      }

      return (
        <div key={el.id} style={containerStyle}>
            <div style={textStyle}>{content}</div>
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
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />

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
              <div 
                style={{
                    width: VISUAL_WIDTH,
                    height: VISUAL_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    
                    backgroundColor: '#18181b', 
                    padding: `${FRAME_BORDER}px`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 15px -3px rgba(0,0,0,0.5)', 
                    borderRadius: '2px' 
                }}
              >
                 <div style={{
                     width: '100%',
                     height: '100%',
                     backgroundColor: '#fdfdfd',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     boxShadow: 'inset 0px 0px 20px rgba(0,0,0,0.15)'
                 }}>
                     
                     <div style={{
                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                         border: '1px solid #e5e5e5'
                     }}>
                         <div 
                            ref={certRef}
                            className="bg-white flex-shrink-0 text-center overflow-hidden flex flex-col items-center justify-center relative"
                            style={{ 
                                width: `${CERT_WIDTH}px`, 
                                height: `${CERT_HEIGHT}px`,
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
                                            loading="eager"
                                         />
                                     </div>
                                     {certConfig.elements.map(renderElement)}
                                 </>
                             ) : (
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
      </div>
    </div>
  );
};

export default CertificatePage;
