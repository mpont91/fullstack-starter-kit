import { AdminMetrics } from '@app/shared'
import { MetricsRepository } from '../domain/ports/metrics-repository'

// A quarter of weeks: enough to see a trend, short enough to read at a glance.
const WEEKS = 12

export class GetMetricsUseCase {
  constructor(private readonly metricsRepository: MetricsRepository) {}

  async execute(): Promise<AdminMetrics> {
    const [totalUsers, weeks] = await Promise.all([
      this.metricsRepository.totalUsers(),
      this.metricsRepository.weekly(WEEKS),
    ])
    return {
      totalUsers,
      weeks: weeks.map((week) => ({
        ...week,
        weekStart: week.weekStart.toISOString(),
      })),
    }
  }
}
