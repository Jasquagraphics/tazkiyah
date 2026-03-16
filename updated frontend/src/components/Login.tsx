import React, { useState } from 'react';
import { Music, ArrowRight, AlertCircle, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onLogin(event.data.user);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to initiate Google login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = isRegister ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        const nextUser = (data?.user || data) as User;
        onLogin(nextUser);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/20 rounded-full blur-[120px] animate-pulse delay-1000" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 vibrant-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-primary/40">
            <Music className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">SonicStream</h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px]">Music Distribution Agency</p>
        </div>

        <div className="glass-card p-10">
          <h2 className="text-2xl font-black text-white mb-8 tracking-tight">
            {isRegister ? 'Create Artist Account' : 'Welcome Back'}
          </h2>

          {!isRegister && !showEmailForm ? (
            <div className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" /> {error}
                </motion.div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(true);
                  setError('');
                }}
                className="w-full bg-white/5 text-white py-5 rounded-2xl font-black tracking-widest text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <Mail className="w-5 h-5 text-white/70" />
                Continue with Email
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white/5 text-white py-5 rounded-2xl font-black tracking-widest text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {isRegister && (
                <div>
                  <label className="block text-[10px] font-bold text-white/40 mb-2 ml-1">Artist name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                    placeholder="Your stage name"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 ml-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="name@agency.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 ml-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white/15 text-white py-4 rounded-2xl font-black tracking-widest text-xs border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isRegister ? 'Get Started' : 'Login'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white/5 text-white py-5 rounded-2xl font-black tracking-widest text-xs border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button 
              onClick={() => {
                setIsRegister(!isRegister);
                setShowEmailForm(false);
                setError('');
              }}
              className="text-white/40 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
