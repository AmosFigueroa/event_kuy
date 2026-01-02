
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Upload, Users, Check, AlertCircle, ArrowLeft, Tag, Copy, Loader, Rocket } from 'lucide-react';
import { fetchEvents, registerForEvent, createSlug, fetchPaymentSettings } from '../services/api';
import { Event, PaymentSettings } from '../types';

const EventDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState<any>({ name: '', email: '' }); 
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [events, settings] = await Promise.all([fetchEvents(), fetchPaymentSettings()]);
        const found = events.find(e => createSlug(e.title) === slug || e.id === slug);
        if (found) setEvent(found);
        setPaymentSettings(settings);
      } catch (err) { setError("Gagal memuat data."); } 
      finally { setLoading(false); }
    };
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) return;
    if (!proofFile || !event) return;
    
    setRegistering(true); 
    setError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(proofFile);
      reader.onload = async () => {
          try {
              const base64 = (reader.result as string).split(',')[1];
              const { name, email, ...customData } = formData;
              
              await registerForEvent({ 
                  eventId: event.id, 
                  name: name, 
                  email: email,
                  customData: customData 
              }, base64);
              
              navigate('/payment-success', { state: { price: event.price } });
          } catch (apiErr: any) {
              setError("Gagal mendaftar: " + (apiErr.message || "Kesalahan jaringan."));
              setRegistering(false);
          }
      };
      reader.onerror = () => {
          setError("Gagal membaca file bukti pembayaran.");
          setRegistering(false);
      }
    } catch (err: any) { 
        setError("Terjadi kesalahan sistem."); 
        setRegistering(false); 
    } 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-4 border-[#2B427A] border-t-transparent rounded-full"></div></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center font-black text-[#2B427A]">ACARA TIDAK DITEMUKAN</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="relative h-[30vh] md:h-[40vh] w-full bg-[#2B427A] flex items-center justify-center overflow-hidden">
        <img src={event.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B427A] to-transparent"></div>
        <div className="relative z-10 text-center max-w-4xl px-4 mt-8 md:mt-10 w-full">
            <div className="inline-block bg-[#DFFF00] text-[#2B427A] px-3 py-1 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 border border-[#2B427A]">{event.category}</div>
            <h1 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">{event.title}</h1>
        </div>
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 text-white hover:text-[#DFFF00] flex items-center gap-2 font-bold z-20 text-sm"><ArrowLeft className="w-4 h-4 md:w-5 md:h-5"/> KEMBALI</button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 md:-mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
             <div className="bg-white rounded-xl p-6 md:p-8 border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] md:shadow-[8px_8px_0px_0px_#2B427A]">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 mb-6 md:mb-8 pb-6 md:pb-8 border-b-2 border-dashed border-[#2B427A]/20">
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-3 py-2 rounded-lg text-[#2B427A] font-bold text-sm"><Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#0B1CDE]" /><span>{new Date(event.date).toLocaleDateString()} | {event.time}</span></div>
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-3 py-2 rounded-lg text-[#2B427A] font-bold text-sm"><MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#0B1CDE]" /><span>{event.location}</span></div>
                    <div className="flex items-center gap-2 bg-[#F0F9FF] px-3 py-2 rounded-lg text-[#2B427A] font-bold text-sm"><Users className="w-4 h-4 md:w-5 md:h-5 text-[#0B1CDE]" /><span>{event.currentParticipants}/{event.maxParticipants}</span></div>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-[#2B427A] mb-3 md:mb-4 uppercase">Deskripsi</h2>
                <p className="text-sm md:text-base text-gray-700 leading-7 md:leading-8 whitespace-pre-wrap">{event.description}</p>
             </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-[#2B427A] rounded-xl shadow-[6px_6px_0px_0px_#DFFF00] md:shadow-[8px_8px_0px_0px_#DFFF00] p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#2B427A]/10">
                <div><span className="text-gray-500 text-xs font-black uppercase">Biaya</span><div className="text-2xl md:text-3xl font-black text-[#0B1CDE]">{event.price === 0 ? "GRATIS" : `Rp ${event.price.toLocaleString('id-ID')}`}</div></div>
                <div className="w-10 h-10 bg-[#DFFF00] rounded-lg border-2 border-[#2B427A] flex items-center justify-center"><DollarSign className="w-6 h-6 text-[#2B427A]" /></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold flex gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
                
                {/* Standard Fields */}
                <div><label className="text-xs font-black text-[#2B427A] uppercase mb-1 block">Nama Lengkap</label><input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-[#0B1CDE] outline-none text-sm" /></div>
                <div><label className="text-xs font-black text-[#2B427A] uppercase mb-1 block">Email</label><input type="email" required value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-[#0B1CDE] outline-none text-sm" /></div>

                {/* Custom Fields */}
                {event.formFields?.map(field => (
                    <div key={field.id}>
                        <label className="text-xs font-black text-[#2B427A] uppercase mb-1 block">{field.label}</label>
                        {field.type === 'select' ? (
                            <select required={field.required} onChange={e=>setFormData({...formData, [field.label]: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-[#0B1CDE] outline-none bg-white text-sm">
                                <option value="">Pilih...</option>
                                {field.options?.map(opt=><option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : field.type === 'textarea' ? (
                            <textarea required={field.required} onChange={e=>setFormData({...formData, [field.label]: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-[#0B1CDE] outline-none text-sm" rows={3}></textarea>
                        ) : (
                            <input type={field.type} required={field.required} onChange={e=>setFormData({...formData, [field.label]: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-[#0B1CDE] outline-none text-sm" placeholder={field.placeholder} />
                        )}
                    </div>
                ))}

                {/* Payment Info Section */}
                {event.price > 0 && paymentSettings && (
                    <div className="bg-[#F0F9FF] p-4 rounded-lg border border-blue-200 text-sm">
                        <h4 className="font-black text-[#2B427A] mb-3 uppercase flex items-center gap-2 text-xs md:text-sm"><DollarSign className="w-4 h-4"/> Transfer Pembayaran</h4>
                        
                        <div className="space-y-4">
                            {/* Loop through bank accounts */}
                            {paymentSettings.bankAccounts.map((acc, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border border-blue-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-black text-[#2B427A] uppercase text-xs">{acc.bankName}</p>
                                        <button type="button" onClick={() => navigator.clipboard.writeText(acc.accountNumber)} title="Salin No. Rek" className="hover:scale-110 transition-transform bg-transparent border-none p-0 cursor-pointer text-[#0B1CDE]">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="font-mono bg-gray-50 px-2 py-1 rounded text-[#0B1CDE] font-bold text-base tracking-wide border border-gray-100 mb-1 select-all break-all">
                                        {acc.accountNumber}
                                    </div>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">a.n {acc.accountHolder}</p>
                                </div>
                            ))}

                            {paymentSettings.qrisUrl && (
                                <div className="mt-3 pt-3 border-t border-blue-100">
                                    <p className="font-bold text-xs mb-2 text-[#2B427A] uppercase">SCAN QRIS:</p>
                                    <div className="bg-white p-2 rounded border inline-block">
                                        <img src={paymentSettings.qrisUrl} alt="QRIS" className="w-24 h-24 md:w-32 md:h-32 object-contain" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div>
                  <label className="text-xs font-black text-[#2B427A] uppercase mb-1 block">Bukti Pembayaran</label>
                  <div className="border-2 border-dashed border-[#2B427A]/30 rounded-lg p-4 text-center hover:bg-[#F0F9FF] cursor-pointer relative">
                       <input type="file" required onChange={e=>setProofFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                       <div className="text-xs font-bold text-gray-500 break-words">{proofFile ? proofFile.name : "Klik Upload File"}</div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={registering} 
                  className={`w-full py-3 md:py-4 rounded-xl font-black text-base md:text-lg transition-all flex items-center justify-center gap-3
                    ${registering 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300' 
                      : 'bg-[#0B1CDE] text-white border-2 border-[#0B1CDE] hover:bg-[#DFFF00] hover:text-[#2B427A] hover:border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#2B427A]'
                    }`}
                >
                  {registering ? (
                    <>
                      <Loader className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                      PROSES...
                    </>
                  ) : (
                     <>
                       DAFTAR SEKARANG <Rocket className="w-4 h-4 md:w-5 md:h-5" />
                     </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
