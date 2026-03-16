import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, LogOut, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { User } from '../types';

export default function Agreement({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreement, setAgreement] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);

  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const canSign = useMemo(() => {
    if (!agreement) return false;
    return (agreement.status === 'sent' || agreement.status === 'draft') && !agreement.signature_data_url;
  }, [agreement]);

  const fetchAgreement = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/artist/agreement', {
        headers: { 'x-user-id': user.id.toString() },
      });
      const data = await res.json();
      setAgreement(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agreement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreement();
  }, [user.id]);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0b0b0b';
  }, [loading, canSign]);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const exportSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return '';
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    return tmp.toDataURL('image/png');
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canSign) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canSign || !isDrawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const last = lastPointRef.current;
    const next = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    lastPointRef.current = next;
    setSigned(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const canvas = signatureCanvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const submitSignature = async () => {
    if (!agreement) return;
    if (!accepted) {
      setError('Please accept the agreement terms.');
      return;
    }
    if (!signed) {
      setError('Please provide your signature.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const signature_data_url = exportSignature();
      const res = await fetch('/api/artist/agreement/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString(),
        },
        body: JSON.stringify({ signature_data_url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to submit signature');
        return;
      }
      await fetchAgreement();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="glass-card p-10 text-center">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">No agreement found</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Please contact support or wait for admin.</p>
        <button
          onClick={onLogout}
          className="mt-8 w-full bg-white/5 border border-white/10 text-white/70 py-4 rounded-2xl font-black tracking-widest text-xs hover:bg-white/10 transition-all"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Review and sign agreement</h1>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
            Please review the agreement carefully before signing.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-bold"
        >
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="aspect-[16/10] bg-white/5">
            {agreement.agreement_html ? (
              <iframe title="agreement" className="w-full h-full" sandbox="" srcDoc={agreement.agreement_html} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">
                Agreement preview not available
              </div>
            )}
          </div>
        </div>

        {agreement.signature_data_url ? (
          <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Signed</p>
              <p className="text-white/60 text-xs font-bold mt-1">Your signature has been received. Waiting for verification.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Signature</p>
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  Clear
                </button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
                <canvas
                  ref={signatureCanvasRef}
                  className="w-full h-48 bg-white rounded-3xl"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-5 rounded-3xl bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-relaxed">
                  By checking this box, I acknowledge and accept the platform&apos;s terms of service. I understand that false information may lead to rejection or suspension.
                </span>
              </label>
              <button
                onClick={submitSignature}
                disabled={submitting}
                className="w-full py-4 rounded-2xl vibrant-gradient text-white font-black tracking-widest uppercase text-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting
                  </>
                ) : (
                  'Submit Signature'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

