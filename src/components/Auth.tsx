import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, setDoc, getDoc, onAuthStateChanged, setupRecaptcha, loginWithPhone, loginAnonymously } from '../firebase';
import { ChefHat, User as UserIcon, Utensils, ArrowRight, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import ErrorMessage from './ErrorMessage';

export default function Auth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'chef' | 'customer' | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsRole, setNeedsRole] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const recaptchaVerifierRef = useRef<any>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          if (!response.ok) {
            setNeedsRole(true);
          }
        } catch (err) {
          setNeedsRole(true);
        }
      } else {
        setUser(null);
        setNeedsRole(false);
      }
    });
// ... rest of useEffect cleanup ...

    return () => {
      unsubscribe();
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("Error clearing recaptcha", e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Clear recaptcha when switching steps or on error
  const resetRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        console.error("Error clearing recaptcha", e);
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Always reset before creating a new one to be safe
      resetRecaptcha();
      
      if (!recaptchaContainerRef.current) {
        throw new Error("Recaptcha container not found in DOM");
      }
      
      const verifier = setupRecaptcha(recaptchaContainerRef.current);
      recaptchaVerifierRef.current = verifier;
      
      const result = await loginWithPhone(phoneNumber, verifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error("Failed to send code", err);
      let message = err.message || "Failed to send verification code. Please check the number.";
      if (err.code === 'auth/billing-not-enabled') {
        message = "Firebase Phone Auth requires a Blaze plan. For the AI Studio preview, please use the 'Demo Login' button below or add a 'Test Phone Number' in your Firebase Console.";
      }
      setError(message);
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAnonymously();
    } catch (err: any) {
      console.error("Demo login failed", err);
      setError("Demo login failed. Please ensure 'Anonymous Auth' is enabled in your Firebase Console (Authentication > Sign-in method).");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (err: any) {
      console.error("Verification failed", err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!user || !role) return;
    if (!name.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          name: name.trim(),
          phoneNumber: user.phoneNumber || 'Anonymous',
          role: role,
        }),
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Failed to save profile", error);
      setError("Network error saving profile");
    } finally {
      setLoading(false);
    }
  };

  if (needsRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-gray-100">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Welcome to HomelyFood!</h2>
          <p className="text-gray-500 mb-8 text-lg">How would you like to use the platform?</p>
          
          <ErrorMessage message={error} />
          <div className="mb-6 mt-4">
            <input
              type="text"
              required
              placeholder="Enter your full name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium text-center"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <button
              onClick={() => setRole('chef')}
              className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${
                role === 'chef' 
                ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' 
                : 'border-gray-100 hover:border-orange-200 hover:bg-gray-50'
              }`}
            >
              <div className={`p-4 rounded-full transition-colors ${role === 'chef' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:text-orange-500'}`}>
                <ChefHat className="h-10 w-10" />
              </div>
              <div className="text-center">
                <span className={`block font-bold text-lg ${role === 'chef' ? 'text-orange-900' : 'text-gray-700'}`}>Home Chef</span>
                <span className="text-xs text-gray-400 mt-1 block">I want to sell my food</span>
              </div>
            </button>

            <button
              onClick={() => setRole('customer')}
              className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${
                role === 'customer' 
                ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' 
                : 'border-gray-100 hover:border-orange-200 hover:bg-gray-50'
              }`}
            >
              <div className={`p-4 rounded-full transition-colors ${role === 'customer' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:text-orange-500'}`}>
                <UserIcon className="h-10 w-10" />
              </div>
              <div className="text-center">
                <span className={`block font-bold text-lg ${role === 'customer' ? 'text-orange-900' : 'text-gray-700'}`}>Customer</span>
                <span className="text-xs text-gray-400 mt-1 block">I want to order food</span>
              </div>
            </button>
          </div>

          <button
            onClick={handleCompleteProfile}
            disabled={!role || loading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Setting up...' : 'Get Started'}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 flex flex-col justify-center bg-orange-500 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="bg-white/20 p-4 rounded-2xl w-fit mb-8 backdrop-blur-sm">
              <Utensils className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-6 leading-tight tracking-tight italic">
              Authentic <br /> Homemade <br /> Flavors.
            </h1>
            <p className="text-orange-50 text-lg opacity-90 leading-relaxed max-w-xs">
              Connecting passionate home chefs with food lovers in the neighborhood.
            </p>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-400 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-600 rounded-full opacity-50 blur-3xl"></div>
        </div>
        
        <div className="p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h2>
          <p className="text-gray-500 mb-10 text-center">Sign in with your phone number to continue</p>
          
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="tel"
                    required
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium"
                  />
                </div>
                <p className="text-[10px] text-gray-400 ml-1 italic">Include country code (e.g. +1 for USA)</p>
              </div>
              
              <div ref={recaptchaContainerRef}></div>

              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full bg-white text-gray-700 border-2 border-gray-100 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Logging in...' : 'Demo Login (No SMS)'}
                {!loading && <UserIcon className="h-5 w-5 text-gray-400" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Verification Code</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium tracking-[0.5em] text-center"
                    maxLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-gray-400 text-sm font-medium hover:text-orange-500 transition-colors"
              >
                Change Phone Number
              </button>
            </form>
          )}
          
          <p className="mt-8 text-sm text-gray-400 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
