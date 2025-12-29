import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Event } from '../types';
import { Link } from 'react-router-dom';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full">
      <div className="relative h-48 bg-gray-200">
        <img 
          src={event.bannerUrl || `https://picsum.photos/400/200?random=${event.id}`} 
          alt={event.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wide">
          {event.category}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
        
        <div className="space-y-2 mb-4 text-gray-600 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>{new Date(event.date).toLocaleDateString()} pukul {event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>{event.currentParticipants} / {event.maxParticipants} Terdaftar</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">
          {event.description}
        </p>

        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <span className="text-lg font-bold text-gray-900">
            {event.price === 0 ? "Gratis" : `Rp ${event.price.toLocaleString('id-ID')}`}
          </span>
          {event.isOpen ? (
            <Link 
              to={`/event/${event.id}`}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Detail & Daftar
            </Link>
          ) : (
            <span className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed">
              Ditutup
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;