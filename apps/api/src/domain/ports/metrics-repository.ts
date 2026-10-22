import { WeeklyMetricsRecord } from '../types/metrics'

// Aggregates across every user, for the admins. Counts only: nothing here may
// say who did what.
export interface MetricsRepository {
  totalUsers(): Promise<number>
  // The last `weeks` weeks, oldest first, the current one included; a week
  // without activity is there with zeros.
  weekly(weeks: number): Promise<WeeklyMetricsRecord[]>
}
