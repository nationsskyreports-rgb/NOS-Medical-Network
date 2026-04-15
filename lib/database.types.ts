export type CardType = 'orange' | 'gold' | 'silver' | 'green';

export type ProviderTypeKey =
  | 'hospital'
  | 'pharmacy'
  | 'radiology'
  | 'laboratory'
  | 'physician'
  | 'dentist'
  | 'optics'
  | 'physiotherapy'
  | 'clinic'
  | 'other';

export interface Provider {
  id: string;
  name_en: string;
  name_ar: string;
  type_en: string;
  type_ar: string;
  type_key: ProviderTypeKey;
  speciality_en: string;
  speciality_ar: string;
  address_en: string;
  address_ar: string;
  city_en: string;
  city_ar: string;
  governorate_en: string;
  governorate_ar: string;
  card_type: CardType;
  phone1: string;
  phone2: string;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NearbyProvider extends Provider {
  distance_meters: number;
}

export interface ProviderFilters {
  cardType?: CardType | '';
  typeKey?: ProviderTypeKey | '';
  governorate?: string;
  search?: string;
}

export type Database = {
  public: {
    Tables: {
      providers: {
        Row: Provider;
        Insert: Omit<Provider, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>;
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
        };
        Update: never;
      };
    };
    Functions: {
      get_nearby_providers: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_meters?: number;
          filter_card_type?: string | null;
          filter_type_key?: string | null;
          filter_governorate?: string | null;
          result_limit?: number;
        };
        Returns: NearbyProvider[];
      };
    };
  };
};
