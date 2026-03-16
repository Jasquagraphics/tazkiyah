import React, { useMemo, useState } from 'react';
import { CheckCircle2, Upload as UploadIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { User } from '../types';

type Step = 1 | 2;

export default function Onboarding({ user, onUpdateUser, onLogout }: { user: User; onUpdateUser: (u: User) => void; onLogout: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [distributedBefore, setDistributedBefore] = useState<null | boolean>(null);
  const [upcomingAudioUrl, setUpcomingAudioUrl] = useState<string>('');
  const [upcomingAudioName, setUpcomingAudioName] = useState<string>('');

  const [legalName, setLegalName] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [idCardUrl, setIdCardUrl] = useState('');
  const [idCardName, setIdCardName] = useState('');

  const stepLabel = useMemo(() => `${step}/2`, [step]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    return String(data?.url || '');
  };

  const validateStep1 = () => {
    if (distributedBefore === null) return 'Please choose Yes or No.';
    return '';
  };

  const validateStep2 = () => {
    if (!legalName.trim()) return 'Legal name is required.';
    if (!legalAddress.trim()) return 'Legal full address is required.';
    if (!country.trim()) return 'Country is required.';
    if (!phoneNumber.trim()) return 'Phone/WhatsApp number is required.';
    if (!aadhaarNumber.trim()) return 'Aadhaar number is required.';
    if (!idCardUrl) return 'ID card photo upload is required.';
    return '';
  };

  const savePartial = async (payload: Record<string, any>) => {
    const res = await fetch('/api/artist/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id.toString() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to save');
    return data?.user as User;
  };

  const handleContinue = async () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      try {
        setLoading(true);
        const updated = await savePartial({
          distributed_before: distributedBefore ? 1 : 0,
          upcoming_audio_url: upcomingAudioUrl || null,
        });
        onUpdateUser(updated);
        setStep(2);
      } catch (e: any) {
        setError(e?.message || 'Failed to continue');
      } finally {
        setLoading(false);
      }
      return;
    }

    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/artist/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id.toString() },
        body: JSON.stringify({
          legal_name: legalName,
          legal_address: legalAddress,
          country,
          phone_number: phoneNumber,
          aadhaar_number: aadhaarNumber,
          id_card_url: idCardUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to finish setup');
        return;
      }
      onUpdateUser(data.user);
    } catch (e: any) {
      setError(e?.message || 'Failed to finish setup');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 2) setStep(1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/20 rounded-full blur-[120px] animate-pulse delay-1000" />

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl relative z-10">
        <div className="glass-card p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white/70" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Finish setup</h2>
                <p className="text-white/30 text-xs font-bold mt-1">
                  {step === 1 ? 'Please confirm a few details to finish setup.' : 'Add your legal information to continue.'}
                </p>
              </div>
            </div>
            <div className="text-white/20 text-[10px] font-black uppercase tracking-widest">{stepLabel}</div>
          </div>

          <div className="mt-8 flex items-center gap-8 border-b border-white/5 pb-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={step === 1 ? 'text-white font-black text-[10px] uppercase tracking-widest' : 'text-white/30 font-black text-[10px] uppercase tracking-widest'}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={step === 2 ? 'text-white font-black text-[10px] uppercase tracking-widest' : 'text-white/30 font-black text-[10px] uppercase tracking-widest'}
            >
              Legal
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="mt-8 space-y-6">
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Have you distributed your songs before?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDistributedBefore(true)}
                    className={
                      distributedBefore === true
                        ? 'py-3 rounded-2xl bg-white/15 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest'
                        : 'py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest'
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributedBefore(false)}
                    className={
                      distributedBefore === false
                        ? 'py-3 rounded-2xl bg-white/15 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest'
                        : 'py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest'
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="glass-card p-6 border border-white/10">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Upload upcoming audio (optional)</p>
                <label className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-white/70 text-xs font-bold truncate">{upcomingAudioName || 'Choose File (no file selected)'}</p>
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">We will review this file before distribution.</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <UploadIcon className="w-5 h-5 text-white/60" />
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setLoading(true);
                        setError('');
                        const url = await uploadFile(file);
                        setUpcomingAudioUrl(url);
                        setUpcomingAudioName(file.name);
                      } catch (err: any) {
                        setError(err?.message || 'Upload failed');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">
                  Legal name <span className="text-white/20">(must match your ID card)</span>
                </label>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="Your legal name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">Legal full address</label>
                <input
                  value={legalAddress}
                  onChange={(e) => setLegalAddress(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="Country"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">
                  Phone/WhatsApp number <span className="text-white/20">(with country code)</span>
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="+1 555 000 0000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">Aadhaar number</label>
                <input
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="Aadhaar number"
                />
              </div>

              <div className="glass-card p-6 border border-white/10">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">
                  ID card photo upload <span className="text-white/20">(JPEG only, 500 KB max)</span>
                </p>
                <label className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <p className="text-white/70 text-xs font-bold truncate">{idCardName || 'Choose File (no file selected)'}</p>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <UploadIcon className="w-5 h-5 text-white/60" />
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) {
                        setError('Max file size is 500 KB.');
                        return;
                      }
                      if (!/jpe?g$/i.test(file.name) && !/jpeg/i.test(file.type)) {
                        setError('Only JPEG files are allowed.');
                        return;
                      }
                      try {
                        setLoading(true);
                        setError('');
                        const url = await uploadFile(file);
                        setIdCardUrl(url);
                        setIdCardName(file.name);
                      } catch (err: any) {
                        setError(err?.message || 'Upload failed');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="mt-10 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={step === 1 ? onLogout : handleBack}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black tracking-widest uppercase text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Go Back' : 'Go Back'}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl bg-white/15 border border-white/10 text-white font-black tracking-widest uppercase text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={loading}
            >
              {step === 2 ? 'Continue' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

