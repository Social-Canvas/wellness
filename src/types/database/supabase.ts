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
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          created_at: string
          id: string
          issued_at: string
          pdf_storage_path: string | null
          updated_at: string
          user_id: string
          verification_token: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          created_at?: string
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          updated_at?: string
          user_id: string
          verification_token: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          updated_at?: string
          user_id?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_access: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_access_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          completed_lessons: number
          course_id: string
          created_at: string
          id: string
          progress_percentage: number
          total_lessons: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_lessons?: number
          course_id: string
          created_at?: string
          id?: string
          progress_percentage?: number
          total_lessons?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_lessons?: number
          course_id?: string
          created_at?: string
          id?: string
          progress_percentage?: number
          total_lessons?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          certificate_enabled: boolean
          completion_threshold: number
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["publish_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          certificate_enabled?: boolean
          completion_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          certificate_enabled?: boolean
          completion_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          job_type: Database["public"]["Enums"]["integration_job_type"]
          last_error: string | null
          max_attempts: number
          next_run_at: string
          payload: Json
          status: Database["public"]["Enums"]["integration_job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          job_type: Database["public"]["Enums"]["integration_job_type"]
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["integration_job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          job_type?: Database["public"]["Enums"]["integration_job_type"]
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["integration_job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          ghl_contact_id: string | null
          ghl_sync_status: Database["public"]["Enums"]["ghl_sync_status"]
          id: string
          lead_type: Database["public"]["Enums"]["lead_type"]
          message: string | null
          metadata: Json
          name: string
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          ghl_contact_id?: string | null
          ghl_sync_status?: Database["public"]["Enums"]["ghl_sync_status"]
          id?: string
          lead_type: Database["public"]["Enums"]["lead_type"]
          message?: string | null
          metadata?: Json
          name: string
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          ghl_contact_id?: string | null
          ghl_sync_status?: Database["public"]["Enums"]["ghl_sync_status"]
          id?: string
          lead_type?: Database["public"]["Enums"]["lead_type"]
          message?: string | null
          metadata?: Json
          name?: string
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          module_id: string
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          module_id: string
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          module_id?: string
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          access_type: Database["public"]["Enums"]["live_class_access"]
          calendly_url: string
          created_at: string
          description: string | null
          id: string
          plan_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
          zoom_join_url: string | null
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["live_class_access"]
          calendly_url: string
          created_at?: string
          description?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
          zoom_join_url?: string | null
        }
        Update: {
          access_type?: Database["public"]["Enums"]["live_class_access"]
          calendly_url?: string
          created_at?: string
          description?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          zoom_join_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          id: string
          purchased_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          amount: number
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          currency: string
          id: string
          is_active: boolean
          plan_id: string
          stripe_price_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id: string
          stripe_price_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id?: string
          stripe_price_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          product_id: string
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          product_id: string
          size_bytes?: number | null
          storage_bucket: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          product_id?: string
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          granted_course_id: string | null
          id: string
          price_amount: number
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          stripe_price_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          granted_course_id?: string | null
          id?: string
          price_amount: number
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          stripe_price_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          granted_course_id?: string | null
          id?: string
          price_amount?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          stripe_price_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_granted_course_id_fkey"
            columns: ["granted_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_position_seconds: number
          lesson_id: string | null
          progress_percentage: number
          updated_at: string
          user_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          lesson_id?: string | null
          progress_percentage?: number
          updated_at?: string
          user_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          lesson_id?: string | null
          progress_percentage?: number
          updated_at?: string
          user_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          migration_status: Database["public"]["Enums"]["migration_status"]
          mux_asset_id: string | null
          mux_playback_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["video_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          migration_status?: Database["public"]["Enums"]["migration_status"]
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          migration_status?: Database["public"]["Enums"]["migration_status"]
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: Database["public"]["Enums"]["webhook_provider"]
          provider_event_id: string
          status: Database["public"]["Enums"]["webhook_event_status"]
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: Database["public"]["Enums"]["webhook_provider"]
          provider_event_id: string
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["webhook_provider"]
          provider_event_id?: string
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      billing_interval: "monthly" | "yearly"
      content_type: "course" | "module" | "lesson" | "video"
      ghl_sync_status: "pending" | "synced" | "failed"
      integration_job_status: "pending" | "processing" | "completed" | "failed"
      integration_job_type:
        | "ghl_sync"
        | "send_email"
        | "issue_certificate"
        | "process_video"
        | "retry_webhook"
      lead_type: "vip" | "retreat" | "private_event" | "free_taster"
      live_class_access:
        | "public"
        | "authenticated"
        | "member_only"
        | "plan_specific"
      migration_status: "not_started" | "uploaded" | "verified" | "failed"
      order_status: "pending" | "paid" | "failed" | "refunded" | "disputed"
      product_type:
        | "ebook"
        | "digital_download"
        | "bundle"
        | "masterclass"
        | "session"
      publish_status: "draft" | "published" | "archived"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "unpaid"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
      user_role: "user" | "admin" | "super_admin"
      video_status:
        | "uploading"
        | "processing"
        | "ready"
        | "failed"
        | "draft"
        | "published"
        | "archived"
      webhook_event_status: "received" | "processed" | "failed" | "ignored"
      webhook_provider: "stripe" | "mux" | "calendly" | "resend"
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
      billing_interval: ["monthly", "yearly"],
      content_type: ["course", "module", "lesson", "video"],
      ghl_sync_status: ["pending", "synced", "failed"],
      integration_job_status: ["pending", "processing", "completed", "failed"],
      integration_job_type: [
        "ghl_sync",
        "send_email",
        "issue_certificate",
        "process_video",
        "retry_webhook",
      ],
      lead_type: ["vip", "retreat", "private_event", "free_taster"],
      live_class_access: [
        "public",
        "authenticated",
        "member_only",
        "plan_specific",
      ],
      migration_status: ["not_started", "uploaded", "verified", "failed"],
      order_status: ["pending", "paid", "failed", "refunded", "disputed"],
      product_type: [
        "ebook",
        "digital_download",
        "bundle",
        "masterclass",
        "session",
      ],
      publish_status: ["draft", "published", "archived"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      user_role: ["user", "admin", "super_admin"],
      video_status: [
        "uploading",
        "processing",
        "ready",
        "failed",
        "draft",
        "published",
        "archived",
      ],
      webhook_event_status: ["received", "processed", "failed", "ignored"],
      webhook_provider: ["stripe", "mux", "calendly", "resend"],
    },
  },
} as const
