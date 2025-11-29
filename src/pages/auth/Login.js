import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { userDb as db } from "../../firebase"; 
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, KeyRound, ArrowRight, CheckCircle2, Loader2, ShieldCheck, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname || "/"; 

  // Steps: 1=Email, 2=Password(Existing), 3=OTP(New/Reset), 4=SetPassword(New/Reset)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); 
  const [generatedOtp, setGeneratedOtp] = useState(null); 
  const [dbUserData, setDbUserData] = useState(null); 
  const [isResetMode, setIsResetMode] = useState(false); // True if resetting password
  const [rememberMe, setRememberMe] = useState(false);

  // --- STEP 1: CHECK EMAIL ---
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // USER EXISTS -> Ask for Password
            const userData = querySnapshot.docs[0].data();
            setDbUserData({ id: querySnapshot.docs[0].id, ...userData });
            setStep(2); // Go to Password
        } else {
            // NEW USER -> Send OTP
            await sendOtp();
            setStep(3); // Go to OTP
        }
    } catch (err) {
        console.error(err);
        setError("Network error. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  // --- HELPER: SEND OTP ---
  const sendOtp = async () => {
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    
    // Use ENV variable for safety, fallback to hardcoded if missing
    const SCRIPT_URL = process.env.REACT_APP_OTP_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyf3v6rfMZi64_26T8ZiueGJfRdPS5JBKI-i9aH8kDdfFLyGb07WXvYn05Yg4StOMOoGQ/exec"; 
    
    // Fire and forget (no await needed for user experience, but good for debugging)
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: email, otp: newOtp }),
    }).catch(err => console.error("OTP Error", err));
  };

  // --- STEP 2: VERIFY PASSWORD (EXISTING USER) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (password === dbUserData.password) {
        login(dbUserData, rememberMe);
        navigate(from, { replace: true });
    } else {
        setError("Incorrect Password.");
        setLoading(false);
    }
  };

  // --- SWITCH TO OTP (FORGOT PASSWORD) ---
  const handleForgotPassword = async () => {
      setLoading(true);
      setIsResetMode(true);
      await sendOtp();
      setLoading(false);
      setStep(3); // Go to OTP screen
  };

  // --- STEP 3: VERIFY OTP (NEW / RESET) ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setError("Incorrect OTP.");
      return;
    }
    setStep(4); // Go to Set Password
  };

  // --- STEP 4: SET PASSWORD & LOGIN (NEW / RESET) ---
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        let userPayload;
        if (dbUserData && isResetMode) {
            // UPDATE EXISTING USER
            const userRef = doc(db, "users", dbUserData.id);
            await updateDoc(userRef, { password: password });
            userPayload = { ...dbUserData, password: password };
        } else {
            // CREATE NEW USER
            userPayload = {
                email: email,
                password: password, 
                joinedAt: Timestamp.now(),
                role: 'user'
            };
            const docRef = await addDoc(collection(db, "users"), userPayload);
            userPayload = { id: docRef.id, ...userPayload };
        }
        
        login(userPayload, rememberMe);
        navigate(from, { replace: true });

    } catch (err) {
        setError("Failed to save account.");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col relative">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-center relative overflow-hidden">
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Rent<span className="text-rose-500">X</span></h1>
            <p className="text-slate-400 text-sm font-medium">Secure Tenant Portal</p>
        </div>

        <div className="p-8">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2"><ShieldCheck size={16} /> {error}</div>}

            {/* STEP 1: EMAIL */}
            {step === 1 && (
                <form onSubmit={handleCheckEmail} className="space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="text-center">
                        <h2 className="text-xl font-black text-slate-800">Welcome</h2>
                        <p className="text-slate-500 text-sm">Enter email to continue</p>
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                        <input type="email" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold outline-none focus:border-rose-500 transition-colors" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
                    </div>
                    <button disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                        {loading ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={18}/></>}
                    </button>
                </form>
            )}

            {/* STEP 2: PASSWORD (EXISTING USER) */}
            {step === 2 && (
                <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="text-center">
                        <h2 className="text-xl font-black text-slate-800">Welcome Back</h2>
                        <p className="text-slate-500 text-sm">Please enter your password for <b>{email}</b></p>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                        <input type="password" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold outline-none focus:border-rose-500 transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="rm" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-rose-600 w-4 h-4"/>
                            <label htmlFor="rm" className="text-xs font-bold text-slate-500 cursor-pointer">Remember me</label>
                        </div>
                        <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-rose-600 hover:underline">Forgot Password?</button>
                    </div>

                    <button disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                        {loading ? <Loader2 className="animate-spin" /> : <>Login <ArrowRight size={18}/></>}
                    </button>
                    <button type="button" onClick={() => {setStep(1); setEmail(''); setPassword('');}} className="w-full text-center text-xs font-bold text-slate-400 hover:text-rose-500">Not you? Use different email</button>
                </form>
            )}

            {/* STEP 3: OTP (NEW OR RESET) */}
            {step === 3 && (
                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-8">
                     <div className="text-center">
                        <h2 className="text-xl font-black text-slate-800">Verify Identity</h2>
                        <p className="text-slate-500 text-sm">{isResetMode ? 'Resetting password' : 'Creating account'} for {email}</p>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                        <input type="text" required maxLength="4" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold text-center tracking-widest text-xl outline-none focus:border-rose-500 transition-colors" placeholder="0000" value={otp} onChange={(e) => setOtp(e.target.value)}/>
                    </div>
                    <button disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                        {loading ? <Loader2 className="animate-spin" /> : <>Verify Code <CheckCircle2 size={18}/></>}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={sendOtp} className="text-xs font-bold text-slate-400 hover:text-rose-500 mr-4">Resend Code</button>
                        <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 hover:text-rose-500">Change Email</button>
                    </div>
                </form>
            )}

            {/* STEP 4: SET PASSWORD (NEW OR RESET) */}
            {step === 4 && (
                <form onSubmit={handleSetPassword} className="space-y-6 animate-in fade-in slide-in-from-right-8">
                     <div className="text-center">
                        <h2 className="text-xl font-black text-slate-800">Set Password</h2>
                        <p className="text-slate-500 text-sm">Secure your account</p>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                        <input type="password" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold outline-none focus:border-rose-500 transition-colors" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    
                    <button disabled={loading} className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
                        {loading ? <Loader2 className="animate-spin" /> : <>{isResetMode ? 'Reset & Login' : 'Create Account'} <ArrowRight size={18}/></>}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
}