<script setup lang="ts">
import type { AdminMetrics } from '@app/shared'
import { computed } from 'vue'
import { useLanguage, useTranslations } from '../i18n/vue'
import { getMetrics } from '../services/admin.service'
import { errorMessage } from '../helpers/error-helper'
import { useAsync } from '../composables/use-async'
import AsyncView from './ui/AsyncView.vue'
import Card from './ui/Card.vue'
import Skeleton from './ui/Skeleton.vue'

const t = useTranslations()
const language = useLanguage()

const metrics = useAsync<AdminMetrics | null>(getMetrics, {
  initial: null,
  errorMessage: (e) =>
    errorMessage(e, { server: t('admin.metrics.loadError') }),
})

// Newest week first: this week is what's read most.
const weeks = computed(() => [...(metrics.data?.weeks ?? [])].reverse())

const weekFormat = new Intl.DateTimeFormat(language, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const percentFormat = new Intl.NumberFormat(language, {
  style: 'percent',
  maximumFractionDigits: 0,
})
// A share of nothing is no share at all, not 0%.
const share = (part: number, whole: number) =>
  whole === 0 ? '—' : percentFormat.format(part / whole)
</script>

<template>
  <section class="space-y-8">
    <AsyncView :state="metrics">
      <template #loading>
        <Card as="div" class="space-y-3">
          <Skeleton v-for="row in 6" :key="row" class="h-4 w-full" />
        </Card>
      </template>

      <template v-if="metrics.data">
        <Card as="div">
          <p class="text-xs font-medium text-muted uppercase">
            {{ t('admin.metrics.totalUsers') }}
          </p>
          <p class="mt-1 text-3xl font-bold tabular-nums">
            {{ metrics.data.totalUsers }}
          </p>
        </Card>

        <div class="space-y-3">
          <div>
            <h2 class="text-xs font-medium text-muted uppercase">
              {{ t('admin.metrics.weekly.title') }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ t('admin.metrics.weekly.intro') }}
            </p>
          </div>
          <Card as="div" class="overflow-hidden p-0">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="border-b border-border text-left text-xs text-muted uppercase"
                  >
                    <th class="px-4 py-3 font-medium">
                      {{ t('admin.metrics.week') }}
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      {{ t('admin.metrics.signUps') }}
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      {{ t('admin.metrics.verified') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="week in weeks"
                    :key="week.weekStart"
                    class="border-t border-border tabular-nums"
                  >
                    <td class="px-4 py-2.5 whitespace-nowrap text-muted">
                      {{ weekFormat.format(new Date(week.weekStart)) }}
                    </td>
                    <td class="px-4 py-2.5 text-right">{{ week.signUps }}</td>
                    <td class="px-4 py-2.5 text-right">
                      {{ week.verified }}
                      <span class="text-xs text-muted">
                        ({{ share(week.verified, week.signUps) }})
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </template>
    </AsyncView>
  </section>
</template>
