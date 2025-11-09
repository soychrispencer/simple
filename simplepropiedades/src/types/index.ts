export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          phone: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          created_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          user_id: string
          agency_id: string | null
          title: string
          description: string | null
          type: string
          operation: string
          region_id: number | null
          commune_id: number | null
          price: number
          surface: number | null
          bedrooms: number | null
          bathrooms: number | null
          parking: number | null
          furnished: boolean | null
          year_built: number | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agency_id?: string | null
          title: string
          description?: string | null
          type: string
          operation: string
          region_id?: number | null
          commune_id?: number | null
          price: number
          surface?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          parking?: number | null
          furnished?: boolean | null
          year_built?: number | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agency_id?: string | null
          title?: string
          description?: string | null
          type?: string
          operation?: string
          region_id?: number | null
          commune_id?: number | null
          price?: number
          surface?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          parking?: number | null
          furnished?: boolean | null
          year_built?: number | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      property_images: {
        Row: {
          id: string
          property_id: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          url?: string
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          property_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          created_at?: string
        }
      }
      // Asumiendo que regions y communes existen de simpleautos
      regions: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      communes: {
        Row: {
          id: number
          name: string
          region_id: number
        }
        Insert: {
          id?: number
          name: string
          region_id: number
        }
        Update: {
          id?: number
          name?: string
          region_id?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Property = Database['public']['Tables']['properties']['Row']
export type Agency = Database['public']['Tables']['agencies']['Row']
export type PropertyImage = Database['public']['Tables']['property_images']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type Region = Database['public']['Tables']['regions']['Row']
export type Commune = Database['public']['Tables']['communes']['Row']