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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          establishment_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          establishment_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          establishment_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          establishment_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          establishment_id: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          establishment_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_invites_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          checkout_time: string
          city: string | null
          created_at: string
          created_by: string
          currency: string
          day_start_time: string
          id: string
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          checkout_time?: string
          city?: string | null
          created_at?: string
          created_by: string
          currency?: string
          day_start_time?: string
          id?: string
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          checkout_time?: string
          city?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          day_start_time?: string
          id?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string
          created_by: string
          document_ref: string | null
          establishment_id: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_ref?: string | null
          establishment_id: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_ref?: string | null
          establishment_id?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kz: number
          created_at: string
          establishment_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_at: string
          received_by: string
          status: Database["public"]["Enums"]["payment_status"]
          stay_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_kz: number
          created_at?: string
          establishment_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          received_by: string
          status?: Database["public"]["Enums"]["payment_status"]
          stay_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_kz?: number
          created_at?: string
          establishment_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          received_by?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stay_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stay_id_establishment_id_fkey"
            columns: ["stay_id", "establishment_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "establishment_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          establishment_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          establishment_id: string
          hourly_block_minutes: number
          hourly_price_kz: number | null
          id: string
          name: string
          nightly_price_kz: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          establishment_id: string
          hourly_block_minutes?: number
          hourly_price_kz?: number | null
          id?: string
          name: string
          nightly_price_kz: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          establishment_id?: string
          hourly_block_minutes?: number
          hourly_price_kz?: number | null
          id?: string
          name?: string
          nightly_price_kz?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          created_at: string
          establishment_id: string
          id: string
          name: string
          room_type_id: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          room_type_id: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          room_type_id?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_establishment_id_fkey"
            columns: ["room_type_id", "establishment_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id", "establishment_id"]
          },
        ]
      }
      stays: {
        Row: {
          actual_checkout_at: string | null
          agreed_amount: number
          cancel_reason: string | null
          closed_by: string | null
          closed_with_debt: boolean
          created_at: string
          created_by: string
          establishment_id: string
          expected_amount: number
          expected_checkout_at: string
          guest_id: string
          id: string
          mode: Database["public"]["Enums"]["stay_mode"]
          room_id: string
          started_at: string
          status: Database["public"]["Enums"]["stay_status"]
          units: number
          updated_at: string
        }
        Insert: {
          actual_checkout_at?: string | null
          agreed_amount: number
          cancel_reason?: string | null
          closed_by?: string | null
          closed_with_debt?: boolean
          created_at?: string
          created_by: string
          establishment_id: string
          expected_amount: number
          expected_checkout_at: string
          guest_id: string
          id?: string
          mode: Database["public"]["Enums"]["stay_mode"]
          room_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["stay_status"]
          units: number
          updated_at?: string
        }
        Update: {
          actual_checkout_at?: string | null
          agreed_amount?: number
          cancel_reason?: string | null
          closed_by?: string | null
          closed_with_debt?: boolean
          created_at?: string
          created_by?: string
          establishment_id?: string
          expected_amount?: number
          expected_checkout_at?: string
          guest_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["stay_mode"]
          room_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["stay_status"]
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stays_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_establishment_id_fkey"
            columns: ["guest_id", "establishment_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id", "establishment_id"]
          },
          {
            foreignKeyName: "stays_room_id_establishment_id_fkey"
            columns: ["room_id", "establishment_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "establishment_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_establishment_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _establishment_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
      op_add_payment: {
        Args: {
          _amount: number
          _method: Database["public"]["Enums"]["payment_method"]
          _note: string
          _stay_id: string
        }
        Returns: string
      }
      op_audit: {
        Args: {
          _action: string
          _entity: string
          _entity_id: string
          _est: string
          _meta: Json
        }
        Returns: undefined
      }
      op_cancel_stay: {
        Args: { _reason: string; _stay_id: string }
        Returns: undefined
      }
      op_create_guest: {
        Args: { _document_ref: string; _full_name: string; _phone: string }
        Returns: string
      }
      op_extend_hourly_stay: {
        Args: {
          _payment_amount: number
          _payment_method: Database["public"]["Enums"]["payment_method"]
          _stay_id: string
          _units: number
        }
        Returns: undefined
      }
      op_finish_stay: {
        Args: { _allow_debt: boolean; _stay_id: string }
        Returns: undefined
      }
      op_manager_establishment: { Args: never; Returns: string }
      op_mark_room_ready: { Args: { _room_id: string }; Returns: undefined }
      op_member_establishment: { Args: never; Returns: string }
      op_set_room_maintenance: {
        Args: { _on: boolean; _room_id: string }
        Returns: undefined
      }
      op_start_stay: {
        Args: {
          _agreed_amount: number
          _guest_id: string
          _mode: Database["public"]["Enums"]["stay_mode"]
          _payment_amount: number
          _payment_method: Database["public"]["Enums"]["payment_method"]
          _room_id: string
          _units: number
        }
        Returns: string
      }
      op_upsert_room: {
        Args: {
          _active: boolean
          _id: string
          _name: string
          _room_type_id: string
        }
        Returns: string
      }
      op_upsert_room_type: {
        Args: {
          _active: boolean
          _description: string
          _hourly_block_minutes: number
          _hourly_price_kz: number
          _id: string
          _name: string
          _nightly_price_kz: number
        }
        Returns: string
      }
      op_void_payment: {
        Args: { _payment_id: string; _reason: string }
        Returns: undefined
      }
      stay_paid_kz: { Args: { _stay_id: string }; Returns: number }
    }
    Enums: {
      app_role: "proprietario" | "administrador" | "recepcionista"
      payment_method: "dinheiro" | "tpa_transferencia" | "outro"
      payment_status: "ativo" | "anulado"
      room_status: "livre" | "ocupado" | "limpeza" | "manutencao"
      stay_mode: "noite" | "horas"
      stay_status: "em_curso" | "concluida" | "cancelada"
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
      app_role: ["proprietario", "administrador", "recepcionista"],
      payment_method: ["dinheiro", "tpa_transferencia", "outro"],
      payment_status: ["ativo", "anulado"],
      room_status: ["livre", "ocupado", "limpeza", "manutencao"],
      stay_mode: ["noite", "horas"],
      stay_status: ["em_curso", "concluida", "cancelada"],
    },
  },
} as const
