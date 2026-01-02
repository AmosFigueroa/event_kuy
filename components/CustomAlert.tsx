
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface CustomAlertProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void; // For confirmation dialogs
  confirmText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ isOpen, type, title, message, onClose, onConfirm, confirmText }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-12 h-12 text-[#DFFF00]" />;
      case 'error': return <XCircle className="w-12 h-12 text-red-500" />;
      default: return <Info className="w-12 h-12 text-[#0B1CDE]" />;
    }
  };

  const getBorderColor = () => {
     switch (type) {
      case 'success': return 'border-[#DFFF00]';
      case 'error': return 'border-red-500';
      default: return 'border-[#0B1CDE]';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B427A]/60 backdrop-blur-sm animate-fade-in">
      <div 
        className={`bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border-4 ${getBorderColor()} transform transition-all animate-scale-up relative`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-[#2B427A]">
            <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
            <div className={`p-4 rounded-full bg-[#2B427A] mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]`}>
                {getIcon()}
            </div>
            
            <h3 className="text-xl font-black text-[#2B427A] uppercase mb-2 tracking-tight">
                {title}
            </h3>
            
            <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                {message}
            </p>

            <div className="flex gap-4 w-full">
                {onConfirm ? (
                    <>
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            BATAL
                        </button>
                        <button 
                            onClick={() => { onConfirm(); onClose(); }}
                            className="flex-1 py-3 px-4 bg-[#2B427A] text-white rounded-xl font-black border-2 border-[#2B427A] hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all shadow-[2px_2px_0px_0px_#000]"
                        >
                            {confirmText || 'YA, LANJUTKAN'}
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-[#2B427A] text-white rounded-xl font-black border-2 border-[#2B427A] hover:bg-[#DFFF00] hover:text-[#2B427A] transition-all shadow-[4px_4px_0px_0px_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000]"
                    >
                        MENGERTI
                    </button>
                )}
            </div>
        </div>
      </div>
      <style>{`
        @keyframes scale-up {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CustomAlert;
