
import React from 'react';
import { Instagram, Youtube, Mail, Globe, Music } from 'lucide-react';
import { APP_NAME } from '../constants';
import '../types';

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
              <li><a href="#/events" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Program Kerja</a></li>
              <li><a href="#" className="text-blue-100 hover:text-[#DFFF00] transition-colors duration-200">Hubungi Dukungan</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 text-[#DFFF00]">Ikuti Kami</h4>
            <div className="flex space-x-4">
              {/* Instagram */}
              <a href="https://www.instagram.com/hmp_bisdigupy" target="_blank" rel="noopener noreferrer" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300" title="Instagram">
                  <Instagram className="w-5 h-5" />
              </a>
              
              {/* TikTok */}
              <a href="https://www.tiktok.com/@hmp_bisdigupy" target="_blank" rel="noopener noreferrer" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300" title="TikTok">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.14c0 3.48-2.3 6.66-5.5 7.64-3.23.98-6.85-.42-8.54-3.3-1.69-2.88-.83-6.66 2.06-8.5 1.44-.92 3.23-1.16 4.88-.66v4.18c-.85-.35-1.84-.28-2.65.17-1.17.65-1.55 2.16-.89 3.32.65 1.16 2.16 1.56 3.32.89 1.16-.65 1.56-2.16.89-3.32-.14-.24-.31-.46-.51-.64v-14z"/>
                  </svg>
              </a>

              {/* YouTube */}
              <a href="https://www.youtube.com/@Bigdity" target="_blank" rel="noopener noreferrer" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300" title="YouTube">
                  <Youtube className="w-5 h-5" />
              </a>

              {/* Email */}
              <a href="mailto:eventhmpbisdigupy@gmail.com" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300" title="Email Kami">
                  <Mail className="w-5 h-5" />
              </a>

               {/* HMP Web Page */}
               <a href="https://bisdig.upy.ac.id/hmp/" target="_blank" rel="noopener noreferrer" className="bg-[#0B1CDE] p-2 rounded-full text-white hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all duration-300" title="Web Page HMP">
                  <Globe className="w-5 h-5" />
              </a>
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
