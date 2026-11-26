export interface AnalyticsSummaryResponse {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  approval_percentage: number;
  rejection_percentage: number;
  average_resolution_hours: number | null;
  changes_requested: number;
}

export type CubeName = 'requests' | 'equivalences' | 'processing-times';
export type CubeRow = Record<string, string | number | null>;
