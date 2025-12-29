import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Rocket, Settings, Mic } from 'lucide-react';
import { APP_NAME } from '../constants';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const isActive = (path: string) => location.pathname === path 
    ? "text-[#0B1CDE] font-black border-b-2 border-[#0B1CDE]" 
    : "text-[#2B427A] font-bold hover:text-[#0B1CDE] transition-colors";

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b-2 border-[#2B427A]/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <img 
                src="https://i.ibb.co.com/pvmjtG8q/logo-email-event-bisdig.png" 
                alt={APP_NAME} 
                className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`py-1 ${isActive('/')}`}>BERANDA</Link>
            <Link to="/events" className={`py-1 ${isActive('/events')}`}>PROGRAM KERJA</Link>
            <Link to="/dashboard/user" className={`py-1 ${isActive('/dashboard/user')}`}>TIKET SAYA</Link>
            <Link 
                to="/dashboard/admin" 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-[#2B427A] font-bold transition-all duration-200 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2B427A] ${location.pathname === '/dashboard/admin' ? 'bg-[#DFFF00] text-[#2B427A]' : 'bg-white text-[#2B427A] hover:bg-[#DFFF00]'}`}
            >
               <Settings className="w-4 h-4" /> ADMIN
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-[#2B427A] hover:text-[#0B1CDE] focus:outline-none p-2 bg-[#DFFF00] rounded-md border-2 border-[#2B427A]">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#2B427A] border-t-2 border-[#DFFF00]">
          <div className="px-4 pt-4 pb-6 space-y-2">
            <Link to="/" onClick={toggleMenu} className="block px-4 py-3 text-white font-bold hover:bg-[#0B1CDE] rounded-lg">BERANDA</Link>
            <Link to="/events" onClick={toggleMenu} className="block px-4 py-3 text-white font-bold hover:bg-[#0B1CDE] rounded-lg">PROGRAM KERJA</Link>
            <Link to="/dashboard/user" onClick={toggleMenu} className="block px-4 py-3 text-white font-bold hover:bg-[#0B1CDE] rounded-lg">TIKET SAYA</Link>
            <Link to="/dashboard/admin" onClick={toggleMenu} className="block px-4 py-3 bg-[#DFFF00] text-[#2B427A] font-black rounded-lg mt-4 text-center">LOGIN ADMIN</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;