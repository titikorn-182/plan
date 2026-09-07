import type { Database as GeneratedDatabase } from "@/types/database.generated";

type PublicSchema = GeneratedDatabase["public"];
type ReportScheduleRow = {
  cadence: "weekly" | "monthly" | "quarterly";
  created_at: string;
  day_of_month: number | null;
  day_of_week: number | null;
  format: "xlsx" | "pdf";
  id: string;
  is_active: boolean;
  last_run_at: string | null;
  name: string;
  owner_id: string;
  report_kind: "budget" | "projects" | "disbursements" | "kpi";
  send_time: string;
  timezone: string;
  updated_at: string;
};

type ReportScheduleTable = {
  Row: ReportScheduleRow;
  Insert: Pick<
    ReportScheduleRow,
    "cadence" | "format" | "name" | "owner_id" | "report_kind" | "send_time"
  > &
    Partial<
      Pick<
        ReportScheduleRow,
        | "created_at"
        | "day_of_month"
        | "day_of_week"
        | "id"
        | "is_active"
        | "last_run_at"
        | "timezone"
        | "updated_at"
      >
    >;
  Update: Partial<ReportScheduleRow>;
  Relationships: [
    {
      foreignKeyName: "report_schedules_owner_id_fkey";
      columns: ["owner_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
  ];
};

type ProjectRegister = PublicSchema["Views"]["project_register"];
type DisbursementRegister = PublicSchema["Views"]["disbursement_register"];
type KpiRegister = PublicSchema["Views"]["kpi_register"];

/**
 * Application database contract. New migration functions live here until the
 * migration has been applied remotely and the generated file includes them.
 */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions" | "Tables" | "Views"> & {
    Tables: PublicSchema["Tables"] & {
      report_schedules: ReportScheduleTable;
    };
    Views: Omit<
      PublicSchema["Views"],
      "project_register" | "disbursement_register" | "kpi_register"
    > & {
      project_register: Omit<ProjectRegister, "Row"> & {
        Row: ProjectRegister["Row"] & {
          fiscal_year_id: string | null;
          buddhist_year: number | null;
        };
      };
      disbursement_register: Omit<DisbursementRegister, "Row"> & {
        Row: DisbursementRegister["Row"] & {
          fiscal_year_id: string | null;
          buddhist_year: number | null;
        };
      };
      kpi_register: Omit<KpiRegister, "Row"> & {
        Row: KpiRegister["Row"] & {
          fiscal_year_id: string | null;
          quarter: number | null;
          buddhist_year: number | null;
        };
      };
    };
    Functions: PublicSchema["Functions"] & {
      submit_budget_request_for_approval: {
        Args: { p_entity_id: string; p_comment?: string };
        Returns: string;
      };
    };
  };
};
