import React, { useState, useCallback } from 'react';
import { User, Platform, AppSettings, ThemePreset } from '../types';
import Cropper from 'react-easy-crop';
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Bell, 
  Save, 
  User as UserIcon, 
  Camera, 
  Mail, 
  Lock, 
  Globe, 
  Check,
  CheckCircle2,
  TrendingUp, 
  LogOut,
  Trash2,
  Layout,
  Upload as UploadIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileSettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

export default function ProfileSettings({ user, onUpdate, onLogout }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bankInfo, setBankInfo] = useState(user.bank_info || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(user.whatsapp_enabled === 1);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsapp_number || '');
  const [profileImage, setProfileImage] = useState(user.profile_image || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [newPlatform, setNewPlatform] = useState({ name: '', logo_svg: '', logo_url: '' });
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    app_name: 'SonicStream', 
    app_logo_url: '',
    brand_primary: '#8B5CF6',
    brand_secondary: '#EC4899',
    brand_accent: '#06B6D4',
    app_bg_color: '#030014',
    glass_card_bg: 'rgba(255, 255, 255, 0.05)',
    glass_card_border: 'rgba(255, 255, 255, 0.1)',
    border_radius: '2rem'
  });
  
  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppingType, setCroppingType] = useState<'app_logo' | 'platform_logo'>('app_logo');
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [editingPlatformId, setEditingPlatformId] = useState<number | null>(null);
  const [editingPlatformName, setEditingPlatformName] = useState('');

  React.useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setAppSettings(data);
        if (data.theme_presets) {
          try {
            setPresets(JSON.parse(data.theme_presets));
          } catch (e) {
            setPresets([]);
          }
        }
      });

    if (user.role === 'admin') {
      fetch('/api/admin/platforms')
        .then(res => res.json())
        .then(setPlatforms);
    }
  }, [user.role]);

  const handleAddPlatform = async () => {
    if (!newPlatform.name) return;
    const names = newPlatform.name.split(',').map(n => n.trim()).filter(n => n);
    
    try {
      for (const name of names) {
        await fetch('/api/admin/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newPlatform, name })
        });
      }
      setNewPlatform({ name: '', logo_svg: '', logo_url: '' });
      const updated = await fetch('/api/admin/platforms').then(r => r.json());
      setPlatforms(updated);
      setSuccessMessage(`${names.length} platform(s) added!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const suggestedThemes: ThemePreset[] = [
    {
      id: 'midnight-neon',
      name: 'Midnight Neon',
      brand_primary: '#8B5CF6',
      brand_secondary: '#EC4899',
      brand_accent: '#06B6D4',
      app_bg_color: '#030014',
      glass_card_bg: 'rgba(255, 255, 255, 0.05)',
      glass_card_border: 'rgba(255, 255, 255, 0.1)',
      border_radius: '2rem'
    },
    {
      id: 'emerald-forest',
      name: 'Emerald Forest',
      brand_primary: '#10B981',
      brand_secondary: '#059669',
      brand_accent: '#34D399',
      app_bg_color: '#022c22',
      glass_card_bg: 'rgba(16, 185, 129, 0.05)',
      glass_card_border: 'rgba(16, 185, 129, 0.1)',
      border_radius: '1.5rem'
    },
    {
      id: 'royal-gold',
      name: 'Royal Gold',
      brand_primary: '#F59E0B',
      brand_secondary: '#D97706',
      brand_accent: '#FBBF24',
      app_bg_color: '#1c1917',
      glass_card_bg: 'rgba(245, 158, 11, 0.05)',
      glass_card_border: 'rgba(245, 158, 11, 0.1)',
      border_radius: '1rem'
    }
  ];

  const handleBulkDeletePlatforms = async () => {
    if (selectedPlatforms.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedPlatforms.length} platforms?`)) return;
    
    try {
      // In a real app, we'd have a bulk delete endpoint
      // For now, we'll delete them one by one or filter locally if the API supports it
      for (const id of selectedPlatforms) {
        await fetch(`/api/admin/platforms/${id}`, { method: 'DELETE' });
      }
      setPlatforms(platforms.filter(p => !selectedPlatforms.includes(p.id)));
      setSelectedPlatforms([]);
      setSuccessMessage('Platforms deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePlatformName = async (id: number) => {
    if (!editingPlatformName) return;
    try {
      const res = await fetch(`/api/admin/platforms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingPlatformName })
      });
      if (res.ok) {
        setPlatforms(platforms.map(p => p.id === id ? { ...p, name: editingPlatformName } : p));
        setEditingPlatformId(null);
        setEditingPlatformName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(platforms.map(p => p.id));
    }
  };

  const handleToggleSelectPlatform = (id: number) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter(pId => pId !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleUpdateAppSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings)
      });
      if (res.ok) {
        setSuccessMessage('App settings updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        // Dispatch event to update App.tsx
        window.dispatchEvent(new Event('settingsUpdated'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName) return;
    const newPreset: ThemePreset = {
      id: Date.now().toString(),
      name: newPresetName,
      brand_primary: appSettings.brand_primary,
      brand_secondary: appSettings.brand_secondary,
      brand_accent: appSettings.brand_accent,
      app_bg_color: appSettings.app_bg_color,
      glass_card_bg: appSettings.glass_card_bg,
      glass_card_border: appSettings.glass_card_border,
      border_radius: appSettings.border_radius
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    setNewPresetName('');
    
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_presets: JSON.stringify(updatedPresets) })
      });
      setSuccessMessage('Theme preset saved!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    setAppSettings({
      ...appSettings,
      brand_primary: preset.brand_primary,
      brand_secondary: preset.brand_secondary,
      brand_accent: preset.brand_accent,
      app_bg_color: preset.app_bg_color,
      glass_card_bg: preset.glass_card_bg,
      glass_card_border: preset.glass_card_border,
      border_radius: preset.border_radius
    });
    setSuccessMessage(`Theme "${preset.name}" applied! (Click Save to make it default)`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeletePreset = async (id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_presets: JSON.stringify(updatedPresets) })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (preset: ThemePreset) => {
    const newSettings = {
      ...appSettings,
      brand_primary: preset.brand_primary,
      brand_secondary: preset.brand_secondary,
      brand_accent: preset.brand_accent,
      app_bg_color: preset.app_bg_color,
      glass_card_bg: preset.glass_card_bg,
      glass_card_border: preset.glass_card_border,
      border_radius: preset.border_radius
    };
    setAppSettings(newSettings);
    setLoading(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      setSuccessMessage(`Theme "${preset.name}" set as default!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, 'image/png');
    });
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    try {
      const croppedImageUrl = await getCroppedImg(imageToCrop, croppedAreaPixels);
      
      // Upload the cropped image
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.png', { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (croppingType === 'app_logo') {
        setAppSettings({ ...appSettings, app_logo_url: uploadData.url });
      } else {
        setNewPlatform({ ...newPlatform, logo_url: uploadData.url });
      }
      
      setShowCropper(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'app_logo' | 'platform_logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCroppingType(type);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleTogglePlatform = async (id: number, currentStatus: number) => {
    try {
      const res = await fetch(`/api/admin/platforms/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 })
      });
      if (res.ok) {
        setPlatforms(platforms.map(p => p.id === id ? { ...p, is_active: currentStatus === 1 ? 0 : 1 } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlatform = async (id: number) => {
    if (!confirm('Are you sure you want to delete this platform?')) return;
    try {
      const res = await fetch(`/api/admin/platforms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlatforms(platforms.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setBankInfo(user.bank_info || '');
    setWhatsappEnabled(user.whatsapp_enabled === 1);
    setWhatsappNumber(user.whatsapp_number || '');
    setProfileImage(user.profile_image || '');
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setProfileImage(data.url);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ 
          name, 
          email,
          bank_info: bankInfo,
          whatsapp_enabled: whatsappEnabled,
          whatsapp_number: whatsappNumber,
          profile_image: profileImage
        })
      });

      if (res.ok) {
        onUpdate({ 
          ...user, 
          name, 
          email,
          bank_info: bankInfo,
          whatsapp_enabled: whatsappEnabled ? 1 : 0,
          whatsapp_number: whatsappNumber,
          profile_image: profileImage
        });
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update profile');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
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
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-500/40 flex items-center gap-3"
          >
            <TrendingUp className="w-5 h-5 rotate-45" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card p-6 md:p-12">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-12">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl ring-4 ring-brand-primary/20 group-hover:ring-brand-primary transition-all duration-500">
              <img 
                src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=transparent`} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-brand-primary text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer">
              <Camera className="w-4 h-4 md:w-5 md:h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">{user.name}</h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{user.role} Account</p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-white/60 uppercase tracking-widest">
                ID: #{user.id}
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl mb-12 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'security' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Security
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('general')}
              className={cn(
                "flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'general' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              General
            </button>
          )}
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('platforms')}
              className={cn(
                "flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'platforms' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Platforms
            </button>
          )}
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('theme')}
              className={cn(
                "flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'theme' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Theme
            </button>
          )}
          {user.role === 'artist' && (
            <>
              <button 
                onClick={() => setActiveTab('payout')}
                className={cn(
                  "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'payout' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Payouts
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'notifications' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Alerts
              </button>
            </>
          )}
        </div>

        <div className="space-y-8">
          {activeTab === 'general' && user.role === 'admin' && (
            <div className="space-y-10">
              <div className="glass-card p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <Layout className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">App Customization</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Personalize your platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">App Name</label>
                    <input 
                      type="text" 
                      value={appSettings.app_name} 
                      onChange={e => setAppSettings({ ...appSettings, app_name: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">App Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {appSettings.app_logo_url ? (
                          <img src={appSettings.app_logo_url} className="w-full h-full object-contain" alt="Logo" />
                        ) : (
                          <Layout className="w-6 h-6 text-white/20" />
                        )}
                      </div>
                      <label className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2">
                        <UploadIcon className="w-4 h-4" />
                        Upload Logo
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleLogoUpload(e, 'app_logo')} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-10">
                  <button 
                    onClick={handleUpdateAppSettings}
                    disabled={loading}
                    className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save App Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'platforms' && user.role === 'admin' && (
            <div className="space-y-10">
              <div className="glass-card p-10">
                <h3 className="text-xl font-black text-white mb-6">Add New Platform</h3>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Platform Name</label>
                    <input 
                      type="text" 
                      value={newPlatform.name} 
                      onChange={e => setNewPlatform({ ...newPlatform, name: e.target.value })}
                      placeholder="e.g. Spotify"
                      className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm"
                    />
                  </div>
                  <button 
                    onClick={handleAddPlatform}
                    className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all h-[58px]"
                  >
                    Add Platform
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={handleToggleSelectAll}
                      className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${selectedPlatforms.length === platforms.length && platforms.length > 0 ? 'bg-brand-primary border-brand-primary' : 'border-white/20'}`}>
                        {selectedPlatforms.length === platforms.length && platforms.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      Select All
                    </button>
                    {selectedPlatforms.length > 0 && (
                      <button 
                        onClick={handleBulkDeletePlatforms}
                        className="flex items-center gap-3 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedPlatforms.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{platforms.length} Platforms Total</p>
                </div>

                <div className="space-y-3">
                  {platforms.map(platform => (
                    <div 
                      key={platform.id} 
                      className={`glass-card p-4 group transition-all flex items-center justify-between ${selectedPlatforms.includes(platform.id) ? 'ring-2 ring-brand-primary/50 bg-brand-primary/5' : 'hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-6 flex-1">
                        <button 
                          onClick={() => handleToggleSelectPlatform(platform.id)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${selectedPlatforms.includes(platform.id) ? 'bg-brand-primary border-brand-primary' : 'border-white/20'}`}>
                          {selectedPlatforms.includes(platform.id) && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {platform.logo_url ? (
                            <img src={platform.logo_url} className="w-full h-full object-contain" alt={platform.name} />
                          ) : (
                            <Globe className="w-5 h-5 text-white/20" />
                          )}
                        </div>

                        {editingPlatformId === platform.id ? (
                          <div className="flex items-center gap-2 flex-1 max-w-md">
                            <input 
                              type="text"
                              autoFocus
                              value={editingPlatformName}
                              onChange={e => setEditingPlatformName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleUpdatePlatformName(platform.id)}
                              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-black outline-none focus:border-brand-primary"
                            />
                            <button 
                              onClick={() => handleUpdatePlatformName(platform.id)}
                              className="px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingPlatformId(null)}
                              className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <h4 className="font-black text-white text-sm tracking-tight">{platform.name}</h4>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active</span>
                          <button 
                            onClick={() => handleTogglePlatform(platform.id, platform.is_active)}
                            className={cn(
                              "w-8 h-4 rounded-full relative p-0.5 transition-colors",
                              platform.is_active === 1 ? "bg-emerald-500" : "bg-white/10"
                            )}
                          >
                            <motion.div 
                              animate={{ x: platform.is_active === 1 ? 16 : 0 }}
                              className="w-3 h-3 bg-white rounded-full shadow-lg" 
                            />
                          </button>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingPlatformId(platform.id);
                            setEditingPlatformName(platform.name);
                          }}
                          className="p-2.5 text-white/40 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePlatform(platform.id)}
                          className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'theme' && user.role === 'admin' && (
            <div className="space-y-10">
              <div className="glass-card p-6 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <Layout className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Theme Customization</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Global styling for the platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4 md:col-span-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Theme Mode</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, theme_mode: 'dark' })}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            appSettings.theme_mode === 'dark' ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" : "bg-white/5 text-white/40 hover:text-white"
                          )}
                        >
                          <div className="w-4 h-4 rounded-full bg-slate-900 border border-white/10" />
                          Dark Mode
                        </button>
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, theme_mode: 'light' })}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            appSettings.theme_mode === 'light' ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" : "bg-white/5 text-white/40 hover:text-white"
                          )}
                        >
                          <div className="w-4 h-4 rounded-full bg-white border border-black/10" />
                          Light Mode
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={appSettings.brand_primary} 
                          onChange={e => setAppSettings({ ...appSettings, brand_primary: e.target.value })}
                          className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={appSettings.brand_primary} 
                          onChange={e => setAppSettings({ ...appSettings, brand_primary: e.target.value })}
                          className="flex-1 px-4 py-3 rounded-xl outline-none font-black text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={appSettings.brand_secondary} 
                          onChange={e => setAppSettings({ ...appSettings, brand_secondary: e.target.value })}
                          className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={appSettings.brand_secondary} 
                          onChange={e => setAppSettings({ ...appSettings, brand_secondary: e.target.value })}
                          className="flex-1 px-4 py-3 rounded-xl outline-none font-black text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={appSettings.brand_accent} 
                          onChange={e => setAppSettings({ ...appSettings, brand_accent: e.target.value })}
                          className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={appSettings.brand_accent} 
                          onChange={e => setAppSettings({ ...appSettings, brand_accent: e.target.value })}
                          className="flex-1 px-4 py-3 rounded-xl outline-none font-black text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Background Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={appSettings.app_bg_color} 
                          onChange={e => setAppSettings({ ...appSettings, app_bg_color: e.target.value })}
                          className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={appSettings.app_bg_color} 
                          onChange={e => setAppSettings({ ...appSettings, app_bg_color: e.target.value })}
                          className="flex-1 px-4 py-3 rounded-xl outline-none font-black text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Card Background</label>
                      <input 
                        type="text" 
                        value={appSettings.glass_card_bg} 
                        onChange={e => setAppSettings({ ...appSettings, glass_card_bg: e.target.value })}
                        placeholder="rgba(255, 255, 255, 0.05)"
                        className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Card Border</label>
                      <input 
                        type="text" 
                        value={appSettings.glass_card_border} 
                        onChange={e => setAppSettings({ ...appSettings, glass_card_border: e.target.value })}
                        placeholder="rgba(255, 255, 255, 0.1)"
                        className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Border Radius</label>
                      <input 
                        type="text" 
                        value={appSettings.border_radius} 
                        onChange={e => setAppSettings({ ...appSettings, border_radius: e.target.value })}
                        placeholder="2rem"
                        className="w-full px-6 py-4 rounded-2xl outline-none font-black text-sm"
                      />
                    </div>
                  </div>

                  {/* Live Preview Section */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Live Preview</label>
                    <div 
                      className="p-8 rounded-3xl border transition-all duration-500 overflow-hidden relative group"
                      style={{ 
                        backgroundColor: appSettings.app_bg_color,
                        borderColor: appSettings.glass_card_border,
                      }}
                    >
                      <div 
                        className="p-6 border transition-all duration-500"
                        style={{ 
                          backgroundColor: appSettings.glass_card_bg,
                          borderColor: appSettings.glass_card_border,
                          borderRadius: appSettings.border_radius
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-500"
                            style={{ 
                              background: `linear-gradient(135deg, ${appSettings.brand_primary}, ${appSettings.brand_secondary})`,
                              boxShadow: `0 10px 20px -5px ${appSettings.brand_primary}40`
                            }}
                          >
                            <Layout className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="h-3 w-24 bg-white/20 rounded-full mb-1" />
                            <div className="h-2 w-16 bg-white/10 rounded-full" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-white/5 rounded-full" />
                          <div className="h-2 w-full bg-white/5 rounded-full" />
                          <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                        </div>
                        <button 
                          className="w-full mt-6 py-3 font-black text-[8px] uppercase tracking-widest text-white transition-all duration-500"
                          style={{ 
                            background: `linear-gradient(135deg, ${appSettings.brand_primary}, ${appSettings.brand_secondary})`,
                            borderRadius: `calc(${appSettings.border_radius} / 2)`,
                            boxShadow: `0 10px 20px -5px ${appSettings.brand_primary}40`
                          }}
                        >
                          Sample Button
                        </button>
                      </div>
                      
                      {/* Accent element preview */}
                      <div 
                        className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-20 transition-all duration-500"
                        style={{ backgroundColor: appSettings.brand_accent }}
                      />
                    </div>
                    <p className="text-[9px] text-white/20 font-medium leading-relaxed px-2">
                      This is a real-time preview of how your theme choices will affect cards, buttons, and backgrounds across the platform.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-10">
                  <button 
                    onClick={handleUpdateAppSettings}
                    disabled={loading}
                    className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Theme Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl outline-none font-black text-sm"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Biography</label>
                <textarea 
                  className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm min-h-[150px]"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 shadow-lg">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">Change Password</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Last changed 3 months ago</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-6 py-3 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Update
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payout' && user.role === 'artist' && (
            <div className="space-y-8">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Bank Information</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Update your payout details</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Bank Account Info</label>
                    <textarea 
                      rows={4}
                      value={bankInfo}
                      onChange={(e) => setBankInfo(e.target.value)}
                      placeholder="IBAN, SWIFT, or Account Number"
                      className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Payout Details'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && user.role === 'artist' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group transition-all opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">WhatsApp Notifications</p>
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-0.5">Coming Soon</p>
                  </div>
                </div>
                <div 
                  className="w-14 h-8 rounded-full relative p-1 bg-white/10"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full shadow-lg" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="vibrant-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={onLogout}
          className="md:hidden flex items-center gap-2 text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
        <button className="flex items-center gap-2 text-rose-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-300 transition-colors">
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Security Modals */}
      <AnimatePresence>
        {showCropper && imageToCrop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowCropper(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-2xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-black text-white">Crop Image</h3>
                <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <Trash2 className="w-6 h-6 text-white/40" />
                </button>
              </div>
              <div className="relative h-96 bg-black">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowCropper(false)}
                    className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApplyCrop}
                    className="flex-1 vibrant-gradient text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Apply Crop
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-10 relative z-10"
            >
              <h3 className="text-2xl font-black text-white mb-6">Change Password</h3>
              <div className="space-y-4">
                <input type="password" placeholder="Current Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <input type="password" placeholder="New Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <input type="password" placeholder="Confirm New Password" className="w-full px-6 py-4 rounded-xl outline-none font-bold text-sm" />
                <button onClick={() => setShowPasswordModal(false)} className="w-full vibrant-gradient text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest mt-4">Update Password</button>
              </div>
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
