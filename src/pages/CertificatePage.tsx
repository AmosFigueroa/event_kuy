
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

  // REFACTOR: Use Fixed Container Size + CSS Scale
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Constants: A4 Landscape at ~96 DPI (Standard Screen) or matching Admin Dashboard
  // 842px x 595px is standard A4 @ 72 DPI (Points) often used in JS PDF libs.
  // We stick to this base size so Admin coordinates map 1:1.
  const BASE_WIDTH = 842;
  const BASE_HEIGHT = 595;

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

  // CSS TRANSFORM SCALING LOGIC
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && wrapperRef.current) {
            const wrapperWidth = wrapperRef.current.offsetWidth;
            const availableWidth = wrapperWidth - 32; // -32px padding (16px left + 16px right)
            
            // Calculate scale to fit width
            const scale = Math.min(availableWidth / BASE_WIDTH, 1);
            
            // Apply scale
            containerRef.current.style.transform = `scale(${scale})`;
            containerRef.current.style.transformOrigin = 'top center';
            
            // Adjust wrapper height to remove empty space below scaled element
            // Height = Scaled Height + Some Bottom Padding
            const scaledHeight = BASE_HEIGHT * scale;
            wrapperRef.current.style.height = `${scaledHeight + 40}px`;
        }
    };

    window.addEventListener('resize', handleResize);
    // Call once to set initial state
    handleResize();
    
    // Safety check after render
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [loading, registration]);

  const handleDownload = async () => {
    if (!containerRef.current || !registration) return;
    setDownloading(true);

    try {
        // Use html2canvas on the FIXED SIZE container
        // We use 'onclone' to ensure we capture it at full 100% scale (no css transform)
        // This ensures High Quality output regardless of screen size
        const canvas = await html2canvas(containerRef.current, {
            scale: 3, // 3x Upscaling for crisp text (~2500px width)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.getElementById('certificate-container');
                if (clonedEl) {
                    // Reset transform in the clone so it captures at full 842px size
                    clonedEl.style.transform = 'none';
                    clonedEl.style.margin = '0';
                }
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9); // High quality JPEG
        
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
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

          // INTELLIGENT CONTENT SCALING
          // Prevents overlap by reducing font size for long text
          if (el.field === 'userName') {
              const len = textContent.length;
              
              // Standard A4 width is 842px. 
              // Assume safe text area is roughly 80% (670px) if not defined.
              const maxSafeWidth = el.width || (BASE_WIDTH * 0.8);
              
              // Estimate width: char count * (font size * approx char width ratio 0.6)
              const estimatedWidth = len * (dynamicFontSize * 0.6);
              
              if (estimatedWidth > maxSafeWidth) {
                  // Scale down proportionally to fit
                  const scaleFactor = maxSafeWidth / estimatedWidth;
                  dynamicFontSize = Math.floor(dynamicFontSize * scaleFactor);
              }
              
              // Fallback hard limits for extremely long names
              if (len > 40) dynamicFontSize = Math.min(dynamicFontSize, 20);
              else if (len > 30) dynamicFontSize = Math.min(dynamicFontSize, 28);
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

      let transform = 'translate(-50%, -50%)';
      if (el.align === 'left') transform = 'translate(0, -50%)';
      if (el.align === 'right') transform = 'translate(-100%, -50%)';

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
                fontFamily: el.fontFamily || 'Helvetica',
                fontWeight: el.fontWeight || 'bold',
                textAlign: el.align || 'center',
                width: el.width ? `${el.width}px` : 'auto',
                transform: transform, 
                whiteSpace: 'nowrap', // FORCE SINGLE LINE (Prevents vertical overlap)
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
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />

      {/* Header Actions */}
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

      {/* Wrapper to hold the scalable container */}
      {/* Set min height to ensure it takes space initially */}
      <div 
        ref={wrapperRef} 
        className="w-full flex justify-center relative overflow-hidden transition-all duration-300"
        style={{ minHeight: '300px' }} 
      >
          {/* THE FIXED SIZE CONTAINER (A4 Landscape) */}
          <div 
            id="certificate-container"
            ref={containerRef}
            className="bg-white shadow-2xl relative flex-shrink-0"
            style={{
                width: `${BASE_WIDTH}px`,
                height: `${BASE_HEIGHT}px`,
                overflow: 'hidden',
                // Important: Transform Origin set via JS, but defaults here
                transformOrigin: 'top center',
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
                 // Fallback Design
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
      
      <p className="mt-4 text-xs text-gray-400 text-center max-w-md">
          *Tampilan di layar disesuaikan dengan lebar perangkat Anda. Hasil download akan tetap beresolusi tinggi (A4 Landscape).
      </p>
    </div>
  );
};

export default CertificatePage;
