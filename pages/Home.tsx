import React, { useEffect, useState } from 'react';
import { ArrowRight, Info, CheckCircle, HelpCircle, ChevronRight, Mic, Users, TrendingUp, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { FAQ_DATA, APP_NAME } from '../constants';
import { fetchEvents } from '../services/api';
import { Event } from '../types';

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(sorted.slice(0, 3)); 
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#F8FAFC]">
      
      {/* Hero Section */}
      <section className="relative bg-[#2B427A] overflow-hidden pt-20 pb-24 md:pt-32 md:pb-40">
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0B1CDE] rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#DFFF00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-[#DFFF00] px-4 py-2 rounded-full border-2 border-white mb-8 transform hover:scale-105 transition-transform cursor-default">
                <Mic className="w-4 h-4 text-[#2B427A]" />
                <span className="text-[#2B427A] font-black text-sm uppercase tracking-wide">PLATFORM MANAJEMEN ACARA</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-none">
                EVENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFFF00] to-[#0B1CDE]">BISDIG</span><br/>
                KITA <span className="text-[#DFFF00]">BERSAMA</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                Wadah kolaborasi Himpunan Mahasiswa Bisnis Digital. Temukan event, seminar, dan workshop terbaru untuk kembangkan potensimu.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-5">
                <Link to="/events" className="px-8 py-4 bg-[#DFFF00] text-[#2B427A] rounded-xl font-black text-lg border-b-4 border-r-4 border-white hover:translate-y-1 hover:border-0 transition-all flex items-center justify-center gap-2">
                   LIHAT PROGRAM KERJA <ArrowRight className="w-6 h-6" />
                </Link>
                <a href="#about" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white hover:text-[#2B427A] transition-all flex items-center justify-center">
                    TENTANG KAMI
                </a>
            </div>
        </div>
      </section>

      {/* Statistics Strip */}
      <div className="bg-[#DFFF00] border-y-4 border-[#2B427A]">
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#2B427A]/20 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 px-4">
                    <div className="p-3 bg-[#2B427A] rounded-lg text-white"><Users className="w-8 h-8"/></div>
                    <div>
                        <div className="text-3xl font-black text-[#2B427A]">500+</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase">Mahasiswa Aktif</div>
                    </div>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 px-4 pt-4 md:pt-0">
                    <div className="p-3 bg-[#2B427A] rounded-lg text-white"><Calendar className="w-8 h-8"/></div>
                    <div>
                        <div className="text-3xl font-black text-[#2B427A]">24+</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase">Program Kerja</div>
                    </div>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 px-4 pt-4 md:pt-0">
                    <div className="p-3 bg-[#2B427A] rounded-lg text-white"><TrendingUp className="w-8 h-8"/></div>
                    <div>
                        <div className="text-3xl font-black text-[#2B427A]">100%</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase">Pengembangan Diri</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Featured Events */}
      <section className="py-24 max-w-7xl mx-auto px-4 w-full" id="proker">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-[#2B427A] tracking-tight mb-2">PROGRAM KERJA</h2>
            <div className="h-2 w-32 bg-[#0B1CDE]"></div>
          </div>
          <Link to="/events" className="group flex items-center gap-2 text-[#0B1CDE] font-bold text-lg hover:underline decoration-4 decoration-[#DFFF00]">
            Lihat Semua Agenda <ChevronRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[450px] bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-[#2B427A] rounded-xl p-12 text-center shadow-[8px_8px_0px_0px_#2B427A]">
             <div className="w-20 h-20 bg-[#F8FAFC] rounded-full border-2 border-[#2B427A] flex items-center justify-center mx-auto mb-6 text-[#2B427A]">
                <Info className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-[#2B427A] mb-2">AGENDA KOSONG</h3>
             <p className="text-gray-500 font-medium">Belum ada program kerja yang dipublikasikan saat ini.</p>
          </div>
        )}
      </section>

      {/* How It Works (Bento Grid Style) */}
      <section id="about" className="bg-[#2B427A] py-24 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase">Alur Pendaftaran</h2>
            <p className="text-[#DFFF00] font-mono text-lg">SIMPLE. CEPAT. TRANSPARAN.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Step 1 */}
             <div className="bg-[#0B1CDE] p-8 rounded-2xl border-2 border-white/20 shadow-lg hover:border-[#DFFF00] transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-9xl font-black text-white/10 group-hover:text-white/20 transition-colors">1</div>
                <div className="relative z-10">
                    <Info className="w-12 h-12 text-[#DFFF00] mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Pilih Program</h3>
                    <p className="text-blue-100 font-medium">Cari kegiatan yang sesuai dengan minat dan pengembangan skill kamu.</p>
                </div>
             </div>

             {/* Step 2 */}
             <div className="bg-[#1e3a8a] p-8 rounded-2xl border-2 border-white/20 shadow-lg hover:border-[#DFFF00] transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-9xl font-black text-white/10 group-hover:text-white/20 transition-colors">2</div>
                <div className="relative z-10">
                    <CheckCircle className="w-12 h-12 text-[#DFFF00] mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Daftar & Upload</h3>
                    <p className="text-blue-100 font-medium">Isi form data diri dan upload bukti pembayaran (jika berbayar).</p>
                </div>
             </div>

             {/* Step 3 */}
             <div className="bg-[#0B1CDE] p-8 rounded-2xl border-2 border-white/20 shadow-lg hover:border-[#DFFF00] transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-9xl font-black text-white/10 group-hover:text-white/20 transition-colors">3</div>
                <div className="relative z-10">
                    <ArrowRight className="w-12 h-12 text-[#DFFF00] mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Terima Tiket</h3>
                    <p className="text-blue-100 font-medium">Admin memverifikasi, dan E-Tiket dikirim langsung ke emailmu.</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 max-w-4xl mx-auto px-4 w-full">
        <h2 className="text-4xl font-black text-[#2B427A] text-center mb-12 uppercase">Tanya Jawab</h2>
        <div className="space-y-4">
          {FAQ_DATA.map((faq, index) => (
            <details key={index} className="group bg-white rounded-xl border-2 border-[#2B427A] shadow-[4px_4px_0px_0px_#2B427A] open:bg-[#F0F9FF] transition-all duration-300">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-bold text-[#2B427A] text-lg list-none">
                <span className="flex items-center gap-4">
                  <HelpCircle className="w-6 h-6 text-[#0B1CDE]" />
                  {faq.question}
                </span>
                <span className="transform group-open:rotate-180 transition-transform duration-300 bg-[#2B427A] p-1 rounded text-white">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </span>
              </summary>
              <div className="px-6 pb-8 pl-16 text-gray-700 font-medium leading-relaxed border-t-2 border-[#2B427A]/10 pt-4">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;