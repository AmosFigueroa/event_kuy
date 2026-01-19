
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Rocket, LogIn, Mic, Calendar, User, LogOut } from 'lucide-react';
import { APP_NAME } from '../constants';
import { getUserSession, logout } from '../services/api';
import '../types';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUserSession();

  const toggleMenu = () => setIsOpen(!isOpen);

  const isActive = (path: string) => location.pathname === path 
    ? "text-[#0B1CDE] font-black border-b-2 border-[#0B1CDE]" 
    : "text-[#2B427A] font-bold hover:text-[#0B1CDE] transition-colors";

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    return user.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Login';
    return user.role === 'ADMIN' ? 'Admin Panel' : 'Tiket Saya';
  };

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b-2 border-[#2B427A]/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
              <div className="bg-[#DFFF00] p-2 border-2 border-[#2B427A] rounded-lg shadow-[4px_4px_0px_0px_#2B427A] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_#2B427A] transition-all">
                <Calendar className="h-6 w-6 text-[#2B427A]" />
              </div>
              <span className="text-xl font-black text-[#2B427A] uppercase tracking-tighter">
                EVENT BISDIG
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`py-1 ${isActive('/')}`}>BERANDA</Link>
            <Link to="/events" className={`py-1 ${isActive('/events')}`}>PROGRAM KERJA</Link>
            
            {user ? (
                <>
                    <Link 
                        to={getDashboardLink()} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-[#2B427A] font-bold transition-all duration-200 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2B427A] bg-[#DFFF00] text-[#2B427A]`}
                    >
                       <User className="w-4 h-4" /> {getDashboardLabel()}
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className="text-[#2B427A] hover:text-red-600 font-bold transition-colors"
                        title="Keluar"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </>
            ) : (
                <Link 
                    to="/login" 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-[#2B427A] font-bold transition-all duration-200 shadow-[4px_4px_0px_0px_#2B427A] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2B427A] bg-white text-[#2B427A] hover:bg-[#DFFF00]`}
                >
                   <LogIn className="w-4 h-4" /> LOGIN
                </Link>
            )}
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
            
            {user ? (
                <>
                    <Link to={getDashboardLink()} onClick={toggleMenu} className="block px-4 py-3 bg-[#DFFF00] text-[#2B427A] font-black rounded-lg mt-4 text-center">
                         {getDashboardLabel()}
                    </Link>
                    <button onClick={() => { handleLogout(); toggleMenu(); }} className="block w-full px-4 py-3 text-red-300 font-bold hover:text-white text-center">
                         KELUAR
                    </button>
                </>
            ) : (
                <Link to="/login" onClick={toggleMenu} className="block px-4 py-3 bg-[#DFFF00] text-[#2B427A] font-black rounded-lg mt-4 text-center">
                     LOGIN AKUN
                </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
