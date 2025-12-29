import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Upload, Users, Check, AlertCircle } from 'lucide-react';
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
        // Fetch all events and find the specific one (Simulating single fetch)
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
      // Remove data:image/...;base64, prefix for raw storage if needed, but GAS usually handles string well
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

  if (loading) return <div className="p-10 text-center">Memuat detail acara...</div>;
  if (!event) return <div className="p-10 text-center text-red-500">{error || "Acara tidak ditemukan"}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="h-64 md:h-80 w-full relative">
          <img 
            src={event.bannerUrl || `https://picsum.photos/1200/400?random=${event.id}`} 
            alt={event.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
            <div className="p-8 text-white">
              <span className="bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                {event.category}
              </span>
              <h1 className="text-4xl font-bold">{event.title}</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">{new Date(event.date).toLocaleDateString('id-ID')} | {event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">{event.currentParticipants} / {event.maxParticipants} Kursi Terisi</span>
              </div>
            </div>

            <hr />

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tentang Acara Ini</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
               <h3 className="font-bold text-indigo-900 mb-1">Instruksi Pembayaran</h3>
               <p className="text-indigo-800 text-sm">
                 {event.paymentInstructions || "Silakan transfer biaya pendaftaran ke Bank Central Asia (BCA) 1234567890 a/n EventHorizon Admin. Unggah bukti pembayaran di formulir."}
               </p>
            </div>
          </div>

          {/* Registration Form Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-xl shadow-lg p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Daftar Sekarang</h3>
                <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                  <DollarSign className="w-6 h-6" />
                  {event.price === 0 ? "GRATIS" : `Rp ${event.price.toLocaleString('id-ID')}`}
                </div>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Pendaftaran Terkirim!</h4>
                  <p className="text-gray-600 mb-6">
                    Kami telah menerima detail dan bukti pembayaran Anda. Anda akan menerima email konfirmasi setelah admin menyetujui pendaftaran Anda.
                  </p>
                  <button onClick={() => navigate('/')} className="w-full btn-primary bg-indigo-600 text-white py-2 rounded-lg">Kembali ke Beranda</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Pembayaran (Gambar)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                            <span>Unggah file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" required accept="image/*" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">atau seret dan lepas</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG hingga 5MB</p>
                        {proofFile && <p className="text-sm text-green-600 font-semibold">{proofFile.name}</p>}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={registering}
                    className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white font-medium bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${registering ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {registering ? 'Mengirim...' : 'Konfirmasi Pendaftaran'}
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Dengan mendaftar, Anda menyetujui syarat dan ketentuan.
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