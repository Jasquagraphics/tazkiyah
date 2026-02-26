import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Upload,
  Globe,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ReleaseUploadProps {
  user: User;
}

const STORES = ['Spotify', 'Apple Music', 'Amazon Music', 'JioSaavn', 'YouTube Music', 'Tidal', 'Deezer', 'Pandora'];

export default function ReleaseUpload({ user }: ReleaseUploadProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    artwork_url: '',
    release_date: '',
    description: '',
    stores: [] as string[],
    tracks: [{ title: '', type: 'original', artist_name: user.name, composer: '', file_url: '' }]
  });

  useEffect(() => {
    if (editId) {
      fetch(`/api/artist/release/${editId}`, {
        headers: { 'x-user-id': user.id.toString() }
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setFormData({
              title: data.title,
              artwork_url: data.artwork_url,
              release_date: data.release_date,
              description: data.description || '',
              stores: (() => { try { return JSON.parse(data.stores || '[]'); } catch { return []; } })(),
              tracks: data.tracks
            });
          }
        });
    }
  }, [editId, user.id]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const addTrack = () => {
    setFormData({
      ...formData,
      tracks: [...formData.tracks, { title: '', type: 'original', artist_name: user.name, composer: '', file_url: '' }]
    });
  };

  const removeTrack = (index: number) => {
    const newTracks = [...formData.tracks];
    newTracks.splice(index, 1);
    setFormData({ ...formData, tracks: newTracks });
  };

  const updateTrack = (index: number, field: string, value: string) => {
    const newTracks = [...formData.tracks];
    (newTracks[index] as any)[field] = value;
    setFormData({ ...formData, tracks: newTracks });
  };

  const toggleStore = (store: string) => {
    const newStores = formData.stores.includes(store)
      ? formData.stores.filter(s => s !== store)
      : [...formData.stores, store];
    setFormData({ ...formData, stores: newStores });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.artwork_url || !formData.release_date || formData.stores.length === 0) {
      setError('Please complete all required fields (Title, Artwork, Date, Stores)');
      return;
    }

    if (formData.tracks.some(t => !t.title)) {
      setError('All tracks must have a title');
      return;
    }

    if (formData.tracks.some(t => !t.file_url)) {
      setError('Please upload audio files for all tracks');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const url = editId ? `/api/artist/release/${editId}` : '/api/artist/releases';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => navigate('/releases'), 3000);
      } else {
        let errorMessage = 'Failed to submit release';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // If not JSON, use status text
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Connection error: ${err.message || 'Please check your internet connection'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-16 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 ${
              step >= i ? 'bg-brand-primary text-white scale-110 shadow-xl shadow-brand-primary/20' : 'bg-white/5 text-white/20 border border-white/5'
            }`}
          >
            {step > i ? <Check className="w-6 h-6" /> : i}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-20 text-center"
          >
            <div className="w-24 h-24 bg-emerald-500/20 rounded-[3rem] flex items-center justify-center text-emerald-400 mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
              <Check className="w-12 h-12" />
            </div>
            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Submitted Successfully!</h3>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Your release is now under review by our team.</p>
            <p className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-8 animate-pulse">Redirecting to your music...</p>
          </motion.div>
        ) : step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="glass-card p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Basic Information</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Start your new release</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Release Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter album or single title"
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Artwork</label>
                  <div className="flex flex-col md:flex-row gap-6">
                    <label className="w-40 h-40 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 overflow-hidden shrink-0 group hover:border-brand-primary transition-colors cursor-pointer relative">
                      {formData.artwork_url ? (
                        <img src={formData.artwork_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formDataUpload = new FormData();
                            formDataUpload.append('file', file);
                            const res = await fetch('/api/upload', {
                              method: 'POST',
                              body: formDataUpload
                            });
                            const data = await res.json();
                            setFormData({ ...formData, artwork_url: data.url });
                          }
                        }}
                      />
                    </label>
                    <div className="flex-1 space-y-4">
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-relaxed">
                          Recommended: 3000x3000px, JPG or PNG. 
                          <br />Maximum file size: 5MB.
                        </p>
                      </div>
                      {formData.artwork_url && (
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✓ Artwork uploaded successfully</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell us about this release..."
                    rows={4}
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm resize-none bg-white/5 border border-white/5 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleNext} 
                disabled={!formData.title} 
                className="vibrant-gradient text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
              >
                Next Step <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="glass-card p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Tracks</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Manage your tracklist</p>
                  </div>
                </div>
                <button onClick={addTrack} className="text-brand-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
                  <Plus className="w-5 h-5" /> Add Track
                </button>
              </div>
              
              <div className="space-y-6">
                {formData.tracks.map((track, index) => (
                  <div key={index} className="p-8 rounded-3xl bg-white/5 border border-white/5 relative group hover:bg-white/10 transition-all">
                    {formData.tracks.length > 1 && (
                      <button 
                        onClick={() => removeTrack(index)}
                        className="absolute top-6 right-6 text-white/20 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Track Title</label>
                        <input 
                          type="text" 
                          value={track.title}
                          onChange={e => updateTrack(index, 'title', e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/5 focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Type</label>
                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                          {['original', 'remix', 'cover'].map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => updateTrack(index, 'type', t)}
                              className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                track.type === t 
                                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                                  : "text-white/20 hover:text-white"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Artist Name</label>
                        <input 
                          type="text" 
                          value={track.artist_name}
                          onChange={e => updateTrack(index, 'artist_name', e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/5 focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Composer</label>
                        <input 
                          type="text" 
                          value={track.composer}
                          onChange={e => updateTrack(index, 'composer', e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/5 focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Audio File</label>
                        <div className="flex items-center gap-4">
                          <label className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all">
                            <Upload className="w-5 h-5 text-white/20" />
                            <span className="text-sm font-black text-white/40 truncate">
                              {track.file_url ? 'File uploaded' : 'Select audio file (MP3/WAV)'}
                            </span>
                            <input 
                              type="file" 
                              accept="audio/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const formDataUpload = new FormData();
                                  formDataUpload.append('file', file);
                                  const res = await fetch('/api/upload', {
                                    method: 'POST',
                                    body: formDataUpload
                                  });
                                  const data = await res.json();
                                  updateTrack(index, 'file_url', data.url);
                                }
                              }}
                            />
                          </label>
                          {track.file_url && (
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <Check className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={handleBack} className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-8 py-5 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              <button onClick={handleNext} className="vibrant-gradient text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                Next Step <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="glass-card p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Distribution</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Select date and platforms</p>
                </div>
              </div>
              
              <div className="space-y-12">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                    <Calendar className="w-5 h-5 text-brand-primary" /> Release Date
                  </label>
                  <input 
                    type="date" 
                    value={formData.release_date}
                    onChange={e => setFormData({...formData, release_date: e.target.value})}
                    className="w-full max-w-xs px-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>

                <div className="space-y-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                    <Globe className="w-5 h-5 text-brand-primary" /> Select Stores
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {STORES.map(store => (
                      <button
                        key={store}
                        onClick={() => toggleStore(store)}
                        className={cn(
                          "px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.stores.includes(store)
                            ? "vibrant-gradient text-white border-transparent shadow-xl shadow-brand-primary/20 scale-105"
                            : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {store}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={handleBack} className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-8 py-5 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              <button onClick={handleNext} className="vibrant-gradient text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                Review Release <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="glass-card p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Review</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Final check before submission</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-10 mb-12">
                <img src={formData.artwork_url} className="w-56 h-56 rounded-[2.5rem] object-cover shadow-2xl" alt="" />
                <div className="flex-1 space-y-6">
                  <div>
                    <h4 className="text-4xl font-black text-white tracking-tight mb-2">{formData.title}</h4>
                    <p className="text-white/40 font-black text-lg uppercase tracking-widest">by {user.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {formData.stores.map(s => (
                      <span key={s} className="px-4 py-1.5 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-10">
                <h5 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">Tracklist</h5>
                <div className="space-y-3">
                  {formData.tracks.map((track, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-6">
                        <span className="text-white/20 font-black text-lg">{i + 1}</span>
                        <div>
                          <p className="font-black text-white tracking-tight">{track.title}</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{track.artist_name} • {track.type}</p>
                        </div>
                      </div>
                      <Music className="w-5 h-5 text-white/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={handleBack} className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-8 py-5 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-black uppercase tracking-widest text-center">
                  {error}
                </div>
              )}

              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="vibrant-gradient text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit for Review'}
                <Upload className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
