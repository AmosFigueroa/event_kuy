
import React, { useEffect, useState } from 'react';
import { Calendar, History, Rocket, Loader, AlertCircle } from 'lucide-react';
import EventCard from '../components/EventCard';
import { fetchEvents } from '../services/api';
import { Event } from '../types';

const EventsPage: React.FC = () => {
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        const now = new Date();
        // Set time to 00:00:00 for accurate date comparison ignoring exact time
        now.setHours(0, 0, 0, 0);

        const active: Event[] = [];
        const past: Event[] = [];

        data.forEach(event => {
            // Force strict date parsing
            const eventDate = new Date(event.date);
            // Reset hours for the event date as well to ensure fairness
            eventDate.setHours(0,0,0,0);

            if (eventDate >= now) {
                active.push(event);
            } else {
                past.push(event);
            }
        });

        // Sort active events by nearest date first
        active.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Sort past events by most recent first
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setActiveEvents(active);
        setPastEvents(past);
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <div className="flex flex-col items-center">
                <Loader className="w-12 h-12 text-[#2B427A] animate-spin mb-4" />
                <p className="font-black text-[#2B427A] uppercase tracking-widest animate-pulse">Memuat Program Kerja...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
        {/* Header Section */}
        <div className="bg-[#2B427A] pt-20 pb-20 border-b-4 border-[#DFFF00]">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
                    Program Kerja <span className="text-[#DFFF00]">HMP</span>
                </h1>
                <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">
                    Ikuti terus agenda kegiatan Himpunan Mahasiswa Bisnis Digital. Berkembang, berkolaborasi, dan berinovasi bersama.
                </p>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 -mt-10">
            {/* Active / Ongoing Events Section */}
            <section className="mb-20">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-[#DFFF00] border-2 border-[#2B427A] rounded-lg shadow-[4px_4px_0px_0px_#2B427A]">
                        <Rocket className="w-6 h-6 text-[#2B427A]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-[#2B427A] uppercase tracking-tight">Sedang Berjalan</h2>
                        <p className="text-sm font-bold text-[#0B1CDE]">Jangan sampai ketinggalan!</p>
                    </div>
                </div>

                {activeEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {activeEvents.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-[#2B427A] rounded-xl p-12 text-center shadow-[6px_6px_0px_0px_#2B427A]">
                        <div className="w-16 h-16 bg-gray-100 rounded-full border-2 border-[#2B427A] flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-black text-[#2B427A] mb-1">TIDAK ADA EVENT AKTIF</h3>
                        <p className="text-gray-500 font-medium">Nantikan program kerja kami selanjutnya!</p>
                    </div>
                )}
            </section>

            {/* Past Events / History Section */}
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-white border-2 border-[#2B427A] rounded-lg shadow-[4px_4px_0px_0px_#2B427A]">
                        <History className="w-6 h-6 text-[#2B427A]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-[#2B427A] uppercase tracking-tight">Histori Event</h2>
                        <p className="text-sm font-bold text-gray-500">Jejak langkah kegiatan kami sebelumnya</p>
                    </div>
                </div>

                {pastEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-90 hover:opacity-100 transition-opacity">
                        {pastEvents.map(event => (
                            <div key={event.id} className="relative">
                                {/* Overlay to indicate it's past */}
                                <div className="absolute top-4 right-4 z-10 bg-gray-600 text-white text-xs font-black px-3 py-1 rounded border-2 border-white uppercase transform rotate-2">
                                    SELESAI
                                </div>
                                <EventCard event={{...event, isOpen: false}} /> 
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/50 border-2 border-dashed border-[#2B427A] rounded-xl p-8 text-center">
                        <p className="text-gray-500 font-bold">Belum ada histori event.</p>
                    </div>
                )}
            </section>
        </div>
    </div>
  );
};

export default EventsPage;
