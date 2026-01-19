
import React, { useEffect, useState } from 'react';
import { ArrowRight, Info, CheckCircle, HelpCircle, ChevronRight, Mic, Users, TrendingUp, Calendar, ChevronLeft, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { FAQ_DATA, APP_NAME } from '../constants';
import { fetchEvents, createSlug } from '../services/api';
import { Event } from '../types';

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  
  // Stats State
  const [stats, setStats] = useState({ participants: 0, prokers: 0 });

  // Responsive items per slide configuration
  const [itemsPerSlide, setItemsPerSlide] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerSlide(4); // 4 items for desktop to look like a feed row
      } else if (window.innerWidth >= 768) {
        setItemsPerSlide(2);
      } else {
        setItemsPerSlide(1);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        
        // Calculate dynamic stats (REALTIME DATA)
        // Menjumlahkan seluruh currentParticipants dari semua event yang ada di database
        const totalParticipants = data.reduce((sum, ev) => sum + (Number(ev.currentParticipants) || 0), 0);
        
        setStats({
            participants: totalParticipants, // Data asli tanpa manipulasi
            prokers: data.length
        });

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter: ONLY Upcoming Events for Home Page Carousel
        const upcomingEvents = data.filter(e => new Date(e.date) >= now);
        
        // Sort: Nearest date first
        const sorted = upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setEvents(sorted.slice(0, 8)); 
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const maxIndex = Math.ceil(events.length / itemsPerSlide) - 1;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  // Auto-slide effect
  useEffect(() => {
    if (events.length > itemsPerSlide) {
      const timer = setInterval(nextSlide, 5000);
      return () => clearInterval(timer);
    }
  }, [events.length, itemsPerSlide]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#F8FAFC]">
      
      {/* Hero Section */}
      <section className="relative bg-[#2B427A] overflow-hidden pt-20 pb-24 md:pt-32 md:pb-40">
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0B1CDE] rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#DFFF00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            {/* Updated Tag Text */}
            <div className="inline-flex items-center gap-2 bg-[#DFFF00] px-4 py-2 rounded-full border-2 border-white mb-8 transform hover:scale-105 transition-transform cursor-default shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                <Mic className="w-4 h-4 text-[#2B427A]" />
                <span className="text-[#2B427A] font-black text-sm uppercase tracking-wide">WEB PORTAL EVENT BISDIG</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-none drop-shadow-lg uppercase">
                Official Event Portal <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFFF00] to-[#0B1CDE]">HMP Bisdig</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
                Temukan, ikuti, dan kelola seluruh kegiatan Himpunan Mahasiswa Bisnis Digital di sini. Platform terpadu untuk menciptakan pengalaman organisasi yang tak terlupakan.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-5">
                <Link to="/events" className="px-8 py-4 bg-[#DFFF00] text-[#2B427A] rounded-xl font-black text-lg border-b-4 border-r-4 border-white hover:translate-y-1 hover:border-0 transition-all flex items-center justify-center gap-2 shadow-lg">
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
        <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-8 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#2B427A]/20">
                {/* Stat 1 */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-6">
                    <div className="p-4 bg-[#2B427A] rounded-xl text-white shadow-[4px_4px_0px_0px_#000] flex-shrink-0">
                        <Users className="w-8 h-8"/>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="text-4xl font-black text-[#2B427A] leading-none">{stats.participants}</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase tracking-wider mt-1">PARTISIPAN</div>
                    </div>
                </div>
                {/* Stat 2 */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-6">
                    <div className="p-4 bg-[#2B427A] rounded-xl text-white shadow-[4px_4px_0px_0px_#000] flex-shrink-0">
                        <Calendar className="w-8 h-8"/>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="text-4xl font-black text-[#2B427A] leading-none">{stats.prokers}</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase tracking-wider mt-1">PROGRAM KERJA</div>
                    </div>
                </div>
                {/* Stat 3 */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-6">
                    <div className="p-4 bg-[#2B427A] rounded-xl text-white shadow-[4px_4px_0px_0px_#000] flex-shrink-0">
                        <TrendingUp className="w-8 h-8"/>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="text-4xl font-black text-[#2B427A] leading-none">100%</div>
                        <div className="text-sm font-bold text-[#2B427A] uppercase tracking-wider mt-1">PENGEMBANGAN DIRI</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Featured Events Carousel - Full Poster Style 4:5 */}
      <section className="py-24 max-w-7xl mx-auto px-4 w-full overflow-hidden" id="proker">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-[#2B427A] tracking-tight mb-2 uppercase">Galeri Kegiatan</h2>
            <div className="h-2 w-32 bg-[#0B1CDE]"></div>
          </div>
          <div className="flex gap-2">
            <button onClick={prevSlide} className="p-3 rounded-lg border-2 border-[#2B427A] hover:bg-[#DFFF00] transition-colors"><ChevronLeft className="w-6 h-6 text-[#2B427A]" /></button>
            <button onClick={nextSlide} className="p-3 rounded-lg border-2 border-[#2B427A] hover:bg-[#DFFF00] transition-colors"><ChevronRight className="w-6 h-6 text-[#2B427A]" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-6 overflow-hidden animate-pulse">
             {[1,2,3,4].map(i => <div key={i} className="min-w-[250px] aspect-[4/5] bg-gray-200 rounded-xl"></div>)}
          </div>
        ) : events.length > 0 ? (
          <div className="relative w-full overflow-hidden px-1">
            {/* Carousel Track */}
            <div 
                className="flex gap-6 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ transform: `translateX(-${currentSlide * (100 / itemsPerSlide) * itemsPerSlide}%)` }} 
            >
                {events.map((event) => (
                    <div 
                        key={event.id} 
                        className="flex-shrink-0"
                        style={{ width: itemsPerSlide === 1 ? '100%' : (itemsPerSlide === 2 ? 'calc(50% - 12px)' : 'calc(25% - 18px)') }}
                    >
                        {/* Event Card Container */}
                        <div className="block group relative w-full aspect-[4/5] bg-gray-200 rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] hover:shadow-[8px_8px_0px_0px_#0B1CDE] hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                            
                            {/* 1. Main Card Link (Background Layer) - Navigasi ke Detail Event */}
                            <Link 
                                to={`/event/${createSlug(event.title) || event.id}`}
                                className="absolute inset-0 z-10 cursor-pointer"
                                aria-label={`Lihat detail ${event.title}`}
                            />

                            {/* Full Image */}
                            <img 
                                src={event.thumbnailUrl || event.bannerUrl || `https://picsum.photos/400/500?random=${event.id}`} 
                                alt={event.title} 
                                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                            />
                            
                            {/* Category Badge */}
                            <div className="absolute top-4 left-4 bg-[#DFFF00] border-2 border-[#2B427A] px-3 py-1 text-xs font-black text-[#2B427A] uppercase tracking-wider z-10 shadow-[2px_2px_0px_0px_#000] pointer-events-none">
                                {event.category}
                            </div>
                            
                            {/* Overlay Gradient & Content */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2B427A] via-[#2B427A]/50 to-transparent opacity-90 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5 pointer-events-none">
                                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-auto">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#DFFF00] mb-2 uppercase">
                                        <Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2 leading-tight line-clamp-2 uppercase">
                                        {event.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                                        
                                        {/* 2. Location Link (Foreground Layer with higher Z-Index) - Link ke Google Maps */}
                                        <a 
                                            href={event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs text-blue-100 font-bold hover:text-[#DFFF00] hover:underline transition-colors z-20 relative max-w-[180px] cursor-pointer"
                                            title="Lihat Peta Lokasi"
                                            onClick={(e) => e.stopPropagation()} // Mencegah trigger link detail event
                                        >
                                            <MapPin className="w-3 h-3 flex-shrink-0" /> 
                                            <span className="truncate">{event.location}</span>
                                        </a>

                                        <ArrowRight className="w-4 h-4 text-[#DFFF00]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#2B427A] rounded-xl p-12 text-center shadow-[8px_8px_0px_0px_#2B427A]">
             <div className="w-20 h-20 bg-[#F8FAFC] rounded-full border-2 border-[#2B427A] flex items-center justify-center mx-auto mb-6 text-[#2B427A]">
                <Info className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-[#2B427A] mb-2">TIDAK ADA EVENT MENDATANG</h3>
             <p className="text-gray-500 font-medium">Nantikan program kerja kami selanjutnya atau cek halaman Program Kerja untuk melihat histori.</p>
             <Link to="/events" className="inline-block mt-4 px-6 py-2 bg-[#2B427A] text-white font-bold rounded-lg hover:bg-[#0B1CDE] transition-colors">
                LIHAT SEMUA PROGRAM KERJA
             </Link>
          </div>
        )}
      </section>

      {/* Alur Partisipasi (Updated Copywriting) */}
      <section id="about" className="bg-[#2B427A] py-24 text-white relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(#DFFF00_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight">ALUR PARTISIPASI</h2>
            <p className="text-[#DFFF00] font-mono text-lg uppercase tracking-widest border-2 border-[#DFFF00] inline-block px-4 py-1 rounded">GROWTH • NETWORK • SKILLS</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Step 1 */}
             <div className="bg-[#0B1CDE] p-8 rounded-2xl border-4 border-white shadow-[8px_8px_0px_0px_#DFFF00] hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-[#DFFF00] rounded-full border-4 border-[#2B427A] flex items-center justify-center text-3xl font-black text-[#2B427A] mb-6 shadow-[4px_4px_0px_0px_#2B427A]">1</div>
                <h3 className="text-2xl font-black mb-3 uppercase italic">Pilih Program</h3>
                <p className="text-blue-100 font-medium leading-relaxed">
                    Telusuri berbagai program kerja Bisdig yang sesuai dengan minat pengembangan dirimu. Dari seminar hingga workshop teknis.
                </p>
             </div>

             {/* Step 2 */}
             <div className="bg-[#2B427A] p-8 rounded-2xl border-4 border-[#DFFF00] shadow-[8px_8px_0px_0px_#0B1CDE] hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-white rounded-full border-4 border-[#2B427A] flex items-center justify-center text-3xl font-black text-[#2B427A] mb-6 shadow-[4px_4px_0px_0px_#2B427A]">2</div>
                <h3 className="text-2xl font-black mb-3 uppercase italic text-[#DFFF00]">Daftar Cepat</h3>
                <p className="text-blue-100 font-medium leading-relaxed">
                    Lakukan registrasi akun dan isi formulir pendaftaran event. Proses verifikasi yang cepat dan transparan oleh admin.
                </p>
             </div>

             {/* Step 3 */}
             <div className="bg-[#0B1CDE] p-8 rounded-2xl border-4 border-white shadow-[8px_8px_0px_0px_#DFFF00] hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-[#DFFF00] rounded-full border-4 border-[#2B427A] flex items-center justify-center text-3xl font-black text-[#2B427A] mb-6 shadow-[4px_4px_0px_0px_#2B427A]">3</div>
                <h3 className="text-2xl font-black mb-3 uppercase italic">Level Up</h3>
                <p className="text-blue-100 font-medium leading-relaxed">
                    Hadiri acaranya, dapatkan sertifikat, dan tingkatkan portofolio karirmu di dunia bisnis digital.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 max-w-4xl mx-auto px-4 w-full">
        <h2 className="text-4xl font-black text-[#2B427A] text-center mb-12 uppercase tracking-tight">Pusat Bantuan</h2>
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
