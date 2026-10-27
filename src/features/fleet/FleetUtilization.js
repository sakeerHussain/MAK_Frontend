export const UTILIZATION_PERIODS = [
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'THIS_MONTH', label: 'This month' },
]
export function utilizationValue(data) {
  return data?.utilizationPercent == null || !Number.isFinite(Number(data.utilizationPercent)) ? '—' : `${Number(data.utilizationPercent).toFixed(1)}%`
}
export const utilizationHours = seconds => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(seconds / 3600)
