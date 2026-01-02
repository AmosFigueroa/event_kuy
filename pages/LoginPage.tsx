
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
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 ${isAdminMode ? 'bg-[#FFFBF0]' : 'bg-[#2B427A]'}`}>
      
      {/* Background Shapes (Similar to Home) */}
      {!isAdminMode && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0B1CDE] rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#DFFF00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </>
      )}

      <div className={`w-full max-w-md bg-white rounded-2xl transition-all duration-300 overflow-hidden relative z-10 ${isAdminMode ? 'border-4 border-[#0B1CDE] shadow-[10px_10px_0px_0px_#0B1CDE]' : 'border-4 border-[#DFFF00] shadow-[10px_10px_0px_0px_#DFFF00]'}`}>
        
        {/* Header Section */}
        <div className={`p-8 pb-0 text-center ${isAdminMode ? 'text-[#0B1CDE]' : 'text-[#2B427A]'}`}>
            {isAdminMode ? (
                <>
                   <div className="inline-block p-3 rounded-full bg-[#0B1CDE] text-white mb-4 shadow-lg"><ShieldCheck className="w-8 h-8"/></div>
                   <h1 className="text-3xl font-black mb-2 tracking-tight uppercase">Admin Access</h1>
                   <p className="text-gray-500 font-bold text-sm">Verifikasi identitas Anda dengan PIN.</p>
                </>
            ) : (
                <>
                   <div className="inline-block p-3 rounded-full bg-[#DFFF00] text-[#2B427A] border-2 border-[#2B427A] mb-4 shadow-[4px_4px_0px_0px_#2B427A]"><User className="w-8 h-8"/></div>
                   <h1 className="text-3xl font-black text-[#2B427A] mb-2 tracking-tight uppercase">{isRegistering ? 'DAFTAR AKUN' : 'LOGIN PESERTA'}</h1>
                   <p className="text-[#2B427A]/70 font-bold text-sm">{isRegistering ? 'Gabung komunitas Event Bisdig.' : 'Kelola tiket dan sertifikatmu.'}</p>
                </>
            )}
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-6 bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm font-black animate-pulse shadow-[4px_4px_0px_0px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 bg-green-100 border-2 border-green-600 text-green-700 p-3 rounded-xl flex items-center gap-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(22,163,74,0.2)]">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* NAME INPUT (Registration Only) */}
            {isRegistering && (
              <div className="animate-fade-in">
                <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    required={isRegistering} 
                    placeholder="Nama Lengkap"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#2B427A] rounded-xl focus:border-[#0B1CDE] focus:shadow-[4px_4px_0px_0px_#0B1CDE] outline-none font-bold text-[#2B427A] transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            )}

            {/* EMAIL INPUT */}
            <div>
              <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Email</label>
              <div className="relative">
                <div className={`absolute left-4 top-3.5 w-5 h-5 ${isAdminMode ? 'text-[#0B1CDE]' : 'text-gray-400'}`}>
                    {isAdminMode ? <ShieldCheck className="w-full h-full" /> : <Mail className="w-full h-full" />}
                </div>
                <input 
                  type="email" 
                  required 
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none font-bold transition-all border-2 ${
                      isAdminMode 
                      ? 'bg-blue-50 border-[#0B1CDE] text-[#0B1CDE] focus:shadow-[4px_4px_0px_0px_#0B1CDE]' 
                      : 'bg-white border-[#2B427A] text-[#2B427A] focus:border-[#0B1CDE] focus:shadow-[4px_4px_0px_0px_#0B1CDE]'
                  }`}
                />
              </div>
            </div>

            {/* ADMIN OTP INPUT */}
            {isAdminMode && !isRegistering && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-black text-[#2B427A] uppercase">PIN Admin</label>
                        <button 
                            type="button" 
                            onClick={handleSendOtp}
                            disabled={sendingOtp || timer > 0}
                            className="text-xs font-black text-[#0B1CDE] hover:underline disabled:text-gray-400 disabled:no-underline transition-colors uppercase tracking-wide"
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
                            className="w-full pl-12 pr-12 py-3 bg-white border-2 border-[#0B1CDE] rounded-xl focus:shadow-[4px_4px_0px_0px_#0B1CDE] outline-none font-black text-[#2B427A] tracking-widest transition-all text-xl"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowOtp(!showOtp)}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-[#0B1CDE] focus:outline-none"
                        >
                            {showOtp ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* USER PASSWORD INPUT */}
            {!isAdminMode && (
              <div className="animate-fade-in">
                <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#2B427A] rounded-xl focus:border-[#0B1CDE] focus:shadow-[4px_4px_0px_0px_#0B1CDE] outline-none font-black text-[#2B427A] transition-all"
                  />
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 border-2 border-black
                  ${isAdminMode 
                      ? 'bg-[#0B1CDE] text-white hover:bg-[#0916B0]' 
                      : 'bg-[#DFFF00] text-[#2B427A] hover:bg-[#ccff00]'}`}
            >
              {loading ? <Loader className="w-6 h-6 animate-spin"/> : (isAdminMode ? 'LOGIN ADMIN' : (isRegistering ? 'DAFTAR SEKARANG' : 'MASUK'))}
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
                    {isRegistering ? 'LOGIN DI SINI' : 'BUAT AKUN'}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
