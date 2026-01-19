
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, ArrowLeft, Award, FileText, Info } from 'lucide-react';
import { fetchRegistrationById, downloadCertificatePdf } from '../services/api';
import { Registration, RegistrationStatus } from '../types';
import CustomAlert from '../components/CustomAlert';

const CertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
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

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const response = await fetchRegistrationById(id);
        const data = response.registration;

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
    if (!id) return;
    setDownloading(true);

    try {
        // Trigger Server-Side Generation via GAS (Google Slides)
        const result = await downloadCertificatePdf(id);
        
        if (result && result.pdfBase64) {
            // Convert Base64 to Blob
            const byteCharacters = atob(result.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            
            // Create Download Link
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = result.filename || `Sertifikat-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('success', 'Berhasil', 'Sertifikat berhasil diunduh dari sistem Google Slide.');
        } else {
            throw new Error("Gagal menerima file PDF dari server.");
        }
    } catch (e: any) {
        // Show raw error message from backend if possible
        const errorMessage = e.message || 'Terjadi kesalahan saat mengunduh sertifikat.';
        showAlert('error', 'Gagal', errorMessage);
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
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 flex flex-col items-center">
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border-2 border-[#2B427A] overflow-hidden">
          {/* Header */}
          <div className="bg-[#2B427A] p-8 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#DFFF00_1px,transparent_1px)] [background-size:20px_20px]"></div>
              <div className="relative z-10">
                  <Award className="w-16 h-16 mx-auto mb-4 text-[#DFFF00]" />
                  <h1 className="text-3xl font-black uppercase tracking-tight mb-2">E-Sertifikat Resmi</h1>
                  <p className="text-blue-100 text-sm font-medium">Himpunan Mahasiswa Bisnis Digital</p>
              </div>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
              <div className="mb-8">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">DIBERIKAN KEPADA</p>
                  <h2 className="text-2xl md:text-3xl font-black text-[#2B427A] mb-4">{registration.userName}</h2>
                  <div className="w-16 h-1 bg-[#DFFF00] mx-auto mb-4"></div>
                  <p className="text-gray-600">
                      Atas partisipasinya dalam acara <br/>
                      <strong className="text-[#0B1CDE] text-lg">"{registration.eventTitle}"</strong>
                  </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 mb-8">
                  <div className="flex items-start gap-3 text-left">
                      <FileText className="w-5 h-5 text-[#0B1CDE] mt-1 flex-shrink-0" />
                      <div>
                          <h4 className="font-bold text-[#2B427A] text-sm">Dokumen Siap Unduh</h4>
                          <p className="text-xs text-gray-500 mt-1">
                              Sertifikat ini menggunakan format PDF Standar A4 High Resolution yang dihasilkan langsung dari sistem Google Slides.
                          </p>
                      </div>
                  </div>
              </div>

              <div className="flex flex-col gap-3">
                  <button 
                      onClick={handleDownload} 
                      disabled={downloading}
                      className="w-full py-4 bg-[#DFFF00] text-[#2B427A] rounded-xl font-black text-lg border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#0B1CDE] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      {downloading ? <Loader className="w-6 h-6 animate-spin"/> : <Download className="w-6 h-6"/>}
                      {downloading ? 'MEMPROSES SLIDE...' : 'DOWNLOAD SERTIFIKAT (PDF)'}
                  </button>
                  
                  <button onClick={() => navigate('/')} className="w-full py-3 text-gray-500 font-bold hover:text-[#2B427A] transition-colors flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4"/> Kembali ke Beranda
                  </button>
              </div>
          </div>
      </div>
      
      <div className="mt-6 flex gap-2 items-start max-w-md bg-white p-3 rounded-lg border border-gray-200">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 text-left">
              <strong>Catatan:</strong> Jika unduhan gagal, pastikan Event Organizer telah memasukkan <strong>ID Google Slide</strong> dengan benar di panel Admin.
          </p>
      </div>
    </div>
  );
};

export default CertificatePage;
