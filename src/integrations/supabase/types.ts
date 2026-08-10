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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ad_account_tokens: {
        Row: {
          ad_account_id: string
          oauth_token_encrypted: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          oauth_token_encrypted: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          oauth_token_encrypted?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_account_tokens_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: true
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_accounts: {
        Row: {
          account_name: string | null
          created_at: string | null
          external_account_id: string | null
          external_page_id: string | null
          id: string
          page_name: string | null
          platform: string
          scopes: string[] | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          page_name?: string | null
          platform?: string
          scopes?: string[] | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          page_name?: string | null
          platform?: string
          scopes?: string[] | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_variants: {
        Row: {
          angle_name: string
          body: string | null
          enabled: boolean
          headline: string
          id: string
          image_url: string | null
          test_id: string
        }
        Insert: {
          angle_name: string
          body?: string | null
          enabled?: boolean
          headline: string
          id?: string
          image_url?: string | null
          test_id: string
        }
        Update: {
          angle_name?: string
          body?: string | null
          enabled?: boolean
          headline?: string
          id?: string
          image_url?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_actions: {
        Row: {
          action_type: string
          executed_at: string
          human_log: string
          id: string
          params: Json | null
          test_id: string
        }
        Insert: {
          action_type: string
          executed_at?: string
          human_log: string
          id?: string
          params?: Json | null
          test_id: string
        }
        Update: {
          action_type?: string
          executed_at?: string
          human_log?: string
          id?: string
          params?: Json | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_actions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_account_id: string
          budget_split_pct: number
          created_at: string | null
          external_adset_ids: Json | null
          external_campaign_id: string | null
          id: string
          platform: string
          status: string | null
          test_id: string
        }
        Insert: {
          ad_account_id: string
          budget_split_pct?: number
          created_at?: string | null
          external_adset_ids?: Json | null
          external_campaign_id?: string | null
          id?: string
          platform?: string
          status?: string | null
          test_id: string
        }
        Update: {
          ad_account_id?: string
          budget_split_pct?: number
          created_at?: string | null
          external_adset_ids?: Json | null
          external_campaign_id?: string | null
          id?: string
          platform?: string
          status?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          project_id: string
          published: boolean | null
          slug: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          project_id: string
          published?: boolean | null
          slug: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          project_id?: string
          published?: boolean | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_snapshots: {
        Row: {
          clicks: number
          external_ref: string
          fetched_at: string
          id: string
          impressions: number
          level: string
          spend_cents: number
          stat_date: string
          test_id: string
          variant_id: string | null
        }
        Insert: {
          clicks?: number
          external_ref: string
          fetched_at?: string
          id?: string
          impressions?: number
          level: string
          spend_cents?: number
          stat_date: string
          test_id: string
          variant_id?: string | null
        }
        Update: {
          clicks?: number
          external_ref?: string
          fetched_at?: string
          id?: string
          impressions?: number
          level?: string
          spend_cents?: number
          stat_date?: string
          test_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_snapshots_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ad_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string | null
          id: string
          landing_page_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          landing_page_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          landing_page_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          app_url: string | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          positioning: Json | null
          user_id: string
        }
        Insert: {
          app_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          positioning?: Json | null
          user_id: string
        }
        Update: {
          app_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          positioning?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          landing_page_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          landing_page_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          landing_page_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signups_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          budget_cap_cents: number
          created_at: string | null
          currency: string
          ends_at: string | null
          id: string
          plan: Json | null
          project_id: string
          starts_at: string | null
          status: string
          target_cpa_cents: number | null
        }
        Insert: {
          budget_cap_cents: number
          created_at?: string | null
          currency?: string
          ends_at?: string | null
          id?: string
          plan?: Json | null
          project_id: string
          starts_at?: string | null
          status?: string
          target_cpa_cents?: number | null
        }
        Update: {
          budget_cap_cents?: number
          created_at?: string | null
          currency?: string
          ends_at?: string | null
          id?: string
          plan?: Json | null
          project_id?: string
          starts_at?: string | null
          status?: string
          target_cpa_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
