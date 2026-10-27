// A notice describes an event; an open action represents a condition still needing work.
export function notificationPresentation(item) {
  const openAction = Boolean(item.actionable && !item.resolvedAt)
  const priority = item.actionable ? item.priority : 'Information'
  return {
    priority,
    label: item.resolvedAt ? 'Resolved' : priority,
    critical: openAction && priority === 'Critical',
    canAcknowledge: openAction && !item.acknowledgedAt,
    showAcknowledgement: openAction && Boolean(item.acknowledgedAt || item.acknowledgedBy?.length),
  }
}
