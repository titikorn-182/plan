export interface OperationState {
  success?: boolean;
  message?: string;
  id?: string;
  version?: number;
  status?: string;
  errors?: Record<string, string[]>;
}
