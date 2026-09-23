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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          apply_deadline: string
          capacity: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          stardust_reward: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          apply_deadline: string
          capacity?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          stardust_reward?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          apply_deadline?: string
          capacity?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          stardust_reward?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_signups: {
        Row: {
          activity_id: string
          attended: boolean
          attended_at: string | null
          created_at: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          activity_id: string
          attended?: boolean
          attended_at?: string | null
          created_at?: string
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          activity_id?: string
          attended?: boolean
          attended_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_signups_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      celestial_objects: {
        Row: {
          best_season: string | null
          created_at: string
          decl: string | null
          description: string | null
          direction: string | null
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["celestial_kind"]
          kind_code: string
          latin_name: string | null
          magnitude: string | null
          name: string
          ra: string | null
          scale: string
          subtype: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          best_season?: string | null
          created_at?: string
          decl?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          image_url?: string | null
          kind: Database["public"]["Enums"]["celestial_kind"]
          kind_code?: string
          latin_name?: string | null
          magnitude?: string | null
          name: string
          ra?: string | null
          scale?: string
          subtype?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          best_season?: string | null
          created_at?: string
          decl?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["celestial_kind"]
          kind_code?: string
          latin_name?: string | null
          magnitude?: string | null
          name?: string
          ra?: string | null
          scale?: string
          subtype?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      equipment_rentals: {
        Row: {
          created_at: string
          end_date: string
          equipment_id: string
          id: string
          purpose: string
          return_note: string | null
          returned_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["rental_status"]
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          end_date: string
          equipment_id: string
          id?: string
          purpose: string
          return_note?: string | null
          returned_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["rental_status"]
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          end_date?: string
          equipment_id?: string
          id?: string
          purpose?: string
          return_note?: string | null
          returned_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["rental_status"]
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          shot_at: string | null
          storage_path: string
          title: string
          user_id: string
          user_name: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          shot_at?: string | null
          storage_path: string
          title: string
          user_id: string
          user_name: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          shot_at?: string | null
          storage_path?: string
          title?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          author_name: string
          board: Database["public"]["Enums"]["board_kind"]
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          author_name: string
          board: Database["public"]["Enums"]["board_kind"]
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          author_name?: string
          board?: Database["public"]["Enums"]["board_kind"]
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quest_claims: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_claims_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          goal: number
          id: string
          metric: string
          reward: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          goal: number
          id?: string
          metric: string
          reward?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          goal?: number
          id?: string
          metric?: string
          reward?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_reservations: {
        Row: {
          created_at: string
          ends_at: string
          headcount: number
          id: string
          purpose: string
          starts_at: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          headcount?: number
          id?: string
          purpose: string
          starts_at: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          headcount?: number
          id?: string
          purpose?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      roster: {
        Row: {
          cohort: string | null
          created_at: string
          department: string | null
          full_name: string
          id: string
          note: string | null
          phone: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          cohort?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          id?: string
          note?: string | null
          phone?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          cohort?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          note?: string | null
          phone?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stardust_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stardust_ledger: {
        Row: {
          activity_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stardust_ledger_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_celestial_objects: {
        Row: {
          id: string
          object_id: string
          obtained_at: string
          rarity: string
          user_id: string
        }
        Insert: {
          id?: string
          object_id: string
          obtained_at?: string
          rarity?: string
          user_id: string
        }
        Update: {
          id?: string
          object_id?: string
          obtained_at?: string
          rarity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_celestial_objects_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "celestial_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activity_signup_counts: {
        Args: never
        Returns: {
          activity_id: string
          signup_count: number
        }[]
      }
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      claim_membership: {
        Args: never
        Returns: {
          avatar_path: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_quest: { Args: { _quest_id: string }; Returns: number }
      draw_celestial: {
        Args: never
        Returns: {
          balance: number
          kind_code: string
          latin_name: string
          name: string
          object_id: string
          rarity: string
          scale: string
          subtype: string
          summary: string
        }[]
      }
      grant_stardust: {
        Args: {
          _activity_id?: string
          _amount: number
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { _post_id: string }; Returns: undefined }
      is_officer: { Args: { _user_id: string }; Returns: boolean }
      is_verified_member: { Args: { _user_id: string }; Returns: boolean }
      list_members: {
        Args: never
        Returns: {
          avatar_path: string
          cohort: string
          department: string
          full_name: string
          id: string
        }[]
      }
      list_room_slots: {
        Args: { _from: string; _to: string }
        Returns: {
          can_manage: boolean
          ends_at: string
          headcount: number
          id: string
          is_mine: boolean
          purpose: string
          starts_at: string
          user_name: string
        }[]
      }
      my_quests: {
        Args: never
        Returns: {
          claimed: boolean
          description: string
          goal: number
          id: string
          metric: string
          progress: number
          reward: number
          title: string
        }[]
      }
      norm_text: { Args: { _v: string }; Returns: string }
      quest_metric_progress: {
        Args: { _metric: string; _user_id: string }
        Returns: number
      }
      request_rental_return: {
        Args: { _note?: string; _rental_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "officer" | "manager"
      board_kind: "notice" | "free"
      celestial_kind: "constellation" | "star" | "nebula" | "cluster"
      equipment_status: "available" | "rented" | "maintenance" | "broken"
      member_status: "verified" | "pending" | "rejected"
      rental_status:
        | "pending"
        | "approved"
        | "return_requested"
        | "rejected"
        | "returned"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "member", "officer", "manager"],
      board_kind: ["notice", "free"],
      celestial_kind: ["constellation", "star", "nebula", "cluster"],
      equipment_status: ["available", "rented", "maintenance", "broken"],
      member_status: ["verified", "pending", "rejected"],
      rental_status: [
        "pending",
        "approved",
        "return_requested",
        "rejected",
        "returned",
        "cancelled",
      ],
    },
  },
} as const
