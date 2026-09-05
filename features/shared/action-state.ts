export interface OperationState {
  success?: boolean;
  message?: string;
  id?: string;
  version?: number;
  errors?: Record<string, string[]>;
}
