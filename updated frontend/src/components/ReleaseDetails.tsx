import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Music, 
  ChevronLeft, 
  Globe, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  TrendingUp,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Release, Track, User } from '../types';

interface ReleaseDetailsProps {
  user: User;
}

export default function ReleaseDetails({ user }: ReleaseDetailsProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState<(Release & { tracks: Track[], revenue: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [platform, setPlatform] = useState('');
  const [platforms, setPlatforms] = useState<any[]>([]);

  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [showStatusModal, setShowStatusModal] = useState<{ status: string, remarks: string } | null>(null);
  const [platformLinks, setPlatformLinks] = useState<{ platform: string, url: string }[]>([]);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [newLink, setNewLink] = useState({ platform: 'Spotify', url: '' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch('/api/platforms')
      .then(res => res.json())
      .then(data => {
        setPlatforms(data);
        if (data.length > 0) {
          setPlatform(data[0].name);
          setNewLink(prev => ({ ...prev, platform: data[0].name }));
        }
      });

    const endpoint = user.role === 'admin' ? `/api/admin/release/${id}` : `/api/artist/release/${id}`;
    fetch(endpoint, {
      headers: { 'x-user-id': user.id.toString() }
    })
      .then(res => res.json())
      .then(data => {
        setRelease(data);
        if (data.platform_links) {
          try {
            setPlatformLinks(JSON.parse(data.platform_links));
          } catch (e) {
            setPlatformLinks([]);
          }
        }
        setLoading(false);
      });
  }, [id, user.id, user.role]);

  const toggleAudio = (url: string) => {
    if (playingTrack === url) {
      audioRef.current?.pause();
      setPlayingTrack(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingTrack(url);
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this release?')) return;
    try {
      const res = await fetch(`/api/artist/release/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id.toString() }
      });
      if (res.ok) {
        navigate('/releases');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async () => {
    if (!release || !showStatusModal) return;
    
    try {
      const res = await fetch(`/api/admin/release/${release.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: showStatusModal.status, 
          admin_remarks: showStatusModal.remarks,
          platform_links: platformLinks.length > 0 ? platformLinks : null
        })
      });

      if (res.ok) {
        setRelease({ ...release, status: showStatusModal.status as any, admin_remarks: showStatusModal.remarks });
        setSuccessMessage(`Status updated to ${showStatusModal.status}`);
        setShowStatusModal(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!release) return;

    try {
      const res = await fetch('/api/admin/add-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist_id: release.artist_id,
          release_id: release.id,
          amount: parseFloat(revenueAmount),
          platform
        })
      });

      if (res.ok) {
        setShowRevenueModal(false);
        setRevenueAmount('');
        setSuccessMessage('Revenue added successfully!');
        // Refresh release data to show new revenue
        const endpoint = user.role === 'admin' ? `/api/admin/release/${id}` : `/api/artist/release/${id}`;
        const refreshRes = await fetch(endpoint, {
          headers: { 'x-user-id': user.id.toString() }
        });
        const data = await refreshRes.json();
        setRelease(data);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addPlatformLink = () => {
    if (!newLink.url) return;
    setPlatformLinks([...platformLinks, newLink]);
    setNewLink({ platform: 'Spotify', url: '' });
  };

  const removePlatformLink = (index: number) => {
    setPlatformLinks(platformLinks.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8">Loading release details...</div>;
  if (!release) return <div className="p-8">Release not found</div>;

  return (
    <div className="space-y-10">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingTrack(null)} 
        className="hidden" 
      />

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
      </AnimatePresence>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">
        <ChevronLeft className="w-5 h-5" /> Back to Releases
      </button>

      <div className="glass-card overflow-hidden">
        <div className="p-6 md:p-12 flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-96 shrink-0">
            <div className="relative group">
              <img src={release.artwork_url} className="w-full aspect-square rounded-[2.5rem] object-cover shadow-2xl group-hover:scale-[1.02] transition-transform duration-700" alt="" />
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                <a 
                  href={release.artwork_url} 
                  download={`artwork-${release.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-110 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Artwork
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border",
                  release.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  release.status === 'rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                  release.status === 'streamed' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                  release.status === 'action_required' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-white/10 text-white border-white/10"
                )}>
                  {release.status}
                </span>
                <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">ID: #{release.id}</span>
              </div>
              <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{release.title}</h2>
              <p className="text-white/40 font-black text-lg uppercase tracking-widest mb-6">by {release.artist_name || 'Artist'}</p>
              
              {release.admin_remarks && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl mb-8">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-[10px] uppercase tracking-widest mb-2">
                    <AlertCircle className="w-4 h-4" /> Admin Remarks
                  </div>
                  <p className="text-white/80 text-sm font-medium">{release.admin_remarks}</p>
                </div>
              )}

              {release.description && (
                <div className="p-6 bg-white/5 border border-white/5 rounded-3xl mb-8">
                  <div className="flex items-center gap-2 text-white/20 font-black text-[10px] uppercase tracking-widest mb-2">
                    <FileText className="w-4 h-4" /> Artist Remarks
                  </div>
                  <p className="text-white/80 text-sm font-medium italic">"{release.description}"</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Release Date</p>
                <div className="flex items-center gap-3 text-white font-black tracking-tight">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  {new Date(release.release_date).toLocaleDateString()}
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Genre & Language</p>
                <div className="flex items-center gap-4 text-white font-black tracking-tight">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-brand-primary" />
                    {release.genre}
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-brand-primary" />
                    {release.metadata_language.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Distribution Stores</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {JSON.parse(release.stores).map((s: string) => {
                    const platform = platforms.find(p => p.name === s);
                    return (
                      <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 group/store hover:border-brand-primary/30 transition-all">
                        <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          {platform?.logo_url ? (
                            <img src={platform.logo_url} className="w-full h-full object-contain" alt={s} />
                          ) : platform?.logo_svg ? (
                            <div 
                              className="w-3 h-3 fill-current text-white/40 group-hover/store:text-brand-primary transition-colors" 
                              dangerouslySetInnerHTML={{ __html: platform.logo_svg }} 
                            />
                          ) : (
                            <span className="text-[8px] font-black text-white/20">{s.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Price Codes</p>
                <div className="flex flex-col gap-2 text-white font-black tracking-tight">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/40 uppercase">General:</span>
                    <span>{release.price_code_general}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/40 uppercase">iTunes:</span>
                    <span>{release.price_code_itunes}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Territories</p>
                <div className="flex items-center gap-3 text-white font-black tracking-tight">
                  <Globe className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs">
                    {release.territory_exclusion ? 'Excluded: ' : 'Included: '}
                    {JSON.parse(release.territories).length === 0 ? 'Worldwide' : JSON.parse(release.territories).join(', ')}
                  </span>
                </div>
              </div>
              {release.is_previously_released && (
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all md:col-span-2">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Original Release Info</p>
                  <div className="flex items-center gap-3 text-white font-black tracking-tight">
                    <Calendar className="w-5 h-5 text-brand-primary" />
                    Originally released on: {new Date(release.original_release_date).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {platformLinks.length > 0 && (
              <div className="space-y-4 pt-6">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Streaming Links</p>
                <div className="flex flex-wrap gap-4">
                  {platformLinks.map((link, i) => (
                    <a 
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-brand-primary transition-all group"
                    >
                      <Globe className="w-5 h-5 text-brand-primary" />
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">{link.platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {user.role === 'admin' && (
              <div className="flex flex-col gap-6 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-black text-sm uppercase tracking-widest">Admin Controls</h4>
                  <button 
                    onClick={() => setShowLinksModal(true)}
                    className="text-brand-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Manage Links
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setShowRevenueModal(true)}
                    disabled={release.status !== 'streamed'}
                    className="vibrant-gradient text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-primary/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Plus className="w-5 h-5" /> Add Revenue
                  </button>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setShowStatusModal({ status: 'approved', remarks: '' })}
                      className="bg-emerald-500/10 text-emerald-400 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-500/10 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => setShowStatusModal({ status: 'rejected', remarks: '' })}
                      className="bg-rose-500/10 text-rose-400 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-500/10 hover:bg-rose-500/20 transition-all flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button 
                      onClick={() => setShowStatusModal({ status: 'streamed', remarks: '' })}
                      disabled={release.status !== 'approved'}
                      className="bg-indigo-500/10 text-indigo-400 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-500/10 hover:bg-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Music className="w-4 h-4" /> Streamed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'artist' && (release.status === 'pending' || release.status === 'rejected' || release.status === 'draft') && (
              <div className="flex gap-4 pt-8 border-t border-white/5">
                <button 
                  onClick={() => navigate(`/upload?edit=${release.id}`)}
                  className="flex-1 bg-white/5 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <Edit2 className="w-4 h-4" /> {release.status === 'draft' ? 'Edit Draft' : 'Edit Release'}
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-rose-500/10 text-rose-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-500/10 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-4 h-4" /> Delete Release
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 md:px-12 pb-12">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Tracklist</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Audio files in this release</p>
            </div>
          </div>
          <div className="space-y-3">
            {release.tracks.map((track, i) => (
              <div key={track.id} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-6">
                  <span className="text-white/20 font-black text-lg w-6">{i + 1}</span>
                  <div>
                    <p className="font-black text-white tracking-tight group-hover:text-brand-primary transition-colors">{track.title}</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{track.artist_name} • {track.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Composer</p>
                    <p className="text-xs text-white/60 font-bold">{track.composer}</p>
                  </div>
                  {track.file_url ? (
                    <div className="flex items-center gap-3">
                      <a 
                        href={track.file_url} 
                        download 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all shadow-lg border border-white/5"
                        title="Download Track"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button 
                        onClick={() => toggleAudio(track.file_url)}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                          playingTrack === track.file_url 
                            ? "bg-brand-primary text-white shadow-brand-primary/40 scale-110" 
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white shadow-emerald-500/20"
                        )}
                      >
                        {playingTrack === track.file_url ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/10">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {release.revenue && release.revenue.length > 0 && (
          <div className="px-10 md:px-12 pb-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Revenue Breakdown</h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Earnings from streaming platforms</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {release.revenue.map((rev, i) => (
                <div key={i} className="p-8 bg-white/5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{rev.platform}</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tight">${rev.amount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-xs text-white/60 font-bold">{new Date(rev.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatusModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">Update Status</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Mark release as {showStatusModal.status}</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Remarks / Instructions</label>
                  <textarea 
                    value={showStatusModal.remarks}
                    onChange={e => setShowStatusModal({ ...showStatusModal, remarks: e.target.value })}
                    placeholder="Enter rejection reasons or required actions..."
                    rows={4}
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowStatusModal(null)}
                    className="flex-1 py-5 rounded-2xl bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleStatusUpdate}
                    className="flex-1 vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Links Modal */}
      <AnimatePresence>
        {showLinksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLinksModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Streaming Links</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Add direct links to streaming platforms</p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <select 
                    value={newLink.platform}
                    onChange={e => setNewLink({ ...newLink, platform: e.target.value })}
                    className="flex-1 px-6 py-4 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/10 focus:border-brand-primary transition-all appearance-none"
                  >
                    {platforms.map(p => (
                      <option key={p.id} value={p.name} className="bg-[#0a0a0a]">{p.name}</option>
                    ))}
                  </select>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={newLink.url}
                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                    className="flex-[2] px-6 py-4 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/10 focus:border-brand-primary transition-all"
                  />
                  <button 
                    onClick={addPlatformLink}
                    className="p-4 bg-brand-primary text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-brand-primary/20"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {platformLinks.map((link, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-white font-black text-[10px] uppercase tracking-widest">{link.platform}</p>
                        <p className="text-white/20 text-[10px] truncate max-w-[200px]">{link.url}</p>
                      </div>
                      <button 
                        onClick={() => removePlatformLink(i)}
                        className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowLinksModal(false)}
                  className="w-full vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRevenueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRevenueModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Add Revenue</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Manually add streaming revenue for this release</p>
              
              <form onSubmit={handleAddRevenue} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Platform</label>
                  <select 
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/10 focus:border-brand-primary transition-all appearance-none"
                  >
                    {platforms.map(p => (
                      <option key={p.id} value={p.name} className="bg-[#0a0a0a]">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Amount (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={revenueAmount}
                      onChange={e => setRevenueAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-6 py-5 rounded-2xl outline-none text-xl font-black"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowRevenueModal(false)}
                    className="flex-1 py-5 rounded-2xl bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Add Revenue
                  </button>
                </div>
              </form>
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
