
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, LogIn, LayoutDashboard, Calendar } from 'lucide-react';
import { getUserSession, logout } from '../services/api';
import '../types';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUserSession();

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
        <div className="flex justify-between h-20 items-center">
          {/* LOGO SECTION */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
              <div className="bg-[#DFFF00] p-1.5 border-2 border-[#2B427A] rounded-lg shadow-[4px_4px_0px_0px_#2B427A] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_#2B427A] transition-all">
                <Calendar className="h-7 w-7 text-[#2B427A]" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xl font-black text-[#2B427A] uppercase tracking-tighter leading-none">
                    EVENT BISDIG
                  </span>
                  {user?.role === 'ADMIN' && (
                    <span className="text-[10px] font-bold text-[#0B1CDE] tracking-widest hidden sm:block">
                      MANAGEMENT SYSTEM
                    </span>
                  )}
              </div>
            </Link>
          </div>
          
          {/* DESKTOP MENU (Home, Events, etc shown) */}
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
                        className="text-[#2B427A] hover:text-red-600 font-bold transition-colors p-2 rounded hover:bg-red-50"
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

          {/* MOBILE MENU (ONLY DASHBOARD/LOGIN ACCESS) */}
          <div className="md:hidden flex items-center gap-3">
            {user ? (
                <>
                    <Link 
                        to={getDashboardLink()} 
                        className="flex items-center gap-2 px-4 py-2 bg-[#2B427A] text-white rounded-lg font-black text-xs border-2 border-[#2B427A] active:scale-95 transition-transform"
                    >
                       <LayoutDashboard className="w-4 h-4 text-[#DFFF00]" /> 
                       {user.role === 'ADMIN' ? 'ADMIN' : 'TIKETKU'}
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className="p-2 bg-red-100 text-red-600 rounded-lg border-2 border-red-200 active:bg-red-200"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </>
            ) : (
                <Link 
                    to="/login" 
                    className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] text-[#2B427A] rounded-lg font-black text-xs border-2 border-[#2B427A] shadow-[2px_2px_0px_0px_#2B427A] active:translate-y-[1px] active:shadow-none transition-all"
                >
                   <LogIn className="w-4 h-4" /> LOGIN
                </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
