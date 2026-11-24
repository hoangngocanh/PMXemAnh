import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type PhotoMetadata = {
  name: string
  level?: number
  subject?: string
  disliked?: boolean
}
export type PhotoMetadataPatch = { level?: number | null; subject?: string | null; disliked?: boolean | null }
export const PHOTO_SUBJECTS = new Set(['Văn miếu', 'Đèn chùm', 'Piano', 'studio', 'Cổ phục', 'Cầu thang'])

const metadataFile = path.join(process.cwd(), 'data', 'photo-metadata.json')

export async function readPhotoMetadata(): Promise<PhotoMetadata[]> {
  try {
    const content = await readFile(metadataFile, 'utf8')
    const data = JSON.parse(content) as { photos?: unknown }
    if (!Array.isArray(data.photos)) return []
    return data.photos.flatMap((item): PhotoMetadata[] => {
      if (typeof item !== 'object' || item === null || !('name' in item) || typeof item.name !== 'string') return []
      const metadata: PhotoMetadata = { name: item.name }
      if ('level' in item && typeof item.level === 'number' && Number.isInteger(item.level) && item.level >= 1 && item.level <= 3) metadata.level = item.level
      if ('subject' in item && typeof item.subject === 'string') metadata.subject = item.subject
      if ('disliked' in item && item.disliked === true) metadata.disliked = true
      return metadata.level !== undefined || metadata.subject !== undefined || metadata.disliked ? [metadata] : []
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function writePhotoMetadata(photos: PhotoMetadata[]) {
  const sorted = photos
    .filter((photo) => photo.level !== undefined || photo.subject !== undefined || photo.disliked === true)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }))
  await mkdir(path.dirname(metadataFile), { recursive: true })
  await writeFile(metadataFile, `${JSON.stringify({ photos: sorted }, null, 2)}\n`, 'utf8')
  return sorted
}

export async function updatePhotoMetadata(name: string, patch: PhotoMetadataPatch) {
  const photos = await readPhotoMetadata()
  const existing = photos.find((photo) => photo.name === name) ?? { name }
  const updated = { ...existing, name } as PhotoMetadata

  for (const key of ['level', 'subject', 'disliked'] as const) {
    if (!(key in patch)) continue
    if (patch[key] == null || (key === 'disliked' && patch.disliked === false)) delete updated[key]
    else updated[key] = patch[key] as never
  }

  const remaining = photos.filter((photo) => photo.name !== name)
  remaining.push(updated)
  return writePhotoMetadata(remaining)
}
