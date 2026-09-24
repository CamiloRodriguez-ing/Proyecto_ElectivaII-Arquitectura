export interface AnalyticsSummaryPayload {
  requests: Array<{
    type: string;
    status: string;
  }>;
}

export interface AnalyticsSummaryResponse {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  approval_percentage: number;
  rejection_percentage: number;
  average_resolution_hours: number;
  changes_requested: number;
}
