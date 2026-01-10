
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { fetchEvents } from '../services/api';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { price, eventId } = location.state || { price: 0, eventId: null };
  const [groupLink, setGroupLink] = useState<string | null>(null);

  useEffect(() => {
      const getLink = async () => {
          if (eventId) {
              try {
                  const events = await fetchEvents();
                  const evt = events.find(e => e.id === eventId);
                  if (evt && evt.groupLink) {
                      setGroupLink(evt.groupLink);
                  }
              } catch(e) {}
          }
      };
      getLink();
  }, [eventId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl border-2 border-[#2B427A] shadow-[12px_12px_0px_0px_#DFFF00] p-8 relative overflow-hidden animate-scale-up">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">BIAYA</p>
                <h1 className="text-4xl font-black text-[#0B1CDE] tracking-tight">
                    {price === 0 ? "GRATIS" : `Rp ${price.toLocaleString('id-ID')}`}
                </h1>
            </div>
            <div className="w-12 h-12 bg-[#DFFF00] rounded-xl border-2 border-[#2B427A] flex items-center justify-center transform hover:rotate-12 transition-transform">
                <i className="fi fi-bs-money-bill-wave text-[#2B427A] text-2xl leading-none flex"></i>
            </div>
        </div>

        <div className="h-0.5 w-full bg-gray-100 mb-10"></div>

        {/* Center Content */}
        <div className="text-center flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-[#DFFF00] rounded-full border-2 border-[#2B427A] flex items-center justify-center mb-6 shadow-sm">
                <Check className="w-12 h-12 text-[#2B427A]" strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-black text-[#2B427A] uppercase mb-3 tracking-tight">BERHASIL!</h2>
            <p className="text-gray-500 font-bold leading-relaxed px-6 text-sm">
                Pendaftaran diterima. Cek email untuk info selanjutnya.
            </p>
        </div>

        {/* Group Link Button */}
        {groupLink && (
            <a 
                href={groupLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3 bg-green-500 text-white rounded-xl font-black text-lg border-2 border-green-600 hover:bg-green-600 transition-all flex items-center justify-center gap-2 mb-3 shadow-md"
            >
                <MessageCircle className="w-5 h-5"/> GABUNG GRUP WHATSAPP
            </a>
        )}

        {/* Footer Button */}
        <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-[#2B427A] text-white rounded-xl font-black text-lg border-2 border-[#2B427A] hover:bg-[#0B1CDE] transition-all shadow-lg hover:translate-y-[-2px]"
        >
            KEMBALI KE BERANDA
        </button>
      </div>

      <style>{`
        @keyframes scale-up {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccessPage;
