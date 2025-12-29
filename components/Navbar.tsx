import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Rocket, User, Settings } from 'lucide-react';
import { APP_NAME } from '../constants';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const isActive = (path: string) => location.pathname === path ? "text-indigo-600 font-semibold" : "text-gray-600 hover:text-indigo-600";

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <Rocket className="h-8 w-8 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900">{APP_NAME}</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={isActive('/')}>Beranda</Link>
            <Link to="/events" className={isActive('/events')}>Acara</Link>
            <Link to="/dashboard/user" className={isActive('/dashboard/user')}>Tiket Saya</Link>
            <Link to="/dashboard/admin" className={`flex items-center gap-1 ${isActive('/dashboard/admin')}`}>
               <Settings className="w-4 h-4" /> Admin
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-gray-500 hover:text-gray-700 focus:outline-none">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Beranda</Link>
            <Link to="/events" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Acara</Link>
            <Link to="/dashboard/user" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Tiket Saya</Link>
            <Link to="/dashboard/admin" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Dashboard Admin</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;