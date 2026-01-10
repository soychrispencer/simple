export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      boost_daily_stats: {
        Row: {
          boost_id: string
          clicks: number
          created_at: string | null
          date: string
          id: string
          views: number
        }
        Insert: {
          boost_id: string
          clicks?: number
          created_at?: string | null
          date: string
          id?: string
          views?: number
        }
        Update: {
          boost_id?: string
          clicks?: number
          created_at?: string | null
          date?: string
          id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_daily_stats_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "vehicle_boosts"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number
          id: number
          is_active: boolean
          name: string
          price_clp: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: number
          is_active?: boolean
          name: string
          price_clp?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: number
          is_active?: boolean
          name?: string
          price_clp?: number
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          name: string
          type_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          name: string
          type_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          name?: string
          type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_conditions: {
        Row: {
          additional_conditions: string | null
          allows_tradein: boolean | null
          billable: boolean | null
          bonuses: Json | null
          created_at: string | null
          delivery_immediate: boolean | null
          discounts: Json | null
          documentation_complete: boolean | null
          financing: Json | null
          id: string
          in_consignment: boolean | null
          mode: string
          negotiable: boolean | null
          price: number | null
          updated_at: string | null
          vehicle_id: string
          warranty: string | null
        }
        Insert: {
          additional_conditions?: string | null
          allows_tradein?: boolean | null
          billable?: boolean | null
          bonuses?: Json | null
          created_at?: string | null
          delivery_immediate?: boolean | null
          discounts?: Json | null
          documentation_complete?: boolean | null
          financing?: Json | null
          id?: string
          in_consignment?: boolean | null
          mode: string
          negotiable?: boolean | null
          price?: number | null
          updated_at?: string | null
          vehicle_id: string
          warranty?: string | null
        }
        Update: {
          additional_conditions?: string | null
          allows_tradein?: boolean | null
          billable?: boolean | null
          bonuses?: Json | null
          created_at?: string | null
          delivery_immediate?: boolean | null
          discounts?: Json | null
          documentation_complete?: boolean | null
          financing?: Json | null
          id?: string
          in_consignment?: boolean | null
          mode?: string
          negotiable?: boolean | null
          price?: number | null
          updated_at?: string | null
          vehicle_id?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_conditions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          created_at: string | null
          id: number
          name: string
          region_id: number | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          region_id?: number | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          region_id?: number | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_activity: string | null
          commune_id: number | null
          company_type: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          legal_name: string | null
          phone: string | null
          region_id: number | null
          tax_id: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_activity?: string | null
          commune_id?: number | null
          company_type?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          phone?: string | null
          region_id?: number | null
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_activity?: string | null
          commune_id?: number | null
          company_type?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          phone?: string | null
          region_id?: number | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      features_catalog: {
        Row: {
          active: boolean | null
          allowed_body_types: string[] | null
          allowed_types: string[] | null
          category: string | null
          code: string
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          allowed_body_types?: string[] | null
          allowed_types?: string[] | null
          category?: string | null
          code: string
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          allowed_body_types?: string[] | null
          allowed_types?: string[] | null
          category?: string | null
          code?: string
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          payment_id: string | null
          pdf_url: string | null
          status: string
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          active: boolean
          brand_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          mercadopago_payment_id: string
          mercadopago_preference_id: string | null
          metadata: Json | null
          payment_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          mercadopago_payment_id: string
          mercadopago_preference_id?: string | null
          metadata?: Json | null
          payment_type: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          mercadopago_payment_id?: string
          mercadopago_preference_id?: string | null
          metadata?: Json | null
          payment_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commune_id: number | null
          company_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_company: boolean | null
          last_name: string | null
          phone: string | null
          plan: string | null
          region_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          commune_id?: number | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean | null
          last_name?: string | null
          phone?: string | null
          plan?: string | null
          region_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          avatar_url?: string | null
          commune_id?: number | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean | null
          last_name?: string | null
          phone?: string | null
          plan?: string | null
          region_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string | null
          id: number
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          profile_id: string
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          created_at?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          profile_id: string
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          created_at?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          profile_id?: string
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users_needing_migration"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean | null
          created_at: string | null
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          mercadopago_subscription_id: string | null
          plan_name: string
          plan_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercadopago_subscription_id?: string | null
          plan_name: string
          plan_type: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercadopago_subscription_id?: string | null
          plan_name?: string
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicle_boost_slots: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          position: number
          slot_type: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          position: number
          slot_type: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          position?: number
          slot_type?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_boost_slots_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_boosts: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean
          plan_id: number | null
          start_date: string
          status: Database["public"]["Enums"]["boost_status"]
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          plan_id?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          plan_id?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_boosts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "boost_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_boosts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_equipment: {
        Row: {
          active: boolean
          category: string | null
          created_at: string | null
          id: string
          name: string
          slug: string | null
          sort_order: number
          vehicle_type_id: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
          sort_order?: number
          vehicle_type_id: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number
          vehicle_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_equipment_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_features: {
        Row: {
          added_at: string | null
          feature_code: string
          vehicle_id: string
        }
        Insert: {
          added_at?: string | null
          feature_code: string
          vehicle_id: string
        }
        Update: {
          added_at?: string | null
          feature_code?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_features_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "features_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "vehicle_features_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_media: {
        Row: {
          created_at: string | null
          description: string | null
          file_size: number | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          mime_type: string | null
          position: number | null
          title: string | null
          type: string
          url: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          position?: number | null
          title?: string | null
          type: string
          url: string
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          position?: number | null
          title?: string | null
          type?: string
          url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_metrics: {
        Row: {
          clicks: number | null
          created_at: string | null
          favorites: number | null
          shares: number | null
          updated_at: string | null
          vehicle_id: string
          views: number | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          favorites?: number | null
          shares?: number | null
          updated_at?: string | null
          vehicle_id: string
          views?: number | null
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          favorites?: number | null
          shares?: number | null
          updated_at?: string | null
          vehicle_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_metrics_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_sales: {
        Row: {
          buyer_profile_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          sale_price: number
          seller_profile_id: string
          sold_at: string
          vehicle_id: string
        }
        Insert: {
          buyer_profile_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          sale_price: number
          seller_profile_id: string
          sold_at?: string
          vehicle_id: string
        }
        Update: {
          buyer_profile_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          sale_price?: number
          seller_profile_id?: string
          sold_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_sales_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_sales_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "users_needing_migration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_sales_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_sales_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "users_needing_migration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_selected_equipment: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_selected_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "vehicle_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_selected_equipment_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_subtypes: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          name: string
          slug: string | null
          sort_order: number
          vehicle_type_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
          sort_order?: number
          vehicle_type_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number
          vehicle_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_subtypes_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          allow_exchange: boolean | null
          allow_financing: boolean | null
          auction_end_at: string | null
          auction_start_at: string | null
          auction_start_price: number | null
          brand_id: string | null
          commune_id: number | null
          condition: Database["public"]["Enums"]["vehicle_condition"]
          created_at: string | null
          description: string | null
          featured: boolean
          id: string
          listing_type: string
          mileage: number | null
          model_id: string | null
          owner_id: string
          price: number | null
          published_at: string | null
          region_id: number | null
          rent_daily_price: number | null
          rent_monthly_price: number | null
          rent_security_deposit: number | null
          rent_weekly_price: number | null
          sale_price: number | null
          sold_at: string | null
          specs: Json | null
          status: Database["public"]["Enums"]["vehicle_status"]
          subtype_id: string | null
          title: string
          type_id: string
          updated_at: string | null
          visibility: string
          year: number | null
        }
        Insert: {
          allow_exchange?: boolean | null
          allow_financing?: boolean | null
          auction_end_at?: string | null
          auction_start_at?: string | null
          auction_start_price?: number | null
          brand_id?: string | null
          commune_id?: number | null
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          created_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          listing_type?: string
          mileage?: number | null
          model_id?: string | null
          owner_id: string
          price?: number | null
          published_at?: string | null
          region_id?: number | null
          rent_daily_price?: number | null
          rent_monthly_price?: number | null
          rent_security_deposit?: number | null
          rent_weekly_price?: number | null
          sale_price?: number | null
          sold_at?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          subtype_id?: string | null
          title: string
          type_id: string
          updated_at?: string | null
          visibility?: string
          year?: number | null
        }
        Update: {
          allow_exchange?: boolean | null
          allow_financing?: boolean | null
          auction_end_at?: string | null
          auction_start_at?: string | null
          auction_start_price?: number | null
          brand_id?: string | null
          commune_id?: number | null
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          created_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          listing_type?: string
          mileage?: number | null
          model_id?: string | null
          owner_id?: string
          price?: number | null
          published_at?: string | null
          region_id?: number | null
          rent_daily_price?: number | null
          rent_monthly_price?: number | null
          rent_security_deposit?: number | null
          rent_weekly_price?: number | null
          sale_price?: number | null
          sold_at?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          subtype_id?: string | null
          title?: string
          type_id?: string
          updated_at?: string | null
          visibility?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_needing_migration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_subtype_id_fkey"
            columns: ["subtype_id"]
            isOneToOne: false
            referencedRelation: "vehicle_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      users_needing_migration: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          profile_created_at: string | null
        }
        Insert: {
          email?: string | null
          full_name?: never
          id?: string | null
          profile_created_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: never
          id?: string | null
          profile_created_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_vehicle_metric:
        | {
            Args: { p_metric_type: string; p_vehicle_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_increment?: number
              p_metric: string
              p_vehicle_id: string
            }
            Returns: undefined
          }
      migrate_user_to_auth: {
        Args: { p_email: string; p_password?: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      boost_status: "active" | "expired" | "cancelled"
      vehicle_condition:
        | "unknown"
        | "new"
        | "used"
        | "excellent"
        | "good"
        | "fair"
        | "poor"
        | "damaged"
      vehicle_status: "draft" | "active" | "paused" | "sold" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      boost_status: ["active", "expired", "cancelled"],
      vehicle_condition: [
        "unknown",
        "new",
        "used",
        "excellent",
        "good",
        "fair",
        "poor",
        "damaged",
      ],
      vehicle_status: ["draft", "active", "paused", "sold", "expired"],
    },
  },
} as const


