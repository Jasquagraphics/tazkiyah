import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  Music, 
  Wallet, 
  Settings, 
  Bell, 
  LogOut, 
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Search,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types
import { User, Release, Notification, Withdrawal, Revenue } from './types';

// Components
import ArtistDashboard from './components/ArtistDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReleaseUpload from './components/ReleaseUpload';
import WalletView from './components/WalletView';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import ReleaseDetails from './components/ReleaseDetails';
import ArtistsManagement from './components/ArtistsManagement';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && typeof parsedUser === 'object' && parsedUser.id) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('user');
        }
      }
    } catch (e) {
      console.error('Failed to parse user from local storage', e);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleUpdateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030014]">
      <div className="w-16 h-16 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4" />
      <p className="text-brand-primary font-bold animate-pulse">SonicStream</p>
    </div>
  );

  if (!user || !user.id) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-transparent overflow-hidden flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar user={user} onLogout={handleLogout} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
          <header className="sticky top-0 z-20 bg-black/20 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-6 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-1">
                {user.role === 'admin' ? 'Administration' : 'Artist Portal'}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white truncate pr-4">
                {user.role === 'admin' ? 'Control Center' : `Welcome, ${user.name || 'User'}`}
              </h1>
            </div>
            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              <NotificationBell userId={user.id} />
              <div className="h-10 w-10 rounded-2xl vibrant-gradient p-[1px] shadow-lg shadow-brand-primary/20">
                <div className="w-full h-full rounded-[15px] bg-[#030014] flex items-center justify-center text-white text-sm font-black">
                  {(user.name || 'U').charAt(0)}
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={user.role === 'admin' ? <AdminDashboard user={user} /> : <ArtistDashboard user={user} />} />
              <Route path="/upload" element={user.role === 'artist' ? <ReleaseUpload user={user} /> : <Navigate to="/" />} />
              <Route path="/releases" element={<ReleasesList user={user} />} />
              <Route path="/wallet" element={<WalletView user={user} onUpdate={handleUpdateUser} />} />
              <Route path="/artists" element={user.role === 'admin' ? <ArtistsManagement user={user} /> : <Navigate to="/" />} />
              <Route path="/release/:id" element={<ReleaseDetails user={user} />} />
              <Route path="/settings" element={<ProfileSettings user={user} onUpdate={handleUpdateUser} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav user={user} />
      </div>
    </Router>
  );
}

function MobileNav({ user }: { user: User }) {
  const navItems = user.role === 'admin' ? [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Users, label: 'Artists', path: '/artists' },
    { icon: Music, label: 'Music', path: '/releases' },
    { icon: Wallet, label: 'Payouts', path: '/wallet' },
  ] : [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: Music, label: 'Music', path: '/releases' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav px-4 py-4 flex items-center justify-around z-50">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="flex flex-col items-center gap-1.5 px-3 py-1 text-white/50 hover:text-brand-primary transition-all active:scale-95"
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navItems = user.role === 'admin' ? [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Music, label: 'Manage Releases', path: '/releases' },
    { icon: Wallet, label: 'Withdrawals', path: '/wallet' },
    { icon: Users, label: 'Artists', path: '/artists' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ] : [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Upload, label: 'New Release', path: '/upload' },
    { icon: Music, label: 'My Music', path: '/releases' },
    { icon: Wallet, label: 'Earnings', path: '/wallet' },
    { icon: Settings, label: 'Profile', path: '/settings' },
  ];

  return (
    <aside className="w-72 bg-black/20 backdrop-blur-3xl border-r border-white/5 flex flex-col">
      <div className="p-10">
        <div className="flex items-center gap-3 text-white font-black text-2xl tracking-tighter">
          <div className="w-10 h-10 vibrant-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <Music className="text-white w-6 h-6" />
          </div>
          <span>SonicStream</span>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-4 px-4 py-4 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all group"
          >
            <item.icon className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            <span className="font-bold tracking-tight">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-8 border-t border-white/5">
        <button
          onClick={onLogout}
          className="flex items-center gap-4 px-4 py-4 w-full text-white/40 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all group"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function NotificationBell({ userId }: { userId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/artist/notifications', {
      headers: { 'x-user-id': userId.toString() }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    })
    .catch(err => {
      console.error('Notification error:', err);
      setNotifications([]);
    });
  }, [userId]);

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

  return (
    <div className="relative">
      <button 
        onClick={() => setShow(!show)}
        className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all relative group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-primary rounded-full border-2 border-[#030014] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {show && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShow(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 glass-card z-30 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 font-black text-white uppercase tracking-widest text-[10px]">Notifications</div>
              <div className="max-h-96 overflow-y-auto">
                {!Array.isArray(notifications) || notifications.length === 0 ? (
                  <div className="p-10 text-center text-white/20 text-[10px] font-black uppercase tracking-widest italic">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={cn("p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors", !n.is_read && "bg-brand-primary/5")}>
                      <p className="text-sm text-white/80 leading-relaxed font-medium">{n.message}</p>
                      <span className="text-[10px] text-white/20 mt-3 block font-black uppercase tracking-widest">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReleasesList({ user }: { user: User }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = user.role === 'admin' ? '/api/admin/releases' : '/api/artist/releases';
    fetch(endpoint, {
      headers: { 'x-user-id': user.id.toString() }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setReleases(data);
      } else {
        setReleases([]);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch releases:', err);
      setReleases([]);
      setLoading(false);
    });
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Releases</h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Manage your music catalog</p>
        </div>
        {user.role === 'artist' && (
          <Link to="/upload" className="vibrant-gradient text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
            <Upload className="w-5 h-5" />
            New Release
          </Link>
        )}
      </div>

      {releases.length === 0 ? (
        <div className="glass-card p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 mx-auto mb-6">
            <Music className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No releases found</h3>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Start by uploading your first track</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {releases.map(release => (
            <div key={release.id} className="glass-card overflow-hidden group hover:border-brand-primary/50 transition-all duration-500">
              <div className="aspect-square relative overflow-hidden">
                <img 
                  src={release.artwork_url || 'https://picsum.photos/seed/music/400/400'} 
                  alt={release.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4">
                  <StatusBadge status={release.status} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                  <Link to={`/release/${release.id}`} className="w-full vibrant-gradient text-white py-4 rounded-2xl font-black text-center text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-primary/20">
                    View Details
                  </Link>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-black text-white text-2xl mb-1 tracking-tight truncate">{release.title}</h3>
                {user.role === 'admin' && <p className="text-[10px] text-brand-primary mb-4 font-black uppercase tracking-widest">{release.artist_name}</p>}
                {release.description && (
                  <p className="text-white/40 text-[11px] font-medium line-clamp-3 mt-4 leading-relaxed italic">
                    "{release.description}"
                  </p>
                )}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{new Date(release.release_date).toLocaleDateString()}</span>
                  <div className="flex -space-x-3">
                    {(() => {
                      try {
                        const stores = JSON.parse(release.stores || '[]');
                        return Array.isArray(stores) ? stores.slice(0, 3) : [];
                      } catch (e) {
                        return [];
                      }
                    })().map((s: string) => (
                      <div key={s} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase backdrop-blur-md shadow-lg">
                        {s.charAt(0)}
                      </div>
                    ))}
                    {(() => {
                      try {
                        const stores = JSON.parse(release.stores || '[]');
                        const count = Array.isArray(stores) ? stores.length : 0;
                        return count > 3 ? (
                          <div className="w-8 h-8 rounded-xl bg-brand-primary text-white border border-white/10 flex items-center justify-center text-[10px] font-black uppercase backdrop-blur-md shadow-lg">
                            +{count - 3}
                          </div>
                        ) : null;
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string, icon: any }> = {
    pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
    approved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    rejected: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: X },
    action_required: { color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: AlertCircle },
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
