export type UserRole = 'artist' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  bank_info?: string;
  balance: number;
  whatsapp_enabled?: number;
  whatsapp_number?: string;
  profile_image?: string;
  status?: string;
}

export type ReleaseStatus = 'pending' | 'approved' | 'rejected' | 'action_required' | 'streamed';

export interface Release {
  id: number;
  artist_id: number;
  title: string;
  artwork_url: string;
  status: ReleaseStatus;
  created_at: string;
  release_date: string;
  stores: string; // JSON string
  artist_name?: string;
  artist_email?: string;
  description?: string;
  platform_links?: string; // JSON string
  admin_remarks?: string;
}

export interface Track {
  id: number;
  release_id: number;
  title: string;
  file_url: string;
  type: string;
  artist_name: string;
  composer: string;
}

export interface Revenue {
  id: number;
  artist_id: number;
  release_id: number;
  amount: number;
  platform: string;
  date: string;
}

export interface Withdrawal {
  id: number;
  artist_id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payout_screenshot?: string;
  created_at: string;
  artist_name?: string;
  bank_info?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}
