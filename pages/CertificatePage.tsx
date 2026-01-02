
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award, CheckCircle } from 'lucide-react';
import { fetchRegistrationById } from '../services/api';
import { Registration, RegistrationStatus } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await fetchRegistrationById(id);
        if (data.status !== RegistrationStatus.APPROVED) {
            setError("Sertifikat belum tersedia atau pendaftaran belum disetujui.");
        } else {
            setRegistration(data);
        }
      } catch (e: any) {
        setError("Data sertifikat tidak ditemukan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownload = async () => {
    if (!certRef.current || !registration) return;
    setDownloading(true);

    try {
        // Force specific scale for better quality
        const canvas = await html2canvas(certRef.current, {
            scale: 2,
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#2B427A] font-bold hover:text-[#0B1CDE]">
             <ArrowLeft className="w-5 h-5"/> Kembali
         </button>
         <button 
            onClick={handleDownload} 
            disabled={downloading}
            className="flex items-center gap-2 bg-[#DFFF00] text-[#2B427A] px-6 py-3 rounded-lg font-black border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
         >
             {downloading ? <Loader className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>} DOWNLOAD PDF
         </button>
      </div>

      <div className="w-full overflow-x-auto flex justify-center pb-10">
          {/* CERTIFICATE TEMPLATE CONTAINER */}
          {/* A4 Landscape Ratio approx 297mm x 210mm. Using 1122px x 793px approx for screen */}
          <div 
            ref={certRef}
            className="relative bg-white flex-shrink-0 text-center overflow-hidden"
            style={{ width: '1123px', height: '794px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
          >
             {/* DESIGN BACKGROUND - You can replace this with an <img> tag if you have a PNG template */}
             <div className="absolute inset-0 border-[20px] border-[#2B427A] z-10"></div>
             <div className="absolute inset-0 border-[24px] border-[#DFFF00] z-0 m-[10px]"></div>
             
             {/* Abstract Shapes */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#0B1CDE]/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#DFFF00]/30 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

             {/* Content */}
             <div className="relative z-20 h-full flex flex-col items-center justify-center p-20">
                 
                 {/* Header Logo Area */}
                 <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-[#2B427A] rounded-lg"></div>
                     <h2 className="text-2xl font-black text-[#2B427A] tracking-widest uppercase">HMP BISNIS DIGITAL</h2>
                 </div>

                 <h1 className="text-6xl font-serif text-[#0B1CDE] font-bold mb-4 tracking-tight">SERTIFIKAT</h1>
                 <p className="text-xl text-[#2B427A] font-bold tracking-widest uppercase mb-12">APRESIASI</p>

                 <p className="text-lg text-gray-500 font-medium italic mb-2">Diberikan dengan bangga kepada:</p>
                 
                 <div className="relative mb-8 px-12 pb-2">
                     <h2 className="text-5xl font-black text-[#2B427A] uppercase">{registration.userName}</h2>
                     <div className="w-full h-1 bg-[#DFFF00] mt-2 mx-auto max-w-2xl"></div>
                 </div>

                 <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
                     Atas partisipasi dan kontribusinya yang luar biasa sebagai Peserta dalam acara:
                     <br/>
                     <span className="text-2xl font-black text-[#0B1CDE] block mt-2 uppercase">"{registration.eventTitle}"</span>
                 </p>

                 <div className="absolute bottom-24 left-0 right-0 px-32 flex justify-between items-end">
                     <div className="text-center">
                         <div className="w-48 h-0.5 bg-[#2B427A] mb-2"></div>
                         <p className="font-bold text-[#2B427A]">KETUA PELAKSANA</p>
                     </div>
                     
                     {/* Badge */}
                     <div className="mb-4">
                         <Award className="w-24 h-24 text-[#DFFF00] drop-shadow-lg" />
                     </div>

                     <div className="text-center">
                         <div className="w-48 h-0.5 bg-[#2B427A] mb-2"></div>
                         <p className="font-bold text-[#2B427A]">KETUA HMP</p>
                     </div>
                 </div>
                 
                 <p className="absolute bottom-8 text-xs text-gray-400 font-mono">
                     ID: {registration.id} • Terverifikasi: {new Date(registration.registrationDate).toLocaleDateString()}
                 </p>
             </div>
          </div>
      </div>
    </div>
  );
};

export default CertificatePage;
