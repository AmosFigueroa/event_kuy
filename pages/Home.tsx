import React, { useEffect, useState } from 'react';
import { ArrowRight, Info, CheckCircle, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { FAQ_DATA } from '../constants';
import { fetchEvents } from '../services/api';
import { Event } from '../types';

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    title: "Temukan Acara yang Menginspirasi",
    subtitle: "Bergabunglah dengan ribuan orang lainnya dalam workshop, konferensi, dan seminar."
  },
  {
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    title: "Tingkatkan Keahlian Anda",
    subtitle: "Berpartisipasilah dalam workshop praktis dan kelas master."
  },
  {
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    title: "Terhubung Dengan Para Pemimpin",
    subtitle: "Bangun jaringan dengan profesional industri dan kembangkan karier Anda."
  }
];

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        // Sort by date upcoming
        const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(sorted.slice(0, 3)); // Show top 3 events
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Slider Section */}
      <section className="relative h-[600px] text-white overflow-hidden">
        {HERO_SLIDES.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${slide.image}')` }}
            >
              <div className="absolute inset-0 bg-black/50"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto">
                  {slide.subtitle}
                </p>
                <div className="flex justify-center gap-4">
                  <Link to="/events" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-semibold text-lg transition-transform hover:scale-105 flex items-center gap-2">
                    Jelajahi Acara <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a href="#how-it-works" className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full font-semibold text-lg transition-colors border border-white/30">
                    Cara Kerja
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Slider Controls */}
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur text-white transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur text-white transition-colors">
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-white scale-125' : 'bg-white/50'}`}
            />
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-20 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Acara Mendatang</h2>
            <p className="text-gray-500 mt-2">Jangan lewatkan kesempatan ini.</p>
          </div>
          <Link to="/events" className="text-indigo-600 font-semibold hover:text-indigo-800 hidden md:block">
            Lihat Semua &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-100 rounded-xl">
             <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <p className="text-gray-600">Tidak ada acara mendatang ditemukan. Jadilah yang pertama membuatnya!</p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Cara Berpartisipasi</h2>
            <p className="text-gray-500 mt-2">Pendaftaran mudah dan aman.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "1. Pilih Acara", desc: "Jelajahi daftar kami dan temukan acara yang sesuai untuk Anda.", icon: <Info /> },
              { title: "2. Daftar & Bayar", desc: "Isi formulir dan unggah bukti pembayaran Anda secara manual.", icon: <CheckCircle /> },
              { title: "3. Dapatkan Tiket", desc: "Terima E-Tiket Anda melalui email setelah persetujuan admin.", icon: <ArrowRight /> }
            ].map((step, idx) => (
              <div key={idx} className="bg-white p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 max-w-4xl mx-auto px-4 w-full">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Pertanyaan yang Sering Diajukan</h2>
        <div className="space-y-4">
          {FAQ_DATA.map((faq, index) => (
            <details key={index} className="group bg-white rounded-lg shadow-sm border border-gray-200 open:border-indigo-500 transition-all duration-300">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-gray-900 list-none">
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  {faq.question}
                </span>
                <span className="transform group-open:rotate-180 transition-transform duration-300">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
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