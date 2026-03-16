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
  is_existing_user?: number;
  spotify_profile_link?: string;
  distributed_before?: number;
  upcoming_audio_url?: string;
  legal_name?: string;
  legal_address?: string;
  country?: string;
  phone_number?: string;
  aadhaar_number?: string;
  id_card_url?: string;
  agreement_status?: string;
}

export type ReleaseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'streamed' | 'action_required';

export interface Release {
  id: number;
  artist_id: number;
  title: string;
  title_version?: string;
  genre?: string;
  metadata_language?: string;
  is_previously_released?: number;
  original_release_date?: string;
  price_code_general?: string;
  price_code_itunes?: string;
  artwork_url: string;
  status: ReleaseStatus;
  created_at: string;
  release_date: string;
  stores: string; // JSON string
  territories?: string; // JSON string
  territory_exclusion?: number;
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
  title_version?: string;
  metadata_language?: string;
  audio_language?: string;
  origin?: string;
  price_code?: string;
  price_code_itunes?: string;
  is_explicit?: number;
  file_url: string;
  type: string;
  artist_name: string;
  composer: string;
  contributors?: string; // JSON string of {name, role}[]
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
  link?: string;
  is_read: number;
  created_at: string;
}

export interface Platform {
  id: number;
  name: string;
  logo_svg: string;
  logo_url?: string;
  is_active: number;
}

export interface ThemePreset {
  id: string;
  name: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  app_bg_color: string;
  glass_card_bg: string;
  glass_card_border: string;
  border_radius: string;
}

export interface AppSettings {
  app_name: string;
  app_logo_url: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  app_bg_color: string;
  glass_card_bg: string;
  glass_card_border: string;
  border_radius: string;
  theme_presets?: string; // JSON string of ThemePreset[]
  theme_mode?: 'light' | 'dark';
}

export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  status: 'open' | 'closed';
  is_admin_read?: number;
  is_user_read?: number;
  created_at: string;
  updated_at: string;
  artist_name?: string;
  artist_email?: string;
  last_message?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  message: string;
  file_url?: string;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}
