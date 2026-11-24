import { listPublicPhotos } from '../photos/library'
import { PHOTO_SUBJECTS, readPhotoMetadata, updatePhotoMetadata } from '../photo-metadata/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ratings = (await readPhotoMetadata())
      .filter((photo) => photo.level !== undefined)
      .map(({ name, level }) => ({ name, level }))
    return Response.json({ ratings })
  } catch (error) {
    console.error('Could not read photo ratings:', error)
    return Response.json({ error: 'Could not read photo ratings.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('name' in body) || !('level' in body)) {
      return Response.json({ error: 'Invalid photo rating.' }, { status: 400 })
    }
    const { name, level } = body
    const subject = 'subject' in body ? body.subject : undefined
    const validLevel = typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 3
    if (typeof name !== 'string' || (level !== null && !validLevel) ||
      (subject !== undefined && (typeof subject !== 'string' || !PHOTO_SUBJECTS.has(subject)))) {
      return Response.json({ error: 'Choose a rating from 1 to 3 stars.' }, { status: 400 })
    }

    const available = new Set(await listPublicPhotos())
    if (!available.has(name)) return Response.json({ error: 'Photo not found.' }, { status: 404 })
    const photos = await updatePhotoMetadata(name, level === null
      ? { level: null }
      : { level: level as number, disliked: null, ...(typeof subject === 'string' ? { subject } : {}) })
    const ratings = photos.filter((photo) => photo.level !== undefined).map(({ name: photoName, level: photoLevel }) => ({ name: photoName, level: photoLevel }))
    return Response.json({ ratings })
  } catch (error) {
    console.error('Could not save photo rating:', error)
    return Response.json({ error: 'Could not save photo rating.' }, { status: 500 })
  }
}
