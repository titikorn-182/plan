import type { Database as GeneratedDatabase } from "@/types/database.generated";

type PublicSchema = GeneratedDatabase["public"];

/**
 * Application database contract. New migration functions live here until the
 * migration has been applied remotely and the generated file includes them.
 */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions"> & {
    Functions: PublicSchema["Functions"] & {
      submit_budget_request_for_approval: {
        Args: { p_entity_id: string; p_comment?: string };
        Returns: string;
      };
    };
  };
};
