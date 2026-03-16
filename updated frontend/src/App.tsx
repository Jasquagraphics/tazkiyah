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
import { User, Release, Notification, Withdrawal, Revenue, AppSettings } from './types';

// Components
import ArtistDashboard from './components/ArtistDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReleaseUpload from './components/ReleaseUpload';
import WalletView from './components/WalletView';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import ReleaseDetails from './components/ReleaseDetails';
import ArtistsManagement from './components/ArtistsManagement';
import SupportChat from './components/SupportChat';
import Agreement from './components/Agreement';
import Onboarding from './components/Onboarding';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    app_name: 'SonicStream',
    app_logo_url: '',
    brand_primary: '#8b5cf6',
    brand_secondary: '#ec4899',
    brand_accent: '#22c55e',
    app_bg_color: '#030014',
    glass_card_bg: 'rgba(255, 255, 255, 0.06)',
    glass_card_border: 'rgba(255, 255, 255, 0.10)',
    border_radius: '24px',
    theme_mode: 'dark'
  });

  useEffect(() => {
    const fetchSettings = () => {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setAppSettings(data);
          // Apply theme variables
          const root = document.documentElement;
          root.style.setProperty('--brand-primary', data.brand_primary);
          root.style.setProperty('--brand-secondary', data.brand_secondary);
          root.style.setProperty('--brand-accent', data.brand_accent);
          root.style.setProperty('--app-bg-color', data.app_bg_color);
          root.style.setProperty('--glass-card-bg', data.glass_card_bg);
          root.style.setProperty('--glass-card-border', data.glass_card_border);
          root.style.setProperty('--border-radius', data.border_radius);

          // Theme Mode Handling
          const isDark = data.theme_mode !== 'light';
          root.classList.toggle('dark', isDark);
          root.classList.toggle('light', !isDark);
          
          if (isDark) {
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.4)');
            root.style.setProperty('--text-muted', 'rgba(255, 255, 255, 0.2)');
            root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.05)');
          } else {
            root.style.setProperty('--text-primary', '#0f172a');
            root.style.setProperty('--text-secondary', 'rgba(15, 23, 42, 0.6)');
            root.style.setProperty('--text-muted', 'rgba(15, 23, 42, 0.3)');
            root.style.setProperty('--border-color', 'rgba(15, 23, 42, 0.1)');
          }

          // Helper for alpha colors
          const hexToRgba = (hex: string, alpha: number) => {
            if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };

          root.style.setProperty('--brand-primary-alpha', hexToRgba(data.brand_primary, 0.15));
          root.style.setProperty('--brand-secondary-alpha', hexToRgba(data.brand_secondary, 0.15));
          root.style.setProperty('--brand-accent-alpha', hexToRgba(data.brand_accent, 0.05));
        });
    };

    fetchSettings();
    window.addEventListener('settingsUpdated', fetchSettings);

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);

    return () => window.removeEventListener('settingsUpdated', fetchSettings);
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--app-bg-color,#030014)]">
      <div className="w-16 h-16 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4" />
      <p className="text-brand-primary font-bold animate-pulse">{appSettings.app_name}</p>
    </div>
  );

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'artist' && user.status && user.status !== 'approved') {
    if (user.status === 'onboarding') {
      return <Onboarding user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />;
    }
    if (user.status === 'agreement_pending' || user.status === 'agreement_signed') {
      return (
        <Router>
          <div className="min-h-screen bg-transparent">
            <div className="p-6 md:p-10 max-w-6xl mx-auto">
              <Routes>
                <Route path="/agreement" element={<Agreement user={user} onLogout={handleLogout} />} />
                <Route path="*" element={<ArtistAccessGate user={user} onLogout={handleLogout} />} />
              </Routes>
            </div>
          </div>
        </Router>
      );
    }
    return (
      <Router>
        <div className="min-h-screen bg-transparent">
          <div className="p-6 md:p-10 max-w-6xl mx-auto">
            <Routes>
              <Route path="/agreement" element={<Agreement user={user} onLogout={handleLogout} />} />
              <Route path="*" element={<ArtistAccessGate user={user} onLogout={handleLogout} />} />
            </Routes>
          </div>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-transparent overflow-hidden flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar user={user} onLogout={handleLogout} settings={appSettings} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
          <header className="sticky top-0 z-20 bg-black/20 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary mb-0.5">
                {user.role === 'admin' ? 'Administration' : 'Artist Portal'}
              </span>
              <h1 className="text-lg md:text-xl font-black text-white truncate pr-4">
                {user.role === 'admin' ? 'Control Center' : `Welcome, ${user.name}`}
              </h1>
            </div>
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              <NotificationBell userId={user.id} />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl vibrant-gradient p-[1px] shadow-lg shadow-brand-primary/20 overflow-hidden">
                  <div className="w-full h-full rounded-[11px] bg-[var(--app-bg-color,#030014)] flex items-center justify-center overflow-hidden">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=transparent`} 
                      className="w-full h-full object-cover" 
                      alt={user.name}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all group"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={user.role === 'admin' ? <AdminDashboard /> : <ArtistDashboard user={user} />} />
              <Route path="/upload" element={<ReleaseUpload user={user} />} />
              <Route path="/releases" element={<ReleasesList user={user} />} />
              <Route path="/wallet" element={<WalletView user={user} onUpdate={handleUpdateUser} />} />
              <Route path="/artists" element={<ArtistsManagement />} />
              <Route path="/release/:id" element={<ReleaseDetails user={user} />} />
              <Route path="/settings" element={<ProfileSettings user={user} onUpdate={handleUpdateUser} onLogout={handleLogout} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav user={user} />
        
        {/* Support Chat */}
        <SupportChat user={user} />
      </div>
    </Router>
  );
}

function ArtistAccessGate({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();

  const copy = (() => {
    if (user.status === 'agreement_pending') {
      return {
        title: 'Agreement required',
        body: 'Your account is almost ready. Please review and sign the agreement to proceed.',
        action: 'Review Agreement',
        onClick: () => navigate('/agreement'),
      };
    }
    if (user.status === 'agreement_signed') {
      return {
        title: 'Agreement submitted',
        body: 'We have received your signature. Please wait while admin verifies your agreement.',
        action: '',
        onClick: () => {},
      };
    }
    return {
      title: 'Account pending approval',
      body: 'Your account is pending admin approval. Please wait or contact support.',
      action: '',
      onClick: () => {},
    };
  })();

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-lg w-full glass-card p-10 text-center">
        <h2 className="text-2xl font-black text-white tracking-tight mb-3">{copy.title}</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed">{copy.body}</p>
        {copy.action ? (
          <button
            type="button"
            onClick={copy.onClick}
            className="mt-8 w-full py-4 rounded-2xl vibrant-gradient text-white font-black tracking-widest uppercase text-xs"
          >
            {copy.action}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 w-full bg-white/5 border border-white/10 text-white/70 py-4 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/10 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function MobileNav({ user }: { user: User }) {
  const navItems = user.role === 'admin' ? [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Users, label: 'Artists', path: '/artists' },
    { icon: Music, label: 'Music', path: '/releases' },
    { icon: Wallet, label: 'Payouts', path: '/wallet' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ] : [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: Music, label: 'Music', path: '/releases' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Settings, label: 'Profile', path: '/settings' },
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

function Sidebar({ user, onLogout, settings }: { user: User; onLogout: () => void; settings: AppSettings }) {
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
    <aside className="w-64 bg-black/20 backdrop-blur-3xl border-r border-white/5 flex flex-col">
      <div className="p-8">
        <div className="flex items-center gap-2.5 text-white font-black text-xl tracking-tighter">
          <div className="w-8 h-8 vibrant-gradient rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/30 overflow-hidden">
            {settings.app_logo_url ? (
              <img src={settings.app_logo_url} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <Music className="text-white w-5 h-5" />
            )}
          </div>
          <span>{settings.app_name}</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
          >
            <item.icon className="w-4 h-4 group-hover:text-brand-primary transition-colors" />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-3 w-full text-white/40 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-bold text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function NotificationBell({ userId }: { userId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/artist/notifications', {
      headers: { 'x-user-id': userId.toString() }
    })
    .then(res => res.json())
    .then(setNotifications);
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, is_read: 1 } : notif));
    }
    if (n.link) {
      navigate(n.link);
      setShow(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShow(!show)}
        className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all relative group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-primary rounded-full border-2 border-[var(--app-bg-color,#030014)] animate-pulse" />
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
              className="absolute right-0 mt-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-[2rem] z-30 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 font-black text-white uppercase tracking-widest text-[10px] flex items-center justify-between">
                Notifications
                {unreadCount > 0 && <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary rounded-md text-[8px]">{unreadCount} New</span>}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-white/20 text-[10px] font-black uppercase tracking-widest italic">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer group", 
                        !n.is_read && "bg-brand-primary/5"
                      )}
                    >
                      <p className={cn(
                        "text-sm leading-relaxed transition-colors",
                        !n.is_read ? "text-white font-bold" : "text-white/60 font-medium group-hover:text-white"
                      )}>{n.message}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</span>
                        {!n.is_read && <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />}
                      </div>
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
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/platforms')
      .then(res => res.json())
      .then(data => setPlatforms(data));

    const endpoint = user.role === 'admin' ? '/api/admin/releases' : '/api/artist/releases';
    fetch(endpoint, {
      headers: { 'x-user-id': user.id.toString() }
    })
    .then(res => res.json())
    .then(data => {
      setReleases(data);
      setLoading(false);
    });
  }, [user]);

  const filteredReleases = releases.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  const statusFilters = [
    { id: 'all', label: 'All' },
    ...(user.role === 'artist' ? [{ id: 'draft', label: 'Drafts' }] : []),
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'released', label: 'Released' },
    { id: 'rejected', label: 'Rejected' },
  ];

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

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
        {statusFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              filter === f.id 
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredReleases.length === 0 ? (
        <div className="glass-card p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 mx-auto mb-6">
            <Music className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No releases found</h3>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
            {filter === 'all' ? 'Start by uploading your first track' : `No releases with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredReleases.map(release => (
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
                  <Link 
                    to={`/release/${release.id}`} 
                    className="w-full vibrant-gradient text-white py-4 rounded-2xl font-black text-center text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-primary/20"
                  >
                    View Details
                  </Link>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-black text-white text-2xl mb-1 tracking-tight truncate">{release.title || 'Untitled Draft'}</h3>
                {user.role === 'admin' && <p className="text-[10px] text-brand-primary mb-4 font-black uppercase tracking-widest">{release.artist_name}</p>}
                {release.description && (
                  <p className="text-white/40 text-[11px] font-medium line-clamp-3 mt-4 leading-relaxed italic">
                    "{release.description}"
                  </p>
                )}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                    {release.release_date ? new Date(release.release_date).toLocaleDateString() : 'No date set'}
                  </span>
                  <div className="flex -space-x-3">
                    {JSON.parse(release.stores || '[]').slice(0, 3).map((s: string) => {
                      const platform = platforms.find(p => p.name === s);
                      return (
                        <div key={s} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase backdrop-blur-md shadow-lg overflow-hidden">
                          {platform?.logo_url ? (
                            <img src={platform.logo_url} className="w-full h-full object-contain" alt={s} />
                          ) : platform?.logo_svg ? (
                            <div 
                              className="w-4 h-4 fill-current text-white/40" 
                              dangerouslySetInnerHTML={{ __html: platform.logo_svg }} 
                            />
                          ) : (
                            s.charAt(0)
                          )}
                        </div>
                      );
                    })}
                    {JSON.parse(release.stores || '[]').length > 3 && (
                      <div className="w-8 h-8 rounded-xl bg-brand-primary text-white border border-white/10 flex items-center justify-center text-[10px] font-black uppercase backdrop-blur-md shadow-lg">
                        +{JSON.parse(release.stores || '[]').length - 3}
                      </div>
                    )}
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
    draft: { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: Clock },
    pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
    approved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    released: { color: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30', icon: Music },
    rejected: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: X },
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
