import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Music, 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Play,
  Globe,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { User, Release, Revenue } from '../types';
import { Link } from 'react-router-dom';

interface ArtistDashboardProps {
  user: User;
}

export default function ArtistDashboard({ user }: ArtistDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [recentReleases, setRecentReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [releasesRes, balanceRes] = await Promise.all([
          fetch('/api/artist/releases', { headers: { 'x-user-id': user.id.toString() } }),
          fetch('/api/artist/balance', { headers: { 'x-user-id': user.id.toString() } })
        ]);

        if (!releasesRes.ok || !balanceRes.ok) {
          throw new Error('Failed to fetch artist dashboard data');
        }

        const releases = await releasesRes.json();
        const balanceData = await balanceRes.json();

        setRecentReleases(releases.slice(0, 3));
        
        // Mock some analytics data based on revenue history
        const revenueHistory = balanceData.history || [];
        const chartData = revenueHistory.map((r: any) => ({
          name: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: r.amount
        })).reverse();

        setStats({
          balance: balanceData.balance,
          totalStreams: Math.floor(Math.random() * 1000000), // Mock
          activeReleases: releases.length,
          chartData: chartData.length > 0 ? chartData : [
            { name: 'Mon', amount: 0 },
            { name: 'Tue', amount: 0 },
            { name: 'Wed', amount: 0 },
            { name: 'Thu', amount: 0 },
            { name: 'Fri', amount: 0 },
            { name: 'Sat', amount: 0 },
            { name: 'Sun', amount: 0 },
          ]
        });
      } catch (err) {
        console.error('Artist Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-200 rounded-2xl" />)}
    </div>
    <div className="h-96 bg-zinc-200 rounded-2xl" />
  </div>;

  if (!stats) return (
    <div className="p-10 text-center">
      <div className="glass-card p-10 inline-block">
        <h2 className="text-2xl font-black text-white mb-4">Load failed</h2>
        <p className="text-white/40 text-sm mb-6">There was an error loading your dashboard data.</p>
        <button 
          onClick={() => window.location.reload()}
          className="vibrant-gradient text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="Total Balance" 
          value={`$${stats.balance.toFixed(2)}`} 
          icon={Wallet} 
          trend="+12.5%" 
          trendUp={true} 
          color="vibrant-gradient text-white"
        />
        <StatCard 
          title="Active Releases" 
          value={stats.activeReleases} 
          icon={Music} 
          trend="0%" 
          trendUp={true} 
          color="bg-white/5 text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 glass-card p-6 md:p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Revenue Overview</h3>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-1">Daily earnings from all platforms</p>
            </div>
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
              <button 
                onClick={() => setStats({...stats, filter: '7'})}
                className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", (stats.filter === '7' || !stats.filter) ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
              >
                7 Days
              </button>
              <button 
                onClick={() => setStats({...stats, filter: '30'})}
                className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", stats.filter === '30' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
              >
                30 Days
              </button>
            </div>
          </div>
          
          <div className="h-[300px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 800 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 800 }}
                  tickFormatter={(value) => `$${value}`}
                />
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
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8B5CF6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white tracking-tight">Recent Releases</h3>
            <Link to="/releases" className="text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">View All</Link>
          </div>
          <div className="space-y-6">
            {recentReleases.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">No releases yet</p>
                <Link to="/upload" className="text-brand-primary font-black mt-4 inline-block uppercase tracking-widest text-[10px]">Upload your first track</Link>
              </div>
            ) : (
              recentReleases.map(release => (
                <Link 
                  key={release.id} 
                  to={`/release/${release.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-500">
                    <img 
                      src={release.artwork_url || 'https://picsum.photos/seed/music/100/100'} 
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white truncate text-sm tracking-tight group-hover:text-brand-primary transition-colors">{release.title}</h4>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-0.5">{release.status}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/10 group-hover:text-brand-primary transition-colors" />
                </Link>
              ))
            )}
          </div>
          
          {/* Quick Action Card */}
          <div className="mt-10 p-6 vibrant-gradient rounded-3xl relative overflow-hidden group cursor-pointer shadow-xl shadow-brand-primary/20">
            <div className="relative z-10">
              <h4 className="text-lg font-black text-white mb-1">New Release?</h4>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-4">Distribute now</p>
              <Link to="/upload" className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                <Plus className="w-3 h-3" /> Start
              </Link>
            </div>
            <Music className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  return (
    <div className={cn("glass-card p-8 group hover:scale-[1.02] transition-all duration-500", color.includes('vibrant') ? color : 'bg-white/5')}>
      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", color.includes('vibrant') ? 'bg-white/20' : 'bg-brand-primary/10 text-brand-primary')}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
          trendUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{title}</p>
      <h4 className="text-3xl font-black tracking-tighter">{value}</h4>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
