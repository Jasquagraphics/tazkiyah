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
  Globe
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
import ChartErrorBoundary from './ChartErrorBoundary';
import { Release, Withdrawal, User } from '../types';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<any>(null);
  const [pendingReleases, setPendingReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || !user.id) {
           setError('User session invalid');
           setLoading(false);
           return;
        }

        const [statsRes, releasesRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: { 'x-user-id': user.id.toString() } }),
          fetch('/api/admin/releases', { headers: { 'x-user-id': user.id.toString() } })
        ]);
        
        if (!statsRes.ok || !releasesRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const statsData = await statsRes.json();
        const releasesData = await releasesRes.json();
        
        setStats(statsData || {});
        setPendingReleases(Array.isArray(releasesData) ? releasesData.filter((r: Release) => r.status === 'pending') : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/release/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ status, message: `Release ${status} by admin.` })
      });
      if (res.ok) {
        setPendingReleases(prev => prev.filter(r => r.id !== id));
        // Refresh stats
        const statsRes = await fetch('/api/admin/stats', { headers: { 'x-user-id': user.id.toString() } });
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[50vh] text-red-500">
      <p>{error}</p>
    </div>
  );

  if (!stats) return null;

  const COLORS = ['#18181b', '#71717a', '#a1a1aa', '#d4d4d8', '#e5e5e5'];

  return (
    <div className="space-y-10">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard title="Total Revenue" value={`$${(stats.totalRevenue || 0).toFixed(2)}`} icon={TrendingUp} color="vibrant-gradient text-white" to="/wallet" />
        <AdminStatCard title="Total Artists" value={stats.totalUsers || 0} icon={Users} color="bg-white/5 text-white" to="/artists" />
        <AdminStatCard title="Total Releases" value={stats.totalReleases || 0} icon={Music} color="bg-white/5 text-white" to="/releases" />
        <AdminStatCard title="Pending Payouts" value={`$${(stats.pendingWithdrawals || 0).toFixed(2)}`} icon={Wallet} color="bg-white/5 text-white" to="/wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue by Platform */}
        <div className="lg:col-span-2 glass-card p-8 md:p-10">
          <h3 className="text-2xl font-black text-white mb-10 tracking-tight">Revenue Distribution</h3>
          <div className="h-[350px]">
            <ChartErrorBoundary>
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
            </ChartErrorBoundary>
          </div>
        </div>

        {/* Platform Share */}
        <div className="glass-card p-8 md:p-10">
          <h3 className="text-2xl font-black text-white mb-10 tracking-tight">Platform Share</h3>
          <div className="h-[350px]">
            <ChartErrorBoundary>
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
            </ChartErrorBoundary>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="glass-card overflow-hidden">
        <div className="p-10 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Pending Approvals</h3>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Review and approve new music submissions</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl">
            <button className="px-4 py-2 bg-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest">All</button>
            <button className="px-4 py-2 text-xs font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">Newest</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
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
                        {(() => {
                          try {
                            const parsed = JSON.parse(release.stores || '[]');
                            const stores = Array.isArray(parsed) ? parsed : [];
                            if (stores.length === 0) return <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">No stores</span>;
                            return (
                              <>
                                {stores.slice(0, 3).map((store: string) => (
                                  <div key={store} className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#030014] flex items-center justify-center text-[8px] font-black text-white uppercase">
                                    {store.charAt(0)}
                                  </div>
                                ))}
                                {stores.length > 3 && (
                                  <div className="w-7 h-7 rounded-full vibrant-gradient border-2 border-[#030014] flex items-center justify-center text-[8px] font-black text-white">
                                    +{stores.length - 3}
                                  </div>
                                )}
                              </>
                            );
                          } catch (e) {
                            return <span className="text-white/20 text-xs">No stores</span>;
                          }
                        })()}
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
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ title, value, icon: Icon, color, to }: any) {
  const cardColor = color || 'bg-white/5';
  const content = (
    <div className={cn("glass-card p-8 group hover:scale-[1.02] transition-all duration-500 h-full", cardColor.includes('vibrant') ? cardColor : 'bg-white/5')}>
      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", cardColor.includes('vibrant') ? 'bg-white/20' : 'bg-brand-primary/10 text-brand-primary')}>
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
