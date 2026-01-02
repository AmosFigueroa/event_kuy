
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, DollarSign } from 'lucide-react';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { price } = location.state || { price: 0 };

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
                <DollarSign className="w-7 h-7 text-[#2B427A]" strokeWidth={2.5} />
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
