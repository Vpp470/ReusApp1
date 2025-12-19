export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  location?: string;
  role?: string; // 'user' or 'admin'
  created_at: string;
  member_code?: string; // Codi únic de membre per QR
}

export interface Establishment {
  id: string;
  name: string;
  commercial_name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  image_url?: string;
  email?: string;
  nif?: string;
  external_id?: string;
  partner_id?: string;
  whatsapp?: string;
  owner_id?: string;
  establishment_type?: string; // Tipus: local_associat, local_no_soci, local_tancat, patrocinador, altres
  collaboration_type?: string; // Per "altres": descripció del tipus de col·laboració
  visible_in_public_list?: boolean; // Si apareix a la llista pública
  social_media?: Record<string, string>;
  google_maps_url?: string;
  video_url?: string;
  video_url_2?: string;
}

export interface Offer {
  id: string;
  establishment_id: string;
  title: string;
  description: string;
  discount?: string;
  valid_from: string;
  valid_until: string;
  image_url?: string;
  terms?: string;
  web_link?: string;
  phone?: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image_url?: string;
  category?: string;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  author?: string;
  image_url?: string;
  category?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCard {
  id: string;
  amount: number;
  code: string;
  user_id: string;
  balance: number;
  status: 'active' | 'used' | 'expired';
  created_at: string;
}

export interface TicketScan {
  id: string;
  user_id: string;
  ticket_code: string;
  establishment_id?: string;
  amount?: number;
  scanned_at: string;
}

export interface Promotion {
  _id: string;
  id?: string;
  title: string;
  description: string;
  image_url: string;
  establishment_id?: string;
  link_url?: string;
  valid_from: string;
  valid_until: string;
  created_by: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  _id: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  permissions?: string[];
  color?: string;
  is_system: boolean;
  created_at: string;
}