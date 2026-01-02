import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, ShieldCheck, User, Lock, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import { loginUser, registerAccount, loginWithOtp, requestLoginOtp } from '../services/api';

const ADMIN_EMAILS = [
  "bisnisdigitalhmp@gmail.com",
  "eventhmpbisdigupy@gmail.com",
  "mywebnestid@gmail.com"
];

const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const navigate = useNavigate();

  // Auto-switch visual state when admin email is entered
  useEffect(() => {
    const formattedEmail = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(formattedEmail)) {
        setIsAdminMode(true);
        setPassword(''); 
        setError(''); // Clear error when switching modes
    } else {
        setIsAdminMode(false);
    }
  }, [email]);

  // Countdown timer logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    if (!email) {
        setError("Masukkan email terlebih dahulu.");
        return;
    }
    setSendingOtp(true);
    setError('');
    setSuccessMsg('');
    try {
        await requestLoginOtp(email);
        setTimer(60);
        setSuccessMsg("PIN/OTP telah dikirim ke email Anda.");
    } catch (err: any) {
        setError(err.message || "Gagal mengirim PIN.");
    } finally {
        setSendingOtp(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // 1. REGISTER FLOW
      if (isRegistering) {
        if (!name || !password) { setError("Lengkapi data pendaftaran."); setLoading(false); return; }
        await registerAccount(name, email, password);
        setIsRegistering(false);
        setSuccessMsg("Akun berhasil dibuat! Silakan login.");
        setPassword('');
        setLoading(false);
        return;
      } 
      
      let result;

      // 2. ADMIN LOGIN FLOW (Email + OTP)
      if (isAdminMode) {
         if (!otp) { setError("Masukkan PIN Admin (Kode OTP)."); setLoading(false); return; }
         result = await loginWithOtp(email, otp);
      } 
      // 3. USER LOGIN FLOW (Email + Password)
      else {
         if (!password) { setError("Masukkan password."); setLoading(false); return; }
         result = await loginUser(email, password);
      }
      
      // Handle Success
      if (result && (result.valid || result.success)) {
        const session = {
            email: result.email,
            role: result.role,
            name: result.name,
            isLoggedIn: true
        };
        localStorage.setItem('user_session', JSON.stringify(session));

        if (result.role === 'ADMIN') {
            navigate('/dashboard/admin');
        } else {
            navigate('/dashboard/user');
        }
        window.location.reload();
      } else {
         setError("Login gagal. Periksa kembali kredensial Anda.");
      }
      
    } catch (err: any) {
      setError(err.message || "Autentikasi gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${isAdminMode ? 'bg-[#FFFBF0]' : 'bg-[#F8FAFC]'}`}>
      <div className={`w-full max-w-md bg-white rounded-3xl transition-all duration-300 overflow-hidden ${isAdminMode ? 'shadow-2xl border border-gray-100' : 'border-2 border-[#2B427A] shadow-[8px_8px_0px_0px_#2B427A]'}`}>
        
        {/* Header Section */}
        <div className="p-8 pb-0 text-center">
            {isAdminMode ? (
                <>
                   <h1 className="text-3xl font-black text-[#1E293B] mb-2 tracking-tight">Admin Panel Login</h1>
                   <p className="text-gray-500 font-medium text-sm">Masukkan PIN Keamanan.</p>
                </>
            ) : (
                <>
                   <h1 className="text-2xl font-black text-[#2B427A] mb-2 tracking-tight uppercase">{isRegistering ? 'Buat Akun Baru' : 'Login Peserta'}</h1>
                   <p className="text-blue-400 font-bold text-sm">{isRegistering ? 'Mulai perjalanan eventmu disini.' : 'Masuk untuk mengakses tiketmu.'}</p>
                </>
            )}
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* NAME INPUT (Registration Only) */}
            {isRegistering && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    required={isRegistering} 
                    placeholder="Nama Anda"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#2B427A] focus:ring-2 focus:ring-[#2B427A]/10 outline-none font-semibold text-gray-700 transition-all"
                  />
                </div>
              </div>
            )}

            {/* EMAIL INPUT */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username / Email</label>
              <div className="relative">
                <div className={`absolute left-4 top-3.5 w-5 h-5 ${isAdminMode ? 'text-[#0B1CDE]' : 'text-gray-400'}`}>
                    {isAdminMode ? <ShieldCheck className="w-full h-full" /> : <Mail className="w-full h-full" />}
                </div>
                <input 
                  type="email" 
                  required 
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none font-bold transition-all ${
                      isAdminMode 
                      ? 'bg-[#F0F9FF] border-2 border-[#D1E9FF] text-[#0B1CDE] focus:border-[#0B1CDE]' 
                      : 'bg-gray-50 border border-gray-200 text-gray-700 focus:bg-white focus:border-[#2B427A] focus:ring-2 focus:ring-[#2B427A]/10'
                  }`}
                />
              </div>
            </div>

            {/* ADMIN OTP INPUT */}
            {isAdminMode && !isRegistering && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">PIN Admin (Kode OTP)</label>
                        <button 
                            type="button" 
                            onClick={handleSendOtp}
                            disabled={sendingOtp || timer > 0}
                            className="text-xs font-black text-gray-400 hover:text-[#0B1CDE] hover:underline disabled:text-gray-300 disabled:no-underline transition-colors uppercase tracking-wide"
                        >
                            {sendingOtp ? 'MENGIRIM...' : (timer > 0 ? `KIRIM ULANG (${timer}s)` : 'KIRIM PIN')}
                        </button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                            type={showOtp ? "text" : "password"}
                            required 
                            placeholder="••••••"
                            value={otp}
                            onChange={(e) => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
                            className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#0B1CDE] focus:ring-2 focus:ring-[#0B1CDE]/10 outline-none font-bold text-gray-700 tracking-widest transition-all"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowOtp(!showOtp)}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showOtp ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* USER PASSWORD INPUT */}
            {!isAdminMode && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#2B427A] focus:ring-2 focus:ring-[#2B427A]/10 outline-none font-semibold text-gray-700 transition-all"
                  />
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 
                  ${isAdminMode 
                      ? 'bg-[#0B1CDE] text-white hover:bg-[#0916B0]' 
                      : 'bg-[#2B427A] text-white hover:bg-[#1E2E55]'}`}
            >
              {loading ? <Loader className="w-6 h-6 animate-spin"/> : (isAdminMode ? 'Login Admin' : (isRegistering ? 'Daftar Sekarang' : 'Masuk'))}
            </button>
            
          </form>

          {/* Footer Actions */}
          <div className="mt-8 text-center space-y-3">
             <div className="text-sm font-bold text-gray-500">
                {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'} {' '}
                <button 
                    type="button" 
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                        setSuccessMsg('');
                    }}
                    className={`font-black hover:underline ${isAdminMode ? 'text-[#0B1CDE]' : 'text-[#2B427A]'}`}
                >
                    {isRegistering ? 'Login Di Sini' : 'Bikin sini'}
                </button>
             </div>
             {!isRegistering && !isAdminMode && (
                 <button className="text-xs font-bold text-gray-400 hover:text-gray-600">Lupa password?</button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;