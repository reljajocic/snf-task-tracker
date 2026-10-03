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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          approver_name: string
          comment: string | null
          created_at: string
          id: string
          kind: string
          status: string
          task_id: string
          version_id: string | null
        }
        Insert: {
          approver_name: string
          comment?: string | null
          created_at?: string
          id?: string
          kind: string
          status: string
          task_id: string
          version_id?: string | null
        }
        Update: {
          approver_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          status?: string
          task_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "video_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          role: Database["public"]["Enums"]["client_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["client_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["client_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portals: {
        Row: {
          client_id: string
          created_at: string
          enabled: boolean
          rotated_at: string | null
          show_report: boolean
          show_review: boolean
          show_schedule: boolean
          show_scripts: boolean
          show_shoots: boolean
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          enabled?: boolean
          rotated_at?: string | null
          show_report?: boolean
          show_review?: boolean
          show_schedule?: boolean
          show_scripts?: boolean
          show_shoots?: boolean
          token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          enabled?: boolean
          rotated_at?: string | null
          show_report?: boolean
          show_review?: boolean
          show_schedule?: boolean
          show_scripts?: boolean
          show_shoots?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          content_types: string[]
          created_at: string
          created_by: string | null
          default_editor_id: string | null
          drive_url: string | null
          editor_rules: Json
          email: string | null
          id: string
          locations: string[]
          name: string
          notes: string | null
          posting_days: number[]
          profiles: string[]
          services: string[]
          since: string | null
          socials: Json
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          content_types?: string[]
          created_at?: string
          created_by?: string | null
          default_editor_id?: string | null
          drive_url?: string | null
          editor_rules?: Json
          email?: string | null
          id?: string
          locations?: string[]
          name: string
          notes?: string | null
          posting_days?: number[]
          profiles?: string[]
          services?: string[]
          since?: string | null
          socials?: Json
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          content_types?: string[]
          created_at?: string
          created_by?: string | null
          default_editor_id?: string | null
          drive_url?: string | null
          editor_rules?: Json
          email?: string | null
          id?: string
          locations?: string[]
          name?: string
          notes?: string | null
          posting_days?: number[]
          profiles?: string[]
          services?: string[]
          since?: string | null
          socials?: Json
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_default_editor_id_fkey"
            columns: ["default_editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          enabled: boolean
          event_type: string
          user_id: string
        }
        Insert: {
          channel?: string
          enabled?: boolean
          event_type: string
          user_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          event_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          read_at: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          payload?: Json
          read_at?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          read_at?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_activity: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_activity_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_people: {
        Row: {
          can_approve: boolean
          client_id: string
          created_at: string
          email: string | null
          id: string
          label: string
        }
        Insert: {
          can_approve?: boolean
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          label: string
        }
        Update: {
          can_approve?: boolean
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_bg: string
          avatar_fg: string
          created_at: string
          email: string
          full_name: string
          id: string
          initials: string
          is_active: boolean
          locale: string
          role: Database["public"]["Enums"]["app_role"]
          theme: string
        }
        Insert: {
          avatar_bg?: string
          avatar_fg?: string
          created_at?: string
          email: string
          full_name?: string
          id: string
          initials?: string
          is_active?: boolean
          locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          theme?: string
        }
        Update: {
          avatar_bg?: string
          avatar_fg?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          initials?: string
          is_active?: boolean
          locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          theme?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          drive_url: string | null
          ends_on: string | null
          id: string
          name: string
          starts_on: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_url?: string | null
          ends_on?: string | null
          id?: string
          name: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_url?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_crew: {
        Row: {
          shoot_id: string
          user_id: string
        }
        Insert: {
          shoot_id: string
          user_id: string
        }
        Update: {
          shoot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_crew_shoot_id_fkey"
            columns: ["shoot_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoot_crew_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_days: {
        Row: {
          call_times: Json
          client_id: string
          created_at: string
          created_by: string | null
          date: string
          drive_url: string | null
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          starts_at: string | null
        }
        Insert: {
          call_times?: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          date: string
          drive_url?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string | null
        }
        Update: {
          call_times?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          drive_url?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shoot_days_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoot_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          edited_at: string | null
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          completed_at: string | null
          content_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          drive_url: string | null
          dropped_at: string | null
          due_date: string | null
          estimate_minutes: number | null
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          location: string | null
          profile: string | null
          note: string | null
          on_camera: string | null
          parent_id: string | null
          phase: number | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          publish_date: string | null
          published_at: string | null
          reference_url: string | null
          script: Json
          shoot_id: string | null
          shoot_order: number | null
          shoot_time: string | null
          shot_status: string | null
          status: Database["public"]["Enums"]["task_status"]
          status_changed_at: string
          title: string
          type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_url?: string | null
          dropped_at?: string | null
          due_date?: string | null
          estimate_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          location?: string | null
          profile?: string | null
          note?: string | null
          on_camera?: string | null
          parent_id?: string | null
          phase?: number | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          reference_url?: string | null
          script?: Json
          shoot_id?: string | null
          shoot_order?: number | null
          shoot_time?: string | null
          shot_status?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          status_changed_at?: string
          title: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_url?: string | null
          dropped_at?: string | null
          due_date?: string | null
          estimate_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          location?: string | null
          profile?: string | null
          note?: string | null
          on_camera?: string | null
          parent_id?: string | null
          phase?: number | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          reference_url?: string | null
          script?: Json
          shoot_id?: string | null
          shoot_order?: number | null
          shoot_time?: string | null
          shot_status?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          status_changed_at?: string
          title?: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shoot_id_fkey"
            columns: ["shoot_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
      video_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          task_id: string
          url: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          task_id: string
          url: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          task_id?: string
          url?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_versions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_task_in: {
        Args: { cid: string; pid: string }
        Returns: boolean
      }
      can_edit_task: { Args: { tid: string }; Returns: boolean }
      can_view_client: { Args: { cid: string }; Returns: boolean }
      can_view_project: { Args: { pid: string }; Returns: boolean }
      can_view_task: { Args: { tid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_client_manager: { Args: { cid: string }; Returns: boolean }
      is_client_team: { Args: { cid: string }; Returns: boolean }
      is_project_member: { Args: { pid: string }; Returns: boolean }
      is_shoot_crew: { Args: { sid: string }; Returns: boolean }
      is_task_assignee: { Args: { tid: string }; Returns: boolean }
      mark_shot: {
        Args: { new_status: string; tid: string }
        Returns: undefined
      }
      task_editable: {
        Args: { cid: string; creator: string; tid: string }
        Returns: boolean
      }
      task_visible: {
        Args: { cid: string; creator: string; pid: string; tid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      client_role: "manager" | "member"
      client_status: "active" | "prospect" | "paused" | "finished"
      project_status: "active" | "on_hold" | "completed" | "archived"
      task_kind: "task" | "video" | "subtask"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "waiting_client" | "done"
      task_type:
        | "script"
        | "shoot"
        | "edit"
        | "revision"
        | "publish"
        | "meeting"
        | "admin"
        | "other"
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
      app_role: ["admin", "user"],
      client_role: ["manager", "member"],
      client_status: ["active", "prospect", "paused", "finished"],
      project_status: ["active", "on_hold", "completed", "archived"],
      task_kind: ["task", "video", "subtask"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "waiting_client", "done"],
      task_type: [
        "script",
        "shoot",
        "edit",
        "revision",
        "publish",
        "meeting",
        "admin",
        "other",
      ],
    },
  },
} as const
