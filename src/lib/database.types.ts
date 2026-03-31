export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }

      calendar_imports: {
        Row: {
          id: string
          created_at: string | null
          user_id: string
          bucket: string | null
          path: string | null
          original_name: string | null
          mime_type: string | null
          size_bytes: number | null
          status: string | null
          error: string | null
          parsed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          user_id: string
          bucket?: string | null
          path?: string | null
          original_name?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          error?: string | null
          parsed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          user_id?: string
          bucket?: string | null
          path?: string | null
          original_name?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          error?: string | null
          parsed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }

      calendar_items: {
        Row: {
          id: string
          user_id: string
          created_at: string | null
          title: string
          course_code: string | null
          location: string | null
          notes: string | null
          start_at: string
          end_at: string
          rrule: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string | null
          title: string
          course_code?: string | null
          location?: string | null
          notes?: string | null
          start_at: string
          end_at: string
          rrule?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string | null
          title?: string
          course_code?: string | null
          location?: string | null
          notes?: string | null
          start_at?: string
          end_at?: string
          rrule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_items_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }

      event_outbox: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }

      events: {
        Row: {
          category: string | null
          created_at: string | null
          date: string | null
          deadline: string | null
          description: string | null
          event_type: string | null
          id: string
          image_url: string | null
          link: string | null
          location: string | null
          organization: string | null
          prize: string | null
          tags: string[] | null
          time: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date?: string | null
          deadline?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          location?: string | null
          organization?: string | null
          prize?: string | null
          tags?: string[] | null
          time?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date?: string | null
          deadline?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          location?: string | null
          organization?: string | null
          prize?: string | null
          tags?: string[] | null
          time?: string | null
          title?: string
        }
        Relationships: []
      }

      event_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          date: string
          deadline: string | null
          description: string | null
          event_type: string | null
          id: string
          image_url: string | null
          is_verified_org: boolean
          link: string | null
          location: string | null
          organization: string
          prize: string | null
          status: string
          submitted_by: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          date: string
          deadline?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_verified_org?: boolean
          link?: string | null
          location?: string | null
          organization: string
          prize?: string | null
          status?: string
          submitted_by: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_verified_org?: boolean
          link?: string | null
          location?: string | null
          organization?: string
          prize?: string | null
          status?: string
          submitted_by?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }

      interests: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }

      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          event_id: string | null
          id: string
          read: boolean | null
          title: string | null
          type: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          read?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          read?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }

      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarded: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarded?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarded?: boolean | null
        }
        Relationships: []
      }

      saved_events: {
        Row: {
          created_at: string | null
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_event_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }

      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          interest_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_interest_name_fkey"
            columns: ["interest_name"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["name"]
          },
        ]
      }
    }

    Views: {
      [_ in never]: never
    }
    Functions: {
      call_process_outbox: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      vybin_generate_saved_reminders: {
        Args: { p_now?: string; p_window_hours?: number }
        Returns: number
      }
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