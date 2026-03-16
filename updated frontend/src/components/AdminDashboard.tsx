import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Music, 
  Wallet, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  Globe,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Release, Withdrawal } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [pendingReleases, setPendingReleases] = useState<Release[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, releasesRes, platformsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/releases'),
          fetch('/api/platforms')
        ]);
        
        if (!statsRes.ok || !releasesRes.ok || !platformsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const statsData = await statsRes.json();
        const releasesData = await releasesRes.json();
        const platformsData = await platformsRes.json();
        
        setStats(statsData);
        setPendingReleases(releasesData.filter((r: Release) => r.status === 'pending'));
        setPlatforms(platformsData);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/release/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message: `Release ${status} by admin.` })
      });
      if (res.ok) {
        setPendingReleases(prev => prev.filter(r => r.id !== id));
        // Refresh stats
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading admin dashboard...</div>;
  
  if (!stats) return (
    <div className="p-4 md:p-10 text-center">
      <div className="glass-card p-6 md:p-10 inline-block w-full max-w-md">
        <h2 className="text-2xl font-black text-white mb-4">Load failed</h2>
        <p className="text-white/40 text-sm mb-6">There was an error loading the dashboard stats.</p>
        <button 
          onClick={() => window.location.reload()}
          className="vibrant-gradient text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const COLORS = ['#18181b', '#71717a', '#a1a1aa', '#d4d4d8', '#e5e5e5'];

  return (
    <div className="space-y-10">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard title="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="vibrant-gradient text-white" to="/wallet" />
        <AdminStatCard title="Total Artists" value={stats.totalUsers} icon={Users} color="bg-white/5 text-white" to="/artists" />
        <AdminStatCard title="Total Releases" value={stats.totalReleases} icon={Music} color="bg-white/5 text-white" to="/releases" />
        <AdminStatCard title="Pending Payouts" value={`$${stats.pendingWithdrawals.toFixed(2)}`} icon={Wallet} color="bg-white/5 text-white" to="/wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue by Platform */}
        <div className="lg:col-span-2 glass-card p-6 md:p-10">
          <h3 className="text-2xl font-black text-white mb-10 tracking-tight">Revenue Distribution</h3>
          <div className="h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByPlatform}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="platform" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 800 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 800 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '20px',
                    padding: '15px'
                  }} 
                  itemStyle={{ color: '#fff', fontWeight: 800 }}
                />
                <Bar dataKey="amount" fill="#8B5CF6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Share */}
        <div className="glass-card p-6 md:p-10">
          <h3 className="text-2xl font-black text-white mb-10 tracking-tight">Platform Share</h3>
          <div className="h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.revenueByPlatform}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="amount"
                  nameKey="platform"
                >
                  {stats.revenueByPlatform.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '20px',
                    padding: '15px'
                  }} 
                  itemStyle={{ color: '#fff', fontWeight: 800 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 md:p-10 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Pending Approvals</h3>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Review and approve new music submissions</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-4 py-2 bg-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest">All</button>
            <button className="flex-1 sm:flex-none px-4 py-2 text-xs font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">Newest</button>
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-hide">
          {/* Desktop Table */}
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest">
                <th className="px-10 py-6">Release</th>
                <th className="px-10 py-6">Artist</th>
                <th className="px-10 py-6">Date Submitted</th>
                <th className="px-10 py-6">Stores</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingReleases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-white/20 italic font-medium">No pending releases to review</td>
                </tr>
              ) : (
                pendingReleases.map(release => (
                  <tr key={release.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-500">
                          <img src={release.artwork_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <p className="font-black text-white tracking-tight">{release.title}</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">ID: #{release.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-white tracking-tight">{release.artist_name}</p>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{release.artist_email}</p>
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-white/40 uppercase tracking-widest">
                      {new Date(release.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex -space-x-2">
                        {JSON.parse(release.stores).slice(0, 3).map((store: string) => {
                          const platform = platforms.find(p => p.name === store);
                          return (
                            <div key={store} className="w-7 h-7 rounded-full bg-white/10 border-2 border-[var(--app-bg-color,#030014)] flex items-center justify-center text-[8px] font-black text-white uppercase overflow-hidden">
                              {platform?.logo_url ? (
                                <img src={platform.logo_url} className="w-full h-full object-contain" alt={store} />
                              ) : platform?.logo_svg ? (
                                <div 
                                  className="w-3 h-3 fill-current text-white/40" 
                                  dangerouslySetInnerHTML={{ __html: platform.logo_svg }} 
                                />
                              ) : (
                                store.charAt(0)
                              )}
                            </div>
                          );
                        })}
                        {JSON.parse(release.stores).length > 3 && (
                          <div className="w-7 h-7 rounded-full vibrant-gradient border-2 border-[var(--app-bg-color,#030014)] flex items-center justify-center text-[8px] font-black text-white">
                            +{JSON.parse(release.stores).length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleStatusUpdate(release.id, 'approved')}
                          className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-all active:scale-90"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(release.id, 'rejected')}
                          className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-500/20 transition-all active:scale-90"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <Link 
                          to={`/release/${release.id}`}
                          className="p-3 bg-white/5 text-white/40 rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-90"
                          title="View Details"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-white/5">
            {pendingReleases.length === 0 ? (
              <div className="px-8 py-20 text-center text-white/20 italic font-medium">No pending releases to review</div>
            ) : (
              pendingReleases.map(release => (
                <div key={release.id} className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shrink-0">
                      <img src={release.artwork_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-black text-white tracking-tight truncate">{release.title}</h5>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{release.artist_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Submitted</p>
                      <p className="text-[10px] font-bold text-white/60">{new Date(release.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Stores</p>
                      <div className="flex -space-x-1">
                        {JSON.parse(release.stores).slice(0, 3).map((store: string) => (
                          <div key={store} className="w-5 h-5 rounded-full bg-white/10 border border-[#030014] flex items-center justify-center text-[6px] font-black text-white uppercase">
                            {store.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleStatusUpdate(release.id, 'approved')}
                      className="flex-1 py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(release.id, 'rejected')}
                      className="flex-1 py-4 bg-rose-500/10 text-rose-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <Link 
                      to={`/release/${release.id}`}
                      className="p-4 bg-white/5 text-white/40 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Support Tickets Section */}
      <div className="glass-card p-10 overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-black text-white tracking-tight">Support Tickets</h3>
          <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
        </div>
        <AdminTicketList />
      </div>
    </div>
  );
}

function AdminTicketList() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/tickets')
      .then(res => res.json())
      .then(data => {
        setTickets(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl" />)}
  </div>;

  if (tickets.length === 0) return (
    <div className="text-center py-10">
      <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">No active tickets</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {tickets.slice(0, 6).map(ticket => (
        <div key={ticket.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-white text-sm tracking-tight">{ticket.subject}</p>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">From: {ticket.artist_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
              ticket.status === 'open' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
            )}>
              {ticket.status}
            </span>
            <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-brand-primary transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminStatCard({ title, value, icon: Icon, color, to }: any) {
  const content = (
    <div className={cn("glass-card p-6 md:p-8 group hover:scale-[1.02] transition-all duration-500 h-full", color.includes('vibrant') ? color : 'bg-white/5')}>
      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", color.includes('vibrant') ? 'bg-white/20' : 'bg-brand-primary/10 text-brand-primary')}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{title}</p>
      <h4 className="text-3xl font-black tracking-tighter">{value}</h4>
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }

  return content;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
