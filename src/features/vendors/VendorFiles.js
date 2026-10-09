export function downloadVendorAttachment(item) {
  if (item.url) {
    const link = document.createElement('a')
    link.href = item.url; link.download = item.name; document.body.append(link); link.click(); link.remove()
    return
  }
  if (!item.file) return
  const url = URL.createObjectURL(item.file)
  const link = document.createElement('a')
  link.href = url; link.download = item.name; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
