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
      approval_tasks: {
        Row: {
          acted_at: string | null
          assignee_id: string | null
          comment: string | null
          created_at: string
          due_at: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          required_role: Database["public"]["Enums"]["app_role"] | null
          status: string
        }
        Insert: {
          acted_at?: string | null
          assignee_id?: string | null
          comment?: string | null
          created_at?: string
          due_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          required_role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
        }
        Update: {
          acted_at?: string | null
          assignee_id?: string | null
          comment?: string | null
          created_at?: string
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          required_role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          archived_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          is_verified: boolean
          mime_type: string
          organization_id: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          is_verified?: boolean
          mime_type: string
          organization_id: string
          size_bytes: number
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          is_verified?: boolean
          mime_type?: string
          organization_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          entity_id: string
          entity_type: string
          id: number
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          organization_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          entity_id: string
          entity_type: string
          id?: never
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          organization_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          entity_id?: string
          entity_type?: string
          id?: never
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          organization_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_cycles: {
        Row: {
          allow_staff_submit: boolean
          closes_at: string
          created_at: string
          fiscal_year_id: string
          id: string
          name: string
          opens_at: string
          status: Database["public"]["Enums"]["cycle_status"]
          updated_at: string
        }
        Insert: {
          allow_staff_submit?: boolean
          closes_at: string
          created_at?: string
          fiscal_year_id: string
          id?: string
          name: string
          opens_at: string
          status?: Database["public"]["Enums"]["cycle_status"]
          updated_at?: string
        }
        Update: {
          allow_staff_submit?: boolean
          closes_at?: string
          created_at?: string
          fiscal_year_id?: string
          id?: string
          name?: string
          opens_at?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_cycles_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_request_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_category: string
          id: string
          justification: string | null
          q1_amount: number
          q2_amount: number
          q3_amount: number
          q4_amount: number
          quantity: number
          total: number | null
          unit_price: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          budget_request_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_category: string
          id?: string
          justification?: string | null
          q1_amount?: number
          q2_amount?: number
          q3_amount?: number
          q4_amount?: number
          quantity: number
          total?: number | null
          unit_price: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          budget_request_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_category?: string
          id?: string
          justification?: string | null
          q1_amount?: number
          q2_amount?: number
          q3_amount?: number
          q4_amount?: number
          quantity?: number
          total?: number | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_request_id_fkey"
            columns: ["budget_request_id"]
            isOneToOne: false
            referencedRelation: "budget_request_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_request_id_fkey"
            columns: ["budget_request_id"]
            isOneToOne: false
            referencedRelation: "budget_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_requests: {
        Row: {
          archived_at: string | null
          budget_cycle_id: string
          category: string
          code: string
          coordinator_id: string | null
          coordinator_name: string
          created_at: string
          created_by: string | null
          expense_breakdown: Json | null
          fiscal_year_id: string
          id: string
          locked_at: string | null
          organization_id: string
          owner_id: string | null
          owner_name: string
          priority: Database["public"]["Enums"]["priority_level"]
          progress: number
          proposal_details: Json
          project_type: string
          rationale: string
          requested_amount: number
          status: Database["public"]["Enums"]["document_status"]
          submitted_at: string | null
          title_en: string | null
          title_th: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          budget_cycle_id: string
          category: string
          code: string
          coordinator_id?: string | null
          coordinator_name: string
          created_at?: string
          created_by?: string | null
          expense_breakdown?: Json | null
          fiscal_year_id: string
          id?: string
          locked_at?: string | null
          organization_id: string
          owner_id?: string | null
          owner_name: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          proposal_details?: Json
          project_type: string
          rationale?: string
          requested_amount?: number
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          title_en?: string | null
          title_th: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          budget_cycle_id?: string
          category?: string
          code?: string
          coordinator_id?: string | null
          coordinator_name?: string
          created_at?: string
          created_by?: string | null
          expense_breakdown?: Json | null
          fiscal_year_id?: string
          id?: string
          locked_at?: string | null
          organization_id?: string
          owner_id?: string | null
          owner_name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          proposal_details?: Json
          project_type?: string
          rationale?: string
          requested_amount?: number
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          title_en?: string | null
          title_th?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_requests_budget_cycle_id_fkey"
            columns: ["budget_cycle_id"]
            isOneToOne: false
            referencedRelation: "budget_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          parent_id: string | null
        }
        Insert: {
          archived_at?: string | null
          body: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          parent_id?: string | null
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursements: {
        Row: {
          amount: number
          budget_line_id: string | null
          created_at: string
          created_by: string | null
          disbursed_on: string
          fiscal_year_id: string
          id: string
          organization_id: string
          project_id: string
          quarter: number
          reference_no: string | null
          status: Database["public"]["Enums"]["disbursement_status"]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          amount: number
          budget_line_id?: string | null
          created_at?: string
          created_by?: string | null
          disbursed_on: string
          fiscal_year_id: string
          id?: string
          organization_id: string
          project_id: string
          quarter: number
          reference_no?: string | null
          status?: Database["public"]["Enums"]["disbursement_status"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          created_at?: string
          created_by?: string | null
          disbursed_on?: string
          fiscal_year_id?: string
          id?: string
          organization_id?: string
          project_id?: string
          quarter?: number
          reference_no?: string | null
          status?: Database["public"]["Enums"]["disbursement_status"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "disbursement_register"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "disbursements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          buddhist_year: number
          created_at: string
          ends_on: string
          id: string
          label: string
          starts_on: string
          status: Database["public"]["Enums"]["cycle_status"]
          updated_at: string
        }
        Insert: {
          buddhist_year: number
          created_at?: string
          ends_on: string
          id?: string
          label: string
          starts_on: string
          status?: Database["public"]["Enums"]["cycle_status"]
          updated_at?: string
        }
        Update: {
          buddhist_year?: number
          created_at?: string
          ends_on?: string
          id?: string
          label?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          updated_at?: string
        }
        Relationships: []
      }
      kpi_definitions: {
        Row: {
          baseline: number | null
          calculation_method: string
          code: string
          created_at: string
          created_by: string | null
          direction: string
          fiscal_year_id: string
          framework: string
          framework_version: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          owner_id: string | null
          owner_name: string
          target: number
          unit: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          baseline?: number | null
          calculation_method: string
          code: string
          created_at?: string
          created_by?: string | null
          direction?: string
          fiscal_year_id: string
          framework: string
          framework_version: string
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          owner_id?: string | null
          owner_name: string
          target: number
          unit: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          baseline?: number | null
          calculation_method?: string
          code?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          fiscal_year_id?: string
          framework?: string
          framework_version?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          owner_id?: string | null
          owner_name?: string
          target?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_results: {
        Row: {
          actual: number | null
          assignee_id: string | null
          created_at: string
          created_by: string | null
          evidence_count: number
          explanation: string | null
          fiscal_year_id: string
          id: string
          kpi_definition_id: string
          organization_id: string
          quarter: number | null
          result_state: Database["public"]["Enums"]["result_state"]
          status: Database["public"]["Enums"]["kpi_result_status"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          actual?: number | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence_count?: number
          explanation?: string | null
          fiscal_year_id: string
          id?: string
          kpi_definition_id: string
          organization_id: string
          quarter?: number | null
          result_state?: Database["public"]["Enums"]["result_state"]
          status?: Database["public"]["Enums"]["kpi_result_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          actual?: number | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence_count?: number
          explanation?: string | null
          fiscal_year_id?: string
          id?: string
          kpi_definition_id?: string
          organization_id?: string
          quarter?: number | null
          result_state?: Database["public"]["Enums"]["result_state"]
          status?: Database["public"]["Enums"]["kpi_result_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_results_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_results_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string | null
          name_th: string
          organization_type: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th: string
          organization_type: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th?: string
          organization_type?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          member_role: string
          profile_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          member_role: string
          profile_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          member_role?: string
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "disbursement_register"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_completion_reports: {
        Row: {
          actual_results: string | null
          beneficiary_summary: string | null
          created_at: string
          created_by: string | null
          due_at: string
          evidence_count: number
          expense_summary: string | null
          fiscal_year_id: string
          follow_up_plan: string | null
          id: string
          indicator_results: string | null
          lessons_learned: string | null
          objective_achievement: string | null
          organization_id: string
          problems: string | null
          project_id: string
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          actual_results?: string | null
          beneficiary_summary?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          evidence_count?: number
          expense_summary?: string | null
          fiscal_year_id: string
          follow_up_plan?: string | null
          id?: string
          indicator_results?: string | null
          lessons_learned?: string | null
          objective_achievement?: string | null
          organization_id: string
          problems?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          actual_results?: string | null
          beneficiary_summary?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          evidence_count?: number
          expense_summary?: string | null
          fiscal_year_id?: string
          follow_up_plan?: string | null
          id?: string
          indicator_results?: string | null
          lessons_learned?: string | null
          objective_achievement?: string | null
          organization_id?: string
          problems?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_completion_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_completion_reports_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_completion_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_completion_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_completion_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_completion_reports_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          approved_budget: number
          archived_at: string | null
          budget_request_id: string | null
          code: string
          coordinator_id: string | null
          coordinator_name: string
          created_at: string
          created_by: string | null
          disbursed_amount: number
          disbursement_code: string | null
          disbursement_state: Database["public"]["Enums"]["disbursement_status"]
          disbursement_target: number
          ends_on: string | null
          fiscal_year_id: string
          health: Database["public"]["Enums"]["health_status"]
          id: string
          organization_id: string
          owner_id: string | null
          owner_name: string
          proposal_details: Json
          progress: number
          project_type: string
          starts_on: string | null
          status: Database["public"]["Enums"]["project_status"]
          title_th: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approved_budget?: number
          archived_at?: string | null
          budget_request_id?: string | null
          code: string
          coordinator_id?: string | null
          coordinator_name: string
          created_at?: string
          created_by?: string | null
          disbursed_amount?: number
          disbursement_code?: string | null
          disbursement_state?: Database["public"]["Enums"]["disbursement_status"]
          disbursement_target?: number
          ends_on?: string | null
          fiscal_year_id: string
          health?: Database["public"]["Enums"]["health_status"]
          id?: string
          organization_id: string
          owner_id?: string | null
          owner_name: string
          proposal_details?: Json
          progress?: number
          project_type: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title_th: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approved_budget?: number
          archived_at?: string | null
          budget_request_id?: string | null
          code?: string
          coordinator_id?: string | null
          coordinator_name?: string
          created_at?: string
          created_by?: string | null
          disbursed_amount?: number
          disbursement_code?: string | null
          disbursement_state?: Database["public"]["Enums"]["disbursement_status"]
          disbursement_target?: number
          ends_on?: string | null
          fiscal_year_id?: string
          health?: Database["public"]["Enums"]["health_status"]
          id?: string
          organization_id?: string
          owner_id?: string | null
          owner_name?: string
          proposal_details?: Json
          progress?: number
          project_type?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title_th?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_budget_request_id_fkey"
            columns: ["budget_request_id"]
            isOneToOne: false
            referencedRelation: "budget_request_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_budget_request_id_fkey"
            columns: ["budget_request_id"]
            isOneToOne: false
            referencedRelation: "budget_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_reports: {
        Row: {
          achievement_summary: string | null
          created_at: string
          created_by: string | null
          cumulative_progress: number
          due_at: string
          evidence_count: number
          fiscal_year_id: string
          id: string
          organization_id: string
          problems: string | null
          project_id: string
          quarter: number
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          achievement_summary?: string | null
          created_at?: string
          created_by?: string | null
          cumulative_progress?: number
          due_at: string
          evidence_count?: number
          fiscal_year_id: string
          id?: string
          organization_id: string
          problems?: string | null
          project_id: string
          quarter: number
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          achievement_summary?: string | null
          created_at?: string
          created_by?: string | null
          cumulative_progress?: number
          due_at?: string
          evidence_count?: number
          fiscal_year_id?: string
          id?: string
          organization_id?: string
          problems?: string | null
          project_id?: string
          quarter?: number
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "disbursement_register"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quarterly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reports_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization_scopes: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          profile_id: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          profile_id: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_scopes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_request_register: {
        Row: {
          amount: number | null
          buddhist_year: number | null
          category: string | null
          code: string | null
          id: string | null
          organization_id: string | null
          status: string | null
          title: string | null
          unit: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_queue: {
        Row: {
          amount_note: string | null
          amount_value: number | null
          buddhist_year: number | null
          business_id: string | null
          coordinator: string | null
          entity_id: string | null
          entity_type: string | null
          evidence: Json | null
          owner: string | null
          progress: number | null
          project_type: string | null
          raw_state: string | null
          severity: string | null
          sort_key: string | null
          stage: string | null
          title: string | null
          unit: string | null
        }
        Relationships: []
      }
      disbursement_register: {
        Row: {
          approved: number | null
          id: string | null
          organization_id: string | null
          project: string | null
          project_id: string | null
          q1: number | null
          q2: number | null
          q3: number | null
          q4: number | null
          status: string | null
          target: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_register: {
        Row: {
          business_id: string | null
          entity_id: string | null
          entity_type: string | null
          file_name: string | null
          id: string | null
          is_verified: boolean | null
          mime_type: string | null
          organization_id: string | null
          size_bytes: number | null
          storage_path: string | null
          title: string | null
          unit: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_register: {
        Row: {
          actual: number | null
          code: string | null
          evidence_count: number | null
          framework: string | null
          id: string | null
          name: string | null
          organization_id: string | null
          owner: string | null
          status: string | null
          target: number | null
          unit: string | null
          version: number | null
          workflow_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_register: {
        Row: {
          budget: number | null
          code: string | null
          due: string | null
          has_pending_approval: boolean | null
          health: string | null
          id: string | null
          organization_id: string | null
          owner: string | null
          progress: number | null
          spent: number | null
          status: string | null
          title: string | null
          unit: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_completion_report_register: {
        Row: {
          buddhist_year: number | null
          due_at: string | null
          ends_on: string | null
          evidence_count: number | null
          fiscal_year_id: string | null
          id: string | null
          organization_id: string | null
          project_code: string | null
          project_id: string | null
          status: string | null
          submitted_at: string | null
          title: string | null
          unit: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_report_register: {
        Row: {
          buddhist_year: number | null
          due_at: string | null
          evidence: number | null
          id: string | null
          organization_id: string | null
          progress: number | null
          project: string | null
          quarter: number | null
          status: string | null
          title: string | null
          unit: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_inbox: {
        Row: {
          acted_at: string | null
          assignee_id: string | null
          business_id: string | null
          comment: string | null
          created_at: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          organization_id: string | null
          required_role: string | null
          status: string | null
          title: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      act_on_approval_task: {
        Args: { p_comment?: string; p_decision: string; p_task_id: string }
        Returns: boolean
      }
      admin_update_user_access: {
        Args: {
          p_full_name: string
          p_is_active: boolean
          p_organization_ids: string[]
          p_profile_id: string
          p_roles: string[]
        }
        Returns: boolean
      }
      review_evidence: {
        Args: {
          p_attachment_id: string
          p_comment?: string
          p_verified: boolean
        }
        Returns: boolean
      }
      submit_entity_for_approval: {
        Args: { p_comment?: string; p_entity_id: string; p_entity_type: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "executive" | "staff"
      cycle_status: "open" | "closed" | "archived"
      disbursement_status:
        | "recorded"
        | "reconciled"
        | "pending_docs"
        | "delayed"
      document_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "pending_approval"
        | "revision_required"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "cancelled"
      health_status: "normal" | "watch" | "at_risk" | "delayed"
      kpi_result_status:
        | "not_started"
        | "draft"
        | "submitted"
        | "revision_required"
        | "verified"
        | "overdue"
        | "not_applicable"
      priority_level: "medium" | "high" | "critical"
      project_status:
        | "proposed"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      report_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "revision_required"
        | "approved"
        | "overdue"
      result_state:
        | "achieved"
        | "on_track"
        | "at_risk"
        | "not_achieved"
        | "no_data"
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
      app_role: ["admin", "user", "executive", "staff"],
      cycle_status: ["open", "closed", "archived"],
      disbursement_status: [
        "recorded",
        "reconciled",
        "pending_docs",
        "delayed",
      ],
      document_status: [
        "draft",
        "submitted",
        "under_review",
        "pending_approval",
        "revision_required",
        "approved",
        "rejected",
        "withdrawn",
        "cancelled",
      ],
      health_status: ["normal", "watch", "at_risk", "delayed"],
      kpi_result_status: [
        "not_started",
        "draft",
        "submitted",
        "revision_required",
        "verified",
        "overdue",
        "not_applicable",
      ],
      priority_level: ["medium", "high", "critical"],
      project_status: [
        "proposed",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      report_status: [
        "draft",
        "submitted",
        "under_review",
        "revision_required",
        "approved",
        "overdue",
      ],
      result_state: [
        "achieved",
        "on_track",
        "at_risk",
        "not_achieved",
        "no_data",
      ],
    },
  },
} as const
