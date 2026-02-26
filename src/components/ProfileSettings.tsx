import React, { useState } from 'react';
import { User } from '../types';
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Bell, 
  Save, 
  User as UserIcon, 
  Camera, 
  Mail, 
  Lock, 
  Globe, 
  CheckCircle2,
  TrendingUp, 
  LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileSettingsProps {
  user: User;
  onUpdate: (user: User) => void;
}

export default function ProfileSettings({ user, onUpdate }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bankInfo, setBankInfo] = useState(user.bank_info || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(user.whatsapp_enabled === 1);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsapp_number || '');
  const [profileImage, setProfileImage] = useState(user.profile_image || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setBankInfo(user.bank_info || '');
    setWhatsappEnabled(user.whatsapp_enabled === 1);
    setWhatsappNumber(user.whatsapp_number || '');
    setProfileImage(user.profile_image || '');
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setProfileImage(data.url);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ 
          name, 
          email,
          bank_info: bankInfo,
          whatsapp_enabled: whatsappEnabled,
          whatsapp_number: whatsappNumber,
          profile_image: profileImage
        })
      });

      if (res.ok) {
        onUpdate({ 
          ...user, 
          name, 
          email,
          bank_info: bankInfo,
          whatsapp_enabled: whatsappEnabled ? 1 : 0,
          whatsapp_number: whatsappNumber,
          profile_image: profileImage
        });
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update profile');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-emerald-500/40 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-500/40 flex items-center gap-3"
          >
            <TrendingUp className="w-5 h-5 rotate-45" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card p-10 md:p-12">
        <div className="flex flex-col md:flex-row items-center gap-10 mb-12">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shadow-2xl ring-4 ring-brand-primary/20 group-hover:ring-brand-primary transition-all duration-500">
              <img 
                src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">{user.name}</h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{user.role} Account</p>
            <div className="flex items-center gap-4 mt-6">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-white/60 uppercase tracking-widest">
                ID: #{user.id}
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl mb-12">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'security' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Security
          </button>
          {user.role === 'artist' && (
            <>
              <button 
                onClick={() => setActiveTab('payout')}
                className={cn(
                  "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'payout' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Payouts
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'notifications' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Alerts
              </button>
            </>
          )}
        </div>

        <div className="space-y-8">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Biography</label>
                <textarea 
                  className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm min-h-[150px]"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">Two-Factor Authentication</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Secure your account with 2FA</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShow2FAModal(true)}
                  className="px-6 py-3 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Enable
                </button>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 shadow-lg">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">Change Password</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Last changed 3 months ago</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-6 py-3 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Update
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payout' && user.role === 'artist' && (
            <div className="space-y-8">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Bank Information</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Update your payout details</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Bank Account Info</label>
                    <textarea 
                      rows={4}
                      value={bankInfo}
                      onChange={(e) => setBankInfo(e.target.value)}
                      placeholder="IBAN, SWIFT, or Account Number"
                      className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Payout Details'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && user.role === 'artist' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">WhatsApp Notifications</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Get updates directly on WhatsApp</p>
                  </div>
                </div>
                <div 
                  onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                  className={cn(
                    "w-14 h-8 rounded-full relative p-1 cursor-pointer transition-colors",
                    whatsappEnabled ? "bg-brand-primary" : "bg-white/10"
                  )}
                >
                  <motion.div 
                    animate={{ x: whatsappEnabled ? 24 : 0 }}
                    className="w-6 h-6 bg-white rounded-full shadow-lg" 
                  />
                </div>
              </div>

              {whatsappEnabled && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={whatsappNumber} 
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </motion.div>
              )}

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button className="flex items-center gap-2 text-rose-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-300 transition-colors">
          <LogOut className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Security Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-10 relative z-10"
            >
              <h3 className="text-2xl font-black text-white mb-6">Change Password</h3>
              <div className="space-y-4">
                <input type="password" placeholder="Current Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <input type="password" placeholder="New Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <input type="password" placeholder="Confirm New Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <button onClick={() => setShowPasswordModal(false)} className="w-full vibrant-gradient text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest mt-4">Update Password</button>
              </div>
            </motion.div>
          </div>
        )}

        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShow2FAModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-10 relative z-10 text-center"
            >
              <Shield className="w-16 h-16 text-brand-primary mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">Enable 2FA</h3>
              <p className="text-white/40 text-sm mb-8">Scan the QR code with your authenticator app</p>
              <div className="w-48 h-48 bg-white p-4 rounded-3xl mx-auto mb-8">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SonicStream" className="w-full h-full" alt="QR Code" />
              </div>
              <button onClick={() => setShow2FAModal(false)} className="w-full vibrant-gradient text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">I've Scanned It</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
