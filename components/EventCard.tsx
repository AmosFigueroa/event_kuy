import React from 'react';
import { Calendar, MapPin, Users, ArrowRight, Tag } from 'lucide-react';
import { Event } from '../types';
import { Link } from 'react-router-dom';
import { createSlug } from '../services/api';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const eventLink = `/event/${createSlug(event.title) || event.id}`;

  return (
    <div className="group bg-white rounded-xl border-2 border-[#2B427A] shadow-[6px_6px_0px_0px_#2B427A] hover:shadow-[8px_8px_0px_0px_#0B1CDE] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full relative">
      <div className="relative h-52 bg-gray-200 overflow-hidden border-b-2 border-[#2B427A]">
        <img 
          src={event.bannerUrl || `https://picsum.photos/400/200?random=${event.id}`} 
          alt={event.title} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute top-0 right-0 bg-[#DFFF00] border-l-2 border-b-2 border-[#2B427A] px-4 py-2 text-xs font-black text-[#2B427A] uppercase tracking-wider">
          {event.category}
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-black text-[#2B427A] mb-3 line-clamp-2 uppercase tracking-tight leading-6">
          {event.title}
        </h3>
        
        <div className="space-y-3 mb-5 text-[#2B427A] text-sm font-medium">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#0B1CDE]" />
            <span>{new Date(event.date).toLocaleDateString()} | {event.time}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#0B1CDE]" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#0B1CDE]" />
            <span>{event.currentParticipants} / {event.maxParticipants} Peserta</span>
          </div>
        </div>

        <div className="mt-auto pt-5 border-t-2 border-dashed border-[#2B427A]/20">
          <div className="flex items-center justify-between">
            <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Harga Tiket</p>
                <span className="text-lg font-black text-[#0B1CDE]">
                    {event.price === 0 ? "GRATIS" : `Rp ${event.price.toLocaleString('id-ID')}`}
                </span>
            </div>
            
            {event.isOpen ? (
              <Link 
                to={eventLink}
                className="px-4 py-2 bg-[#2B427A] text-white text-sm font-bold rounded-lg hover:bg-[#DFFF00] hover:text-[#2B427A] border-2 border-transparent hover:border-[#2B427A] transition-all flex items-center gap-2"
              >
                DAFTAR
              </Link>
            ) : (
              <span className="px-4 py-2 bg-gray-200 text-gray-500 text-sm font-bold rounded-lg border-2 border-gray-300 cursor-not-allowed">
                TUTUP
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;