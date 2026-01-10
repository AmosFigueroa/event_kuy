
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award, CheckCircle } from 'lucide-react';
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

  // Responsive Scaling State (Hanya untuk Preview di Layar)
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  // Constants MUST match AdminDashboard canvas size to ensure WYSIWYG
  const CERT_WIDTH = 842; 
  const CERT_HEIGHT = 595;
  
  // Frame Configuration (Visual Only)
  const FRAME_BORDER = 24; // Tebal bingkai hitam
  const FRAME_MAT = 60;    // Tebal area putih (paspartu/matting)
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

  // Handle Resize for Responsive Scaling (Preview Only)
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

  /**
   * GENERATE CERTIFICATE USING NATIVE CANVAS API
   * This is much more robust on mobile than html2canvas because it ignores
   * the browser's viewport scaling and text inflation completely.
   */
  const handleDownload = async () => {
    if (!registration) return;
    setDownloading(true);

    try {
        const hasConfig = certConfig && certConfig.backgroundUrl;
        let imgData = '';

        if (hasConfig) {
            // --- NATIVE CANVAS DRAWING STRATEGY ---
            const canvas = document.createElement('canvas');
            const scale = 2; // 2x resolution for crisp PDF
            canvas.width = CERT_WIDTH * scale;
            canvas.height = CERT_HEIGHT * scale;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) throw new Error("Could not create canvas context");
            
            // Scale context so we can use logical coordinates
            ctx.scale(scale, scale);

            // 1. Draw Background
            if (certConfig.backgroundUrl) {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.src = certConfig.backgroundUrl;
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, CERT_WIDTH, CERT_HEIGHT);
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn("Failed to load background image");
                        resolve(); // Proceed without background
                    };
                });
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);
            }

            // 2. Draw Elements
            const elements = certConfig.elements || [];
            for (const el of elements) {
                // Determine Content
                let text = '';
                if (el.type === 'image') {
                    // Draw Image Element
                    if (el.field) {
                        await new Promise<void>((resolve) => {
                            const imgEl = new Image();
                            imgEl.crossOrigin = 'anonymous';
                            imgEl.src = el.field;
                            imgEl.onload = () => {
                                const w = el.width || 100;
                                const ratio = imgEl.naturalHeight / imgEl.naturalWidth;
                                const h = w * ratio;
                                
                                // Calculate position based on alignment
                                let x = el.x;
                                let y = el.y;
                                
                                // Adjust anchor point
                                if (el.align === 'center') x = x - (w / 2);
                                else if (el.align === 'right') x = x - w;
                                
                                if (el.verticalAlign === 'middle') y = y - (h / 2);
                                else if (el.verticalAlign === 'bottom') y = y - h;
                                else y = y - (h/2); // Default to middle if undefined for images in this logic

                                ctx.drawImage(imgEl, x, y, w, h);
                                resolve();
                            };
                            imgEl.onerror = () => resolve();
                        });
                    }
                    continue; 
                } else {
                    // Text Element
                    if (el.type === 'dynamic') text = getElementContent(el.field);
                    else text = el.field;
                }

                // Text Transforms
                if (el.textTransform === 'uppercase') text = text.toUpperCase();
                else if (el.textTransform === 'lowercase') text = text.toLowerCase();

                // Dynamic Font Sizing Logic
                let fontSize = el.fontSize || 12;
                if (el.field === 'userName') {
                    if (text.length > 40) fontSize *= 0.5;
                    else if (text.length > 30) fontSize *= 0.65;
                    else if (text.length > 20) fontSize *= 0.8;
                }

                // Set Font Context
                const fontWeight = el.fontWeight === 'normal' ? 'normal' : 'bold';
                const fontFamily = el.fontFamily || 'Arial, sans-serif';
                ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.fillStyle = el.color || '#000000';
                
                // Alignment
                ctx.textAlign = (el.align as CanvasTextAlign) || 'center';
                
                // Vertical Align Mapping
                // Canvas 'textBaseline' options: top, middle, bottom
                let baseline: CanvasTextBaseline = 'middle';
                if (el.verticalAlign === 'top') baseline = 'top';
                if (el.verticalAlign === 'bottom') baseline = 'bottom';
                ctx.textBaseline = baseline;

                // Stroke (Outline)
                if (el.strokeWidth && el.strokeWidth > 0) {
                    ctx.lineWidth = el.strokeWidth;
                    ctx.strokeStyle = el.strokeColor || '#FFFFFF';
                    ctx.strokeText(text, el.x, el.y);
                }

                // Fill Text
                ctx.fillText(text, el.x, el.y);
            }

            imgData = canvas.toDataURL('image/jpeg', 0.85);

        } else {
            // --- FALLBACK FOR DEFAULT TEMPLATE (HTML2CANVAS) ---
            // Because the default template uses HTML divs/borders that are harder to draw manually
            if (!certRef.current) return;
            const canvas = await html2canvas(certRef.current, {
                scale: 2, 
                width: CERT_WIDTH,
                height: CERT_HEIGHT,
                useCORS: true,
                backgroundColor: '#ffffff', 
                windowWidth: 1200, // Force desktop width
            });
            imgData = canvas.toDataURL('image/jpeg', 0.85);
        }
        
        // --- PDF GENERATION ---
        const pdf = new jsPDF({
            orientation: 'l', 
            unit: 'mm', 
            format: 'a4',
            compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');
        const eventName = sanitize(registration.eventTitle);
        const participantName = sanitize(registration.userName);
        const refNumber = registration.id.substring(0, 8); 

        const fileName = `sertifikat_${eventName}_${participantName}_${refNumber}.pdf`;

        pdf.save(fileName);
        showAlert('success', 'Berhasil', 'Sertifikat berhasil diunduh (HD).');

    } catch (e: any) {
        showAlert('error', 'Gagal', 'Terjadi kesalahan saat mengunduh sertifikat.');
        console.error(e);
    } finally {
        setDownloading(false);
    }
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
                  dynamicFontSize = dynamicFontSize * 0.5; 
              } else if (len > 30) {
                  dynamicFontSize = dynamicFontSize * 0.65; 
              } else if (len > 20) {
                  dynamicFontSize = dynamicFontSize * 0.8; 
              }
          }

      } else if (el.type === 'text') {
          textContent = el.field;
          content = textContent;
      } else if (el.type === 'image') {
          content = <img src={el.field} alt="element" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />;
      }

      // Enforce Uppercase via JS Logic
      if (el.type !== 'image' && el.textTransform === 'uppercase') {
          content = String(textContent).toUpperCase();
      } else if (el.type !== 'image' && el.textTransform === 'lowercase') {
          content = String(textContent).toLowerCase();
      }

      // Determine Transform based on Alignment for DOM Preview
      let translateX = '-50%';
      if (el.align === 'left') translateX = '0';
      if (el.align === 'right') translateX = '-100%';

      let translateY = '-50%';
      if (el.verticalAlign === 'top') translateY = '0';
      if (el.verticalAlign === 'bottom') translateY = '-100%';

      const transform = `translate(${translateX}, ${translateY})`;

      const strokeStyle = el.strokeWidth && el.strokeWidth > 0 
        ? { 
            WebkitTextStrokeWidth: `${el.strokeWidth}px`, 
            WebkitTextStrokeColor: el.strokeColor || '#FFFFFF',
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
                fontFamily: el.fontFamily || 'Arial, sans-serif',
                fontWeight: el.fontWeight || 'bold',
                textAlign: el.align || 'center',
                width: el.width ? `${el.width}px` : 'auto',
                maxWidth: '95%', // Prevent overflowing off canvas
                transform: transform, 
                whiteSpace: el.type === 'image' ? 'normal' : 'nowrap',
                textTransform: el.textTransform || 'none',
                lineHeight: 1.2, 
                ...strokeStyle
            }}
        >
            {content}
        </div>
      );
  };

  const renderCertificateContent = () => (
      <>
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
                         <h2 className="text-5xl font-black uppercase text-[#2B427A]">{registration?.userName.toUpperCase()}</h2>
                         <div className="w-full h-1 bg-[#DFFF00] mt-2 mx-auto max-w-2xl"></div>
                    </div>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
                         Atas partisipasi dalam acara <span className="text-2xl font-black text-[#0B1CDE] block mt-2 uppercase">"{registration?.eventTitle}"</span>
                    </p>
                </div>
             </>
         )}
      </>
  );

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
             {downloading ? <Loader className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>} DOWNLOAD PDF (HD)
         </button>
      </div>

      <div 
        className="w-full flex justify-center pb-10" 
        ref={containerRef}
      >
          {/* Scaling Wrapper - This controls VISUAL PREVIEW only */}
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
                    
                    // OUTER FRAME (BLACK)
                    backgroundColor: '#18181b', 
                    padding: `${FRAME_BORDER}px`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 15px -3px rgba(0,0,0,0.5)', 
                    borderRadius: '2px' 
                }}
              >
                 {/* MATTING (WHITE BOARD) */}
                 <div style={{
                     width: '100%',
                     height: '100%',
                     backgroundColor: '#fdfdfd', // Paper white matting
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     boxShadow: 'inset 0px 0px 20px rgba(0,0,0,0.15)' // Inner shadow for depth
                 }}>
                     
                     {/* BORDER WRAP AROUND IMAGE (To separate from Matting) */}
                     <div style={{
                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                         border: '1px solid #e5e5e5'
                     }}>
                         {/* The Actual Certificate Node (DOM Preview) */}
                         <div 
                            ref={certRef}
                            className="bg-white flex-shrink-0 text-center overflow-hidden flex flex-col items-center justify-center relative"
                            style={{ 
                                width: `${CERT_WIDTH}px`, 
                                height: `${CERT_HEIGHT}px`, 
                            }}
                         >
                             {renderCertificateContent()}
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
