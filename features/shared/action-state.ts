export interface OperationState {
  success?: boolean;
  message?: string;
  id?: string;
  version?: number;
  errors?: Record<string, string[]>;
}

export type OperationStateWithStatus<TStatus extends string> = OperationState & {
  status?: TStatus;
};
