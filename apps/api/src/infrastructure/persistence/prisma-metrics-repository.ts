import { PrismaClient } from '@prisma/client'
import { MetricsRepository } from '../../domain/ports/metrics-repository'
import { WeeklyMetricsRecord } from '../../domain/types/metrics'

// Postgres counts come back as bigint.
type Count = bigint

export class PrismaMetricsRepository implements MetricsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  totalUsers(): Promise<number> {
    return this.prisma.user.count()
  }

  // Timestamps are stored in UTC without a zone, so weeks are cut in UTC too.
  async weekly(weeks: number): Promise<WeeklyMetricsRecord[]> {
    const rows = await this.prisma.$queryRaw<
      { week: Date; sign_ups: Count; verified: Count }[]
    >`
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', now() AT TIME ZONE 'UTC')
            - make_interval(weeks => ${weeks - 1}),
          date_trunc('week', now() AT TIME ZONE 'UTC'),
          interval '1 week'
        ) AS week
      ), sign_ups AS (
        SELECT date_trunc('week', "createdAt") AS week,
               count(*) AS sign_ups,
               count(*) FILTER (
                 WHERE "emailVerifiedAt" IS NOT NULL
               ) AS verified
        FROM "User"
        GROUP BY 1
      )
      SELECT weeks.week,
             coalesce(sign_ups.sign_ups, 0) AS sign_ups,
             coalesce(sign_ups.verified, 0) AS verified
      FROM weeks
      LEFT JOIN sign_ups USING (week)
      ORDER BY weeks.week`
    return rows.map((row) => ({
      weekStart: row.week,
      signUps: Number(row.sign_ups),
      verified: Number(row.verified),
    }))
  }
}
