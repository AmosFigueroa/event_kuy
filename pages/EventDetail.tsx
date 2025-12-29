import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Upload, Users, Check, AlertCircle, ArrowLeft, Tag } from 'lucide-react';
import { fetchEvents, registerForEvent } from '../services/api';
import { Event } from '../types';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const events = await fetchEvents();
        const found = events.find(e => e.id === id);
        if (found) setEvent(found);
        else setError("Acara tidak ditemukan");
      } catch (err) {
        setError("Gagal memuat detail acara");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile || !event) return;
    
    setRegistering(true);
    setError('');

    try {
      const base64 = await convertToBase64(proofFile);
      const pureBase64 = base64.split(',')[1]; 

      await registerForEvent(
        { eventId: event.id, name: formData.name, email: formData.email },
        pureBase64
      );
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal. Silakan periksa koneksi backend.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-none h-12 w-12 border-4 border-[#2B427A] border-t-[#DFFF00]"></div>
      </div>
  );
  
  if (!event) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
          <div className="bg-white p-8 rounded-xl border-2 border-[#2B427A] shadow-[8px_8px_0px_0px_#2B427A] max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-[#2B427A] mb-2">TERJADI KESALAHAN</h3>
            <p className="text-gray-500 mb-6 font-medium">{error || "Acara tidak ditemukan"}</p>
            <button onClick={() => navigate('/')} className="w-full py-3 bg-[#2B427A] text-white rounded-lg font-bold hover:bg-[#DFFF00] hover:text-[#2B427A] transition-colors border-2 border-transparent">KEMBALI KE BERANDA</button>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Banner */}
      <div className="relative h-[50vh] w-full bg-[#2B427A] flex items-center justify-center overflow-hidden">
        <img 
            src={event.bannerUrl || `https://picsum.photos/1200/400?random=${event.id}`} 
            alt={event.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B427A] to-transparent"></div>
        
        <div className="absolute top-6 left-4 sm:left-8 z-20">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white bg-black/30 hover:bg-[#DFFF00] hover:text-[#2B427A] backdrop-blur px-4 py-2 rounded-lg transition-all text-sm font-bold border border-white/20">
                <ArrowLeft className="w-4 h-4" /> KEMBALI
            </button>
        </div>

        <div className="relative z-10 text-center max-w-4xl px-4 mt-20">
            <div className="inline-block bg-[#DFFF00] text-[#2B427A] px-4 py-1 rounded-sm text-sm font-black uppercase tracking-widest mb-4 border-2 border-[#2B427A]">
                {event.category}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-none uppercase tracking-tight mb-6 drop-shadow-lg">{event.title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-white rounded-xl p-8 border-2 border-[#2B427A] shadow-[8px_8px_0px_0px_#2B427A]">
                
                {/* Info Bar */}
                <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b-2 border-dashed border-[#2B427A]/20">
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-4 py-2 rounded-lg border border-[#0B1CDE]/20 text-[#2B427A] font-bold">
                        <Calendar className="w-5 h-5 text-[#0B1CDE]" />
                        <span>{new Date(event.date).toLocaleDateString('id-ID')} | {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-4 py-2 rounded-lg border border-[#0B1CDE]/20 text-[#2B427A] font-bold">
                        <MapPin className="w-5 h-5 text-[#0B1CDE]" />
                        <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-4 py-2 rounded-lg border border-[#0B1CDE]/20 text-[#2B427A] font-bold">
                        <Users className="w-5 h-5 text-[#0B1CDE]" />
                        <span>{event.currentParticipants} / {event.maxParticipants} Kursi</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-[#2B427A] mb-4 uppercase flex items-center gap-2">
                    <Tag className="w-6 h-6 text-[#DFFF00] fill-[#2B427A]" /> Deskripsi Acara
                </h2>
                <p className="text-gray-700 leading-8 whitespace-pre-wrap text-lg font-medium">
                    {event.description}
                </p>
             </div>

             <div className="bg-[#2B427A] rounded-xl p-8 border-2 border-[#2B427A] text-white shadow-lg">
               <h3 className="font-bold text-[#DFFF00] mb-3 flex items-center gap-2 text-xl uppercase">
                   <AlertCircle className="w-6 h-6" /> Instruksi Pembayaran
               </h3>
               <p className="leading-relaxed font-medium bg-white/10 p-4 rounded-lg border border-white/20">
                 {event.paymentInstructions || "Silakan transfer biaya pendaftaran ke Bank Central Asia (BCA) 1234567890 a/n EventHorizon Admin. Unggah bukti pembayaran di formulir."}
               </p>
            </div>
          </div>

          {/* Registration Form Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-[#2B427A] rounded-xl shadow-[8px_8px_0px_0px_#DFFF00] p-8 sticky top-24">
              <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-[#2B427A]/10">
                <div>
                    <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Biaya Pendaftaran</span>
                    <div className="flex items-center gap-1 text-3xl font-black text-[#0B1CDE]">
                    {event.price === 0 ? "GRATIS" : `Rp ${event.price.toLocaleString('id-ID')}`}
                    </div>
                </div>
                <div className="w-12 h-12 bg-[#DFFF00] rounded-lg border-2 border-[#2B427A] flex items-center justify-center text-[#2B427A]">
                    <DollarSign className="w-7 h-7" />
                </div>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-[#DFFF00] border-2 border-[#2B427A] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-[#2B427A]" />
                  </div>
                  <h4 className="text-2xl font-black text-[#2B427A] mb-2 uppercase">BERHASIL!</h4>
                  <p className="text-gray-600 mb-8 font-medium">
                    Data dan bukti pembayaranmu sudah kami terima. Tunggu email konfirmasi dari admin ya!
                  </p>
                  <button onClick={() => navigate('/')} className="w-full py-4 bg-[#2B427A] text-white rounded-lg font-bold hover:bg-[#0B1CDE] transition-colors border-2 border-transparent">KEMBALI KE BERANDA</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-lg text-sm flex items-center gap-2 font-bold">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 border-2 border-[#2B427A]/20 rounded-lg focus:border-[#0B1CDE] focus:ring-0 outline-none transition-all font-bold text-[#2B427A]"
                      placeholder="Masukkan nama Anda"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Alamat Email</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full px-4 py-3 border-2 border-[#2B427A]/20 rounded-lg focus:border-[#0B1CDE] focus:ring-0 outline-none transition-all font-bold text-[#2B427A]"
                      placeholder="nama@email.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Bukti Pembayaran</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#2B427A]/20 border-dashed rounded-lg hover:border-[#0B1CDE] hover:bg-[#F0F9FF] transition-all cursor-pointer group bg-gray-50">
                      <div className="space-y-2 text-center">
                        <div className="w-12 h-12 bg-white border-2 border-[#2B427A]/20 rounded-full flex items-center justify-center mx-auto group-hover:border-[#0B1CDE] transition-colors">
                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-[#0B1CDE]" />
                        </div>
                        <div className="flex text-sm text-gray-600 justify-center font-medium">
                          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold text-[#0B1CDE] hover:underline focus-within:outline-none">
                            <span>Unggah file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" required accept="image/*" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">atau drag & drop</p>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">PNG, JPG hingga 5MB</p>
                        {proofFile && <div className="mt-2 inline-block px-3 py-1 bg-[#DFFF00] text-[#2B427A] rounded-full text-xs font-bold border border-[#2B427A]">{proofFile.name}</div>}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={registering}
                    className={`w-full py-4 px-6 border-2 border-[#2B427A] rounded-lg text-white font-black text-lg bg-[#0B1CDE] hover:bg-[#DFFF00] hover:text-[#2B427A] hover:shadow-[4px_4px_0px_0px_#2B427A] hover:-translate-y-1 transition-all ${registering ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {registering ? 'MENGIRIM...' : 'KONFIRMASI PENDAFTARAN'}
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-4 font-medium">
                    Pastikan data yang Anda isi sudah benar.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;