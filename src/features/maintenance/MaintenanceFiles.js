export function downloadReceipt(receipt) {
  if (receipt?.url) { const link = document.createElement('a'); link.href = receipt.url; link.download = receipt.name; document.body.append(link); link.click(); link.remove(); return }
  if (!receipt?.file) return
  const url = URL.createObjectURL(receipt.file)
  const link = document.createElement('a')
  link.href = url
  link.download = receipt.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
