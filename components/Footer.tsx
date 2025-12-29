import React from 'react';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';
import { APP_NAME } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2B427A] text-white pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h3 className="text-3xl font-black text-[#DFFF00] tracking-tight">{APP_NAME}</h3>
            <p className="text-blue-100 max-w-sm leading-relaxed">
              Platform utama Anda untuk menemukan dan mengelola acara. 
              Bergabunglah dengan kami untuk menciptakan pengalaman tak terlupakan atau berpartisipasi dalam workshop yang mengubah hidup.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-6 text-[#DFFF00]">Tautan Cepat</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Tentang Kami</a></li>
              <li><a href="#" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Acara</a></li>
              <li><a href="#" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Hubungi Dukungan</a></li>
              <li><a href="#" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Kebijakan Privasi</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 text-[#DFFF00]">Hubungkan</h4>
            <div className="flex space-x-4">
              <a href="#" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300"><Mail className="w-5 h-5" /></a>
            </div>
            <p className="mt-8 text-sm text-blue-200/60">
              © {new Date().getFullYear()} {APP_NAME}. Hak cipta dilindungi undang-undang.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;