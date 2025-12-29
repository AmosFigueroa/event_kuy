import React from 'react';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';
import { APP_NAME } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-indigo-400 mb-4">{APP_NAME}</h3>
            <p className="text-gray-400 max-w-sm">
              Platform utama Anda untuk menemukan dan mengelola acara. 
              Bergabunglah dengan kami untuk menciptakan pengalaman tak terlupakan atau berpartisipasi dalam workshop yang mengubah hidup.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-200">Tautan Cepat</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-indigo-400">Tentang Kami</a></li>
              <li><a href="#" className="text-gray-400 hover:text-indigo-400">Acara</a></li>
              <li><a href="#" className="text-gray-400 hover:text-indigo-400">Hubungi Dukungan</a></li>
              <li><a href="#" className="text-gray-400 hover:text-indigo-400">Kebijakan Privasi</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-200">Hubungkan</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-indigo-400"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-indigo-400"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-indigo-400"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-indigo-400"><Mail className="w-5 h-5" /></a>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              © {new Date().getFullYear()} {APP_NAME}. Hak cipta dilindungi undang-undang.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;