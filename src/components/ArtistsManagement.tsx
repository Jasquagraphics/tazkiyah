import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Music, 
  Wallet, 
  Search, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  TrendingUp,
  Globe,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Release, Withdrawal, Revenue } from '../types';
import { Link } from 'react-router-dom';

interface ArtistsManagementProps {
  user: User;
}

export default function ArtistsManagement({ user }: ArtistsManagementProps) {
  const [artists, setArtists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [artistDetail, setArtistDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueData, setRevenueData] = useState({ amount: '', platform: 'Spotify', releaseId: 0 });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchArtists();
  }, [user.id]);

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistDetail) return;

    try {
      const res = await fetch('/api/admin/add-revenue', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          artist_id: artistDetail.id,
          release_id: revenueData.releaseId,
          amount: parseFloat(revenueData.amount),
          platform: revenueData.platform
        })
      });

      if (res.ok) {
        setShowRevenueModal(false);
        setRevenueData({ amount: '', platform: 'Spotify', releaseId: 0 });
        // Refresh artist detail
        fetchArtistDetail(artistDetail.id);
        setSuccessMessage('Revenue added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReleaseStatusUpdate = async (releaseId: number, status: string) => {
    const message = prompt(`Enter a message for the artist (optional):`, `Your release status has been updated to ${status}.`);
    
    try {
      const res = await fetch(`/api/admin/release/${releaseId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ status, message })
      });

      if (res.ok) {
        setArtistDetail({
          ...artistDetail,
          releases: artistDetail.releases.map((r: Release) => r.id === releaseId ? { ...r, status } : r)
        });
        setSuccessMessage(`Release status updated to ${status}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchArtists = async () => {
    try {
      const res = await fetch('/api/admin/artists', {
        headers: { 'x-user-id': user.id.toString() }
      });
      const data = await res.json();
      setArtists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/artist/${id}`, {
        headers: { 'x-user-id': user.id.toString() }
      });
      const data = await res.json();
      setArtistDetail(data);
      setSelectedArtistId(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/artist/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setArtists(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        if (artistDetail && artistDetail.id === id) {
          setArtistDetail({ ...artistDetail, status });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArtist = async (id: number) => {
    if (!confirm('Are you sure you want to delete this artist? This action is irreversible and will delete all their releases, revenue, and data.')) return;
    
    try {
      const res = await fetch(`/api/admin/artist/${id}`, { 
        method: 'DELETE',
        headers: { 'x-user-id': user.id.toString() }
      });
      if (res.ok) {
        setArtists(prev => prev.filter(a => a.id !== id));
        setSelectedArtistId(null);
        setArtistDetail(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredArtists = artists.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10">
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

      <AnimatePresence mode="wait">
        {!selectedArtistId ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight">Artists</h2>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Manage all registered artists and their status</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input 
                  type="text" 
                  placeholder="Search artists..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl outline-none font-black text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArtists.map(artist => (
                <div key={artist.id} className="glass-card p-8 group hover:border-brand-primary/50 transition-all duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] vibrant-gradient p-[1px] shadow-xl shadow-brand-primary/20">
                      <div className="w-full h-full rounded-[23px] bg-[#030014] flex items-center justify-center text-white text-2xl font-black">
                        {artist.name.charAt(0)}
                      </div>
                    </div>
                    <StatusBadge status={artist.status || 'pending'} />
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white tracking-tight truncate">{artist.name}</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{artist.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Balance</p>
                      <p className="text-lg font-black text-white">${artist.balance?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">ID</p>
                      <p className="text-lg font-black text-white">#{artist.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => fetchArtistDetail(artist.id)}
                      className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Manage Artist
                    </button>
                    <button 
                      onClick={() => handleDeleteArtist(artist.id)}
                      className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedArtistId(null)}
                className="flex items-center gap-3 text-white/40 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <ArrowLeft className="w-5 h-5" /> Back to Artists
              </button>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleStatusUpdate(artistDetail.id, 'approved')}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                    artistDetail.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40 hover:text-white"
                  )}
                >
                  Approve Artist
                </button>
                <button 
                  onClick={() => handleStatusUpdate(artistDetail.id, 'pending')}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                    artistDetail.status === 'pending' ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40 hover:text-white"
                  )}
                >
                  Set Pending
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Artist Profile Card */}
              <div className="lg:col-span-1 space-y-10">
                <div className="glass-card p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-[2.5rem] vibrant-gradient p-[1px] shadow-2xl shadow-brand-primary/30 mb-8">
                      <div className="w-full h-full rounded-[39px] bg-[#030014] flex items-center justify-center text-white text-5xl font-black">
                        {artistDetail.name.charAt(0)}
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight mb-2">{artistDetail.name}</h3>
                    <p className="text-white/40 font-black text-[10px] uppercase tracking-widest mb-8">{artistDetail.email}</p>
                    
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Balance</p>
                        <p className="text-2xl font-black text-white">${artistDetail.balance.toFixed(2)}</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Releases</p>
                        <p className="text-2xl font-black text-white">{artistDetail.releases.length}</p>
                      </div>
                    </div>

                    <div className="w-full p-6 bg-white/5 rounded-3xl border border-white/5 text-left">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Payout Info</p>
                      <p className="text-sm text-white/60 font-medium leading-relaxed">
                        {artistDetail.bank_info || 'No payout information provided yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Withdrawal Requests */}
                <div className="glass-card p-10">
                  <h4 className="text-xl font-black text-white tracking-tight mb-8">Withdrawal History</h4>
                  <div className="space-y-4">
                    {artistDetail.withdrawals.length === 0 ? (
                      <p className="text-center text-white/20 text-[10px] font-black uppercase tracking-widest py-10">No withdrawal requests</p>
                    ) : (
                      artistDetail.withdrawals.map((w: Withdrawal) => (
                        <div key={w.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="font-black text-white tracking-tight">${w.amount.toFixed(2)}</p>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">
                              {new Date(w.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={w.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Submissions and Revenue */}
              <div className="lg:col-span-2 space-y-10">
                <div className="glass-card p-10">
                  <h4 className="text-2xl font-black text-white tracking-tight mb-10">Music Submissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {artistDetail.releases.map((release: Release) => (
                      <div key={release.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex gap-6 mb-6">
                          <img src={release.artwork_url} className="w-24 h-24 rounded-2xl object-cover shadow-lg" alt="" />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-black text-white tracking-tight truncate mb-1">{release.title}</h5>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">
                              {new Date(release.release_date).toLocaleDateString()}
                            </p>
                            <StatusBadge status={release.status} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <Link 
                              to={`/release/${release.id}`}
                              className="flex-1 bg-white/5 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center hover:bg-white/10 transition-all"
                            >
                              View Details
                            </Link>
                            <button 
                              onClick={() => {
                                setRevenueData({ ...revenueData, releaseId: release.id });
                                setShowRevenueModal(true);
                              }}
                              className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-all"
                              title="Add Revenue"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['approved', 'rejected', 'streamed'].map(status => (
                              <button
                                key={status}
                                onClick={() => handleReleaseStatusUpdate(release.id, status)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                                  release.status === status 
                                    ? "bg-brand-primary/20 text-brand-primary border-brand-primary/30" 
                                    : "bg-white/5 text-white/20 border-white/5 hover:text-white"
                                )}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue History */}
                <div className="glass-card p-10">
                  <h4 className="text-2xl font-black text-white tracking-tight mb-10">Revenue History</h4>
                  <div className="space-y-4">
                    {artistDetail.revenue.length === 0 ? (
                      <p className="text-center text-white/20 text-[10px] font-black uppercase tracking-widest py-10">No revenue records found</p>
                    ) : (
                      artistDetail.revenue.map((r: Revenue) => (
                        <div key={r.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                              <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-white tracking-tight">${r.amount.toFixed(2)}</p>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{r.platform}</p>
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {new Date(r.date).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Modal */}
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
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Manually add streaming revenue for this artist</p>
                    
                    <form onSubmit={handleAddRevenue} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Platform</label>
                        <select 
                          value={revenueData.platform}
                          onChange={e => setRevenueData({ ...revenueData, platform: e.target.value })}
                          className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm"
                        >
                          {['Spotify', 'Apple Music', 'Amazon Music', 'JioSaavn', 'YouTube Music'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Amount (USD)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={revenueData.amount}
                          onChange={e => setRevenueData({ ...revenueData, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-6 py-5 rounded-2xl outline-none text-xl font-black"
                        />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string, icon: any }> = {
    pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
    approved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    rejected: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: XCircle },
    action_required: { color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: Globe },
    streamed: { color: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30', icon: Music },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={cn("px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-2xl", config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {status.replace('_', ' ')}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
