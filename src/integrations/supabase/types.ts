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
      escrow_balances: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          total_invested: number | null
          total_returns: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          total_invested?: number | null
          total_returns?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          total_invested?: number | null
          total_returns?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string | null
          id: string
          investment_date: string | null
          investment_status:
            | Database["public"]["Enums"]["investment_status"]
            | null
          price_per_share: number
          property_id: string | null
          shares_owned: number
          total_investment: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          investment_date?: string | null
          investment_status?:
            | Database["public"]["Enums"]["investment_status"]
            | null
          price_per_share: number
          property_id?: string | null
          shares_owned: number
          total_investment: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          investment_date?: string | null
          investment_status?:
            | Database["public"]["Enums"]["investment_status"]
            | null
          price_per_share?: number
          property_id?: string | null
          shares_owned?: number
          total_investment?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: Database["public"]["Enums"]["kyc_status"] | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["kyc_status"] | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["kyc_status"] | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          available_shares: number
          city: string
          country: string
          created_at: string | null
          created_by: string | null
          description: string | null
          documents: string[] | null
          expected_annual_return: number | null
          featured: boolean | null
          funded_amount: number | null
          funding_goal: number
          id: string
          images: string[] | null
          investment_end_date: string | null
          investment_start_date: string | null
          maximum_investment: number | null
          minimum_investment: number | null
          property_status: Database["public"]["Enums"]["property_status"] | null
          property_type: string | null
          share_price: number
          shares_sellable: boolean | null
          actual_roi_percentage: number | null
          title: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          address: string
          available_shares: number
          city: string
          country: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: string[] | null
          expected_annual_return?: number | null
          featured?: boolean | null
          funded_amount?: number | null
          funding_goal: number
          id?: string
          images?: string[] | null
          investment_end_date?: string | null
          investment_start_date?: string | null
          maximum_investment?: number | null
          minimum_investment?: number | null
          property_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          property_type?: string | null
          share_price: number
          shares_sellable?: boolean | null
          actual_roi_percentage?: number | null
          title: string
          total_value: number
          updated_at?: string | null
        }
        Update: {
          address?: string
          available_shares?: number
          city?: string
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: string[] | null
          expected_annual_return?: number | null
          featured?: boolean | null
          funded_amount?: number | null
          funding_goal?: number
          id?: string
          images?: string[] | null
          investment_end_date?: string | null
          investment_start_date?: string | null
          maximum_investment?: number | null
          minimum_investment?: number | null
          property_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          property_type?: string | null
          share_price?: number
          shares_sellable?: boolean | null
          actual_roi_percentage?: number | null
          title?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          property_id: string | null
          reference_id: string | null
          status: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          kyc_approved_at: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          kyc_submitted_at: string | null
          phone: string | null
          subscription_active: boolean | null
          subscription_ends_at: string | null
          tier: Database["public"]["Enums"]["user_tier"] | null
          tier_override_by_admin: boolean | null
          tier_override_at: string | null
          tier_override_by: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          kyc_approved_at?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          kyc_submitted_at?: string | null
          phone?: string | null
          subscription_active?: boolean | null
          subscription_ends_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
          tier_override_by_admin?: boolean | null
          tier_override_at?: string | null
          tier_override_by?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          kyc_approved_at?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          kyc_submitted_at?: string | null
          phone?: string | null
          subscription_active?: boolean | null
          subscription_ends_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
          tier_override_by_admin?: boolean | null
          tier_override_at?: string | null
          tier_override_by?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_start: string | null
          session_end: string | null
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          country: string | null
          city: string | null
          referrer: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          session_duration: number | null
          pages_visited: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_start?: string | null
          session_end?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          city?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          session_duration?: number | null
          pages_visited?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_start?: string | null
          session_end?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          city?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          session_duration?: number | null
          pages_visited?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          event_type: string
          event_category: string
          event_action: string
          event_label: string | null
          page_url: string | null
          page_title: string | null
          property_id: string | null
          investment_amount: number | null
          metadata: Json | null
          timestamp: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          event_type: string
          event_category: string
          event_action: string
          event_label?: string | null
          page_url?: string | null
          page_title?: string | null
          property_id?: string | null
          investment_amount?: number | null
          metadata?: Json | null
          timestamp?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          event_type?: string
          event_category?: string
          event_action?: string
          event_label?: string | null
          page_url?: string | null
          page_title?: string | null
          property_id?: string | null
          investment_amount?: number | null
          metadata?: Json | null
          timestamp?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          id: string
          user_id: string | null
          date: string | null
          total_sessions: number | null
          total_page_views: number | null
          avg_session_duration: number | null
          properties_viewed: number | null
          properties_saved: number | null
          properties_removed: number | null
          notes_added: number | null
          investment_flows_started: number | null
          investment_flows_completed: number | null
          total_investment_amount: number | null
          avg_investment_amount: number | null
          kyc_progress_updates: number | null
          support_interactions: number | null
          documents_uploaded: number | null
          engagement_score: number | null
          intent_score: number | null
          risk_score: number | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          date?: string | null
          total_sessions?: number | null
          total_page_views?: number | null
          avg_session_duration?: number | null
          properties_viewed?: number | null
          properties_saved?: number | null
          properties_removed?: number | null
          notes_added?: number | null
          investment_flows_started?: number | null
          investment_flows_completed?: number | null
          total_investment_amount?: number | null
          avg_investment_amount?: number | null
          kyc_progress_updates?: number | null
          support_interactions?: number | null
          documents_uploaded?: number | null
          engagement_score?: number | null
          intent_score?: number | null
          risk_score?: number | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          date?: string | null
          total_sessions?: number | null
          total_page_views?: number | null
          avg_session_duration?: number | null
          properties_viewed?: number | null
          properties_saved?: number | null
          properties_removed?: number | null
          notes_added?: number | null
          investment_flows_started?: number | null
          investment_flows_completed?: number | null
          total_investment_amount?: number | null
          avg_investment_amount?: number | null
          kyc_progress_updates?: number | null
          support_interactions?: number | null
          documents_uploaded?: number | null
          engagement_score?: number | null
          intent_score?: number | null
          risk_score?: number | null
          updated_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      property_engagements: {
        Row: {
          id: string
          user_id: string | null
          property_id: string | null
          session_id: string | null
          first_viewed: string | null
          last_viewed: string | null
          total_views: number | null
          total_time_spent: number | null
          sections_viewed: string[] | null
          documents_downloaded: string[] | null
          images_viewed: number | null
          watchlist_added_at: string | null
          watchlist_removed_at: string | null
          notes_count: number | null
          investment_started_at: string | null
          investment_completed_at: string | null
          investment_amount: number | null
          sharing_events: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          property_id?: string | null
          session_id?: string | null
          first_viewed?: string | null
          last_viewed?: string | null
          total_views?: number | null
          total_time_spent?: number | null
          sections_viewed?: string[] | null
          documents_downloaded?: string[] | null
          images_viewed?: number | null
          watchlist_added_at?: string | null
          watchlist_removed_at?: string | null
          notes_count?: number | null
          investment_started_at?: string | null
          investment_completed_at?: string | null
          investment_amount?: number | null
          sharing_events?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          property_id?: string | null
          session_id?: string | null
          first_viewed?: string | null
          last_viewed?: string | null
          total_views?: number | null
          total_time_spent?: number | null
          sections_viewed?: string[] | null
          documents_downloaded?: string[] | null
          images_viewed?: number | null
          watchlist_added_at?: string | null
          watchlist_removed_at?: string | null
          notes_count?: number | null
          investment_started_at?: string | null
          investment_completed_at?: string | null
          investment_amount?: number | null
          sharing_events?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_insights: {
        Row: {
          id: string
          user_id: string | null
          lead_score: number | null
          lead_temperature: string | null
          preferred_investment_range: string | null
          favorite_property_types: string[] | null
          favorite_locations: string[] | null
          investment_timeline: string | null
          risk_tolerance: string | null
          engagement_frequency: string | null
          last_activity: string | null
          next_follow_up_date: string | null
          sales_notes: string | null
          assigned_sales_rep: string | null
          lead_source: string | null
          is_research_heavy: boolean | null
          is_price_sensitive: boolean | null
          is_location_focused: boolean | null
          prefers_new_properties: boolean | null
          likely_to_invest_soon: boolean | null
          needs_nurturing: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          preferred_investment_range?: string | null
          favorite_property_types?: string[] | null
          favorite_locations?: string[] | null
          investment_timeline?: string | null
          risk_tolerance?: string | null
          engagement_frequency?: string | null
          last_activity?: string | null
          next_follow_up_date?: string | null
          sales_notes?: string | null
          assigned_sales_rep?: string | null
          lead_source?: string | null
          is_research_heavy?: boolean | null
          is_price_sensitive?: boolean | null
          is_location_focused?: boolean | null
          prefers_new_properties?: boolean | null
          likely_to_invest_soon?: boolean | null
          needs_nurturing?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          preferred_investment_range?: string | null
          favorite_property_types?: string[] | null
          favorite_locations?: string[] | null
          investment_timeline?: string | null
          risk_tolerance?: string | null
          engagement_frequency?: string | null
          last_activity?: string | null
          next_follow_up_date?: string | null
          sales_notes?: string | null
          assigned_sales_rep?: string | null
          lead_source?: string | null
          is_research_heavy?: boolean | null
          is_price_sensitive?: boolean | null
          is_location_focused?: boolean | null
          prefers_new_properties?: boolean | null
          likely_to_invest_soon?: boolean | null
          needs_nurturing?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_journey_stages: {
        Row: {
          id: string
          user_id: string | null
          stage: string
          entered_at: string | null
          exited_at: string | null
          duration_in_stage: number | null
          stage_actions: string[] | null
          conversion_trigger: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          stage: string
          entered_at?: string | null
          exited_at?: string | null
          duration_in_stage?: number | null
          stage_actions?: string[] | null
          conversion_trigger?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          stage?: string
          entered_at?: string | null
          exited_at?: string | null
          duration_in_stage?: number | null
          stage_actions?: string[] | null
          conversion_trigger?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      share_sell_requests: {
        Row: {
          id: string
          seller_id: string
          property_id: string
          shares_to_sell: number
          remaining_shares: number | null
          price_per_share: number
          total_amount: number
          status: string
          expires_at: string
          sold_at: string | null
          buyer_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          property_id: string
          shares_to_sell: number
          remaining_shares?: number | null
          price_per_share: number
          total_amount: number
          status?: string
          expires_at: string
          sold_at?: string | null
          buyer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          property_id?: string
          shares_to_sell?: number
          remaining_shares?: number | null
          price_per_share?: number
          total_amount?: number
          status?: string
          expires_at?: string
          sold_at?: string | null
          buyer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_sell_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_sell_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      share_holds: {
        Row: {
          id: string
          sell_request_id: string
          buyer_id: string
          shares_held: number
          hold_expires_at: string
          buyer_confirmed: boolean
          seller_confirmed: boolean
          buyer_confirmed_at: string | null
          seller_confirmed_at: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sell_request_id: string
          buyer_id: string
          shares_held: number
          hold_expires_at: string
          buyer_confirmed?: boolean
          seller_confirmed?: boolean
          buyer_confirmed_at?: string | null
          seller_confirmed_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sell_request_id?: string
          buyer_id?: string
          shares_held?: number
          hold_expires_at?: string
          buyer_confirmed?: boolean
          seller_confirmed?: boolean
          buyer_confirmed_at?: string | null
          seller_confirmed_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_holds_sell_request_id_fkey"
            columns: ["sell_request_id"]
            isOneToOne: false
            referencedRelation: "share_sell_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_holds_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          }
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
      document_type:
        | "passport"
        | "drivers_license"
        | "id_card"
        | "proof_of_address"
        | "bank_statement"
        | "other"
      investment_status: "pending" | "confirmed" | "cancelled"
      kyc_status: "pending" | "under_review" | "approved" | "rejected"
      property_status: "upcoming" | "open" | "funded" | "closed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "investment"
        | "share_sale"
        | "share_purchase"
        | "fee"
      user_tier:
        | "explorer"
        | "waitlist_player"
        | "small_investor"
        | "large_investor"
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
      document_type: [
        "passport",
        "drivers_license",
        "id_card",
        "proof_of_address",
        "bank_statement",
        "other",
      ],
      investment_status: ["pending", "confirmed", "cancelled"],
      kyc_status: ["pending", "under_review", "approved", "rejected"],
      property_status: ["upcoming", "open", "funded", "closed"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "investment",
        "share_sale",
        "share_purchase",
        "fee",
      ],
      user_tier: [
        "explorer",
        "waitlist_player",
        "small_investor",
        "large_investor",
      ],
    },
  },
} as const
