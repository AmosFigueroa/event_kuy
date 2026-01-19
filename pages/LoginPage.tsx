
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, ShieldCheck, User, Lock, Eye, EyeOff, Loader, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { loginUser, registerAccount, loginWithOtp, requestLoginOtp, resetPassword } from '../services/api';
import CustomAlert from '../components/CustomAlert';

const ADMIN_EMAILS = [
  "bisnisdigitalhmp@gmail.com",
  "eventhmpbisdigupy@gmail.com",
  "mywebnestid@gmail.com"
];

const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0: Request OTP, 1: Confirm Reset
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false); // Controls password visibility for both User/Admin
  const [timer, setTimer] = useState(0);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // Alert State replacement for inline error/success
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onConfirm?: () => void) => {
    setAlertState({ isOpen: true, type, title, message, onConfirm });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };
  
  const navigate = useNavigate();

  // Auto-switch visual state when admin email is entered
  useEffect(() => {
    if (!isResetting) {
        const formattedEmail = email.toLowerCase().trim();
        if (ADMIN_EMAILS.includes(formattedEmail)) {
            setIsAdminMode(true);
            setPassword(''); 
        } else {
            setIsAdminMode(false);
        }
    }
  }, [email, isResetting]);

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

  const handleSendOtp = async (isReset = false) => {
    if (!email) {
        showAlert('error', 'Email Kosong', "Masukkan email terlebih dahulu.");
        return;
    }
    setSendingOtp(true);
    try {
        await requestLoginOtp(email, isReset ? 'RESET' : 'LOGIN');
        setTimer(60);
        
        // Show Success Popup
        showAlert(
            'success', 
            'Kode Terkirim!', 
            'Kode OTP telah dikirim ke email Anda. Silakan cek Inbox atau folder Spam.',
            () => { if (isReset) setResetStep(1); }
        );
        
        // Auto move if user ignores popup, but popup confirms action
        if (isReset) setResetStep(1);

    } catch (err: any) {
        showAlert('error', 'Gagal Mengirim', err.message || "Gagal mengirim PIN. Coba lagi nanti.");
    } finally {
        setSendingOtp(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!otp || !newPassword) {
          showAlert('error', 'Data Belum Lengkap', "OTP dan Password Baru wajib diisi.");
          return;
      }
      setLoading(true);
      try {
          await resetPassword(email, otp, newPassword);
          showAlert(
              'success', 
              'Password Berhasil Diubah', 
              'Silakan login kembali menggunakan password baru Anda.',
              () => {
                  setIsResetting(false);
                  setResetStep(0);
                  setOtp('');
                  setNewPassword('');
                  setPassword(''); 
              }
          );
      } catch (err: any) {
          showAlert('error', 'Gagal Reset', err.message || "Kode OTP salah atau kadaluarsa.");
      } finally {
          setLoading(false);
      }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      // 1. REGISTER FLOW
      if (isRegistering) {
        if (!name || !email || !password) { 
            showAlert('error', 'Data Kurang', "Lengkapi semua kolom pendaftaran.");
            setLoading(false); 
            return; 
        }
        await registerAccount(name, email, password);
        
        showAlert('success', 'Registrasi Berhasil', 'Akun Anda berhasil dibuat. Silakan login.', () => {
            setIsRegistering(false);
            setPassword(''); 
        });
        
        setLoading(false);
        return;
      } 
      
      let result;

      // 2. ADMIN LOGIN FLOW (Email + OTP)
      if (isAdminMode) {
         if (!otp) { 
             showAlert('error', 'PIN Kosong', "Masukkan PIN Admin (Kode OTP).");
             setLoading(false); 
             return; 
         }
         result = await loginWithOtp(email, otp);
      } 
      // 3. USER LOGIN FLOW (Email + Password)
      else {
         if (!password) { 
             showAlert('error', 'Password Kosong', "Masukkan password Anda.");
             setLoading(false); 
             return; 
         }
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
         showAlert('error', 'Login Gagal', "Periksa kembali email dan password Anda.");
      }
      
    } catch (err: any) {
      console.error(err);
      
      // Handle special case where admin needs OTP
      if (err.message && err.message.includes('requireOtp')) {
          // This usually comes from the backend logic if we were handling the old flow, 
          // but here we handle it via isAdminMode check. 
          // Just in case backend throws specific instruction:
          showAlert('info', 'Verifikasi Admin', "Kode OTP telah dikirim ke email Admin.");
      } else {
          showAlert('error', 'Gagal Masuk', err.message || "Terjadi kesalahan koneksi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 ${isAdminMode && !isResetting ? 'bg-[#FFFBF0]' : 'bg-[#2B427A]'}`}>
      
      <CustomAlert 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={closeAlert} 
        onConfirm={alertState.onConfirm}
      />

      {/* Background Shapes (Similar to Home) */}
      {(!isAdminMode || isResetting) && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0B1CDE] rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#DFFF00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </>
      )}

      <div className={`w-full max-w-md bg-white rounded-2xl transition-all duration-300 overflow-hidden relative z-10 ${isAdminMode && !isResetting ? 'border-4 border-[#0B1CDE] shadow-[10px_10px_0px_0px_#0B1CDE]' : 'border-4 border-[#DFFF00] shadow-[10px_10px_0px_0px_#DFFF00]'}`}>
        
        {/* Header Section */}
        <div className={`p-8 pb-0 text-center ${isAdminMode && !isResetting ? 'text-[#0B1CDE]' : 'text-[#2B427A]'}`}>
            {isResetting ? (
                <>
                   <div className="inline-block p-3 rounded-full bg-orange-100 text-orange-600 border-2 border-orange-200 mb-4"><RefreshCw className="w-8 h-8"/></div>
                   <h1 className="text-3xl font-black mb-2 tracking-tight uppercase">RESET PASSWORD</h1>
                   <p className="text-gray-500 font-bold text-sm">Kembalikan akses ke akun Anda.</p>
                </>
            ) : isAdminMode ? (
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
          {isResetting ? (
              // --- RESET PASSWORD FLOW ---
              <form onSubmit={handleResetConfirm} className="space-y-5 animate-fade-in">
                  <div>
                      <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Email Akun</label>
                      <div className="relative">
                          <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                          <input 
                              type="email" 
                              required 
                              value={email}
                              readOnly={resetStep === 1}
                              onChange={(e) => { setEmail(e.target.value); }}
                              className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none font-bold border-2 ${resetStep === 1 ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-white border-[#2B427A] focus:border-[#0B1CDE]'}`}
                              placeholder="Masukkan email terdaftar"
                          />
                      </div>
                  </div>

                  {resetStep === 0 ? (
                      <button 
                          type="button"
                          onClick={() => handleSendOtp(true)}
                          disabled={sendingOtp}
                          className="w-full py-4 bg-[#0B1CDE] text-white rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 border-2 border-black disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {sendingOtp ? <><Loader className="w-6 h-6 animate-spin"/> MENGIRIM KODE...</> : 'KIRIM KODE RESET'}
                      </button>
                  ) : (
                      <>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Kode OTP (Cek Email)</label>
                              <div className="relative">
                                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                  <input 
                                      type="text" 
                                      required 
                                      value={otp}
                                      onChange={(e) => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#2B427A] rounded-xl focus:border-[#0B1CDE] outline-none font-black tracking-widest text-lg"
                                      placeholder="••••••"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-black text-[#2B427A] mb-2 uppercase">Password Baru</label>
                              <div className="relative">
                                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                  <input 
                                      type={showPassword ? "text" : "password"}
                                      required 
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className="w-full pl-12 pr-12 py-3 bg-white border-2 border-[#2B427A] rounded-xl focus:border-[#0B1CDE] outline-none font-bold"
                                      placeholder="Minimal 6 karakter"
                                  />
                                  <button 
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-4 top-3.5 text-gray-400 hover:text-[#0B1CDE] focus:outline-none"
                                  >
                                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                              </div>
                          </div>
                          <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full py-4 bg-[#DFFF00] text-[#2B427A] rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 border-2 border-black"
                          >
                              {loading ? <Loader className="w-6 h-6 animate-spin"/> : 'SIMPAN PASSWORD BARU'}
                          </button>
                      </>
                  )}

                  <button 
                      type="button" 
                      onClick={() => { setIsResetting(false); setResetStep(0); }}
                      className="w-full text-center text-gray-500 font-bold hover:text-[#2B427A] flex items-center justify-center gap-2 mt-4"
                  >
                      <ArrowLeft className="w-4 h-4"/> Kembali ke Login
                  </button>
              </form>
          ) : (
              // --- LOGIN / REGISTER FLOW ---
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
                        onChange={(e) => { setName(e.target.value); }}
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
                      onChange={(e) => { setEmail(e.target.value); }}
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
                                onClick={() => handleSendOtp(false)}
                                disabled={sendingOtp || timer > 0}
                                className="text-xs font-black text-[#0B1CDE] hover:underline disabled:text-gray-400 disabled:no-underline transition-colors uppercase tracking-wide"
                            >
                                {sendingOtp ? 'MENGIRIM...' : (timer > 0 ? `KIRIM ULANG (${timer}s)` : 'KIRIM PIN')}
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                                type={showPassword ? "text" : "password"}
                                required 
                                placeholder="••••••"
                                value={otp}
                                onChange={(e) => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); }}
                                className="w-full pl-12 pr-12 py-3 bg-white border-2 border-[#0B1CDE] rounded-xl focus:shadow-[4px_4px_0px_0px_#0B1CDE] outline-none font-black text-[#2B427A] tracking-widest transition-all text-xl"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-gray-400 hover:text-[#0B1CDE] focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                        type={showPassword ? "text" : "password"}
                        required 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); }}
                        className="w-full pl-12 pr-12 py-3 bg-white border-2 border-[#2B427A] rounded-xl focus:border-[#0B1CDE] focus:shadow-[4px_4px_0px_0px_#0B1CDE] outline-none font-black text-[#2B427A] transition-all"
                      />
                      <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-gray-400 hover:text-[#0B1CDE] focus:outline-none"
                      >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Forgot Password Link */}
                    {!isRegistering && (
                        <div className="text-right mt-2">
                            <button 
                                type="button" 
                                onClick={() => { setIsResetting(true); setResetStep(0); }}
                                className="text-xs font-bold text-gray-500 hover:text-[#0B1CDE] hover:underline"
                            >
                                Lupa Password?
                            </button>
                        </div>
                    )}
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 border-2 border-black
                      ${isAdminMode 
                          ? 'bg-[#0B1CDE] text-white hover:bg-[#0916B0]' 
                          : 'bg-[#DFFF00] text-[#2B427A] hover:bg-[#ccff00]'} disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {loading ? <Loader className="w-6 h-6 animate-spin"/> : (isAdminMode ? 'LOGIN ADMIN' : (isRegistering ? 'DAFTAR SEKARANG' : 'MASUK'))}
                </button>
                
              </form>
          )}

          {/* Footer Actions */}
          {!isResetting && (
              <div className="mt-8 text-center space-y-3">
                 <div className="text-sm font-bold text-gray-500">
                    {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'} {' '}
                    <button 
                        type="button" 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                        }}
                        className={`font-black hover:underline ${isAdminMode ? 'text-[#0B1CDE]' : 'text-[#2B427A]'}`}
                    >
                        {isRegistering ? 'LOGIN DI SINI' : 'BUAT AKUN'}
                    </button>
                 </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
