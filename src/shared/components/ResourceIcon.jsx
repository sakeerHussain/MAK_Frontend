import {
  IconAlertCircle, IconAlertTriangle, IconArrowsExchange, IconCar, IconCheck,
  IconChevronLeft, IconChevronRight, IconCircleCheck, IconDots, IconEye,
  IconFileText, IconFilter, IconGauge, IconKey, IconPencil, IconPlus,
  IconPower, IconSearch, IconTool, IconTrash, IconUpload, IconUser, IconUsers, IconX,
} from '@tabler/icons-react'

const icons = {
  alert: IconAlertTriangle, expired: IconAlertCircle, swap: IconArrowsExchange,
  fleet: IconCar, check: IconCheck, left: IconChevronLeft, back: IconChevronLeft,
  right: IconChevronRight, more: IconDots, eye: IconEye, document: IconFileText,
  filter: IconFilter, gauge: IconGauge, key: IconKey, edit: IconPencil,
  plus: IconPlus, power: IconPower, search: IconSearch, wrench: IconTool,
  trash: IconTrash, upload: IconUpload, driver: IconUser, users: IconUsers,
  ready: IconCircleCheck, close: IconX,
}

export default function ResourceIcon({ name, size = 18, ...props }) {
  const Component = icons[name] || IconFileText
  return <Component size={size} stroke={1.7} aria-hidden="true" {...props} />
}
