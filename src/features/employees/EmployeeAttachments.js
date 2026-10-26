// Removing persisted files is distinct from undoing a local replacement or upload.
export function employeeAttachmentAction(attachment, previous, existingEmployee) {
  const undo = Boolean(attachment?.file && previous)
  const persisted = Boolean(previous?.id || (attachment?.id && !attachment?.file))
  return {
    permission: persisted && !undo ? 'employees.archive' : existingEmployee ? 'employees.edit' : 'employees.create',
    label: undo ? 'Undo replacement' : 'Remove',
    restore: undo ? previous : null,
  }
}
