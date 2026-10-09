const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i
const DOCUMENT_EXTENSIONS = /\.(png|jpe?g|webp|pdf)$/i
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function prepareUpload(file, kind) {
  if (!file) throw new Error('Choose a file first.')
  const image = IMAGE_EXTENSIONS.test(file.name)
  if (kind === 'image' && !image) throw new Error('Car photos must be PNG, JPG, or WebP images.')
  if (kind === 'document' && !DOCUMENT_EXTENSIONS.test(file.name)) throw new Error('Documents must be PNG, JPG, WebP, or PDF files.')
  if (file.size > MAX_FILE_SIZE) throw new Error('Each file must be smaller than 5 MB.')
  const previewUrl = image ? await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  }) : null
  return { name: file.name, size: file.size, previewUrl }
}
