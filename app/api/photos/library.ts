import { readdir } from 'node:fs/promises'
import path from 'node:path'

const publicDirectory = path.join(process.cwd(), 'public')
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp'])

async function walk(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const photos: string[] = []

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      photos.push(...await walk(path.join(directory, entry.name), relativePath))
    } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      photos.push(relativePath)
    }
  }

  return photos
}

export async function listPublicPhotos() {
  const photos = await walk(publicDirectory)
  return photos.sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' }))
}
