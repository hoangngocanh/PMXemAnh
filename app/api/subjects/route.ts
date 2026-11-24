import { listPublicPhotos } from '../photos/library'
import { PHOTO_SUBJECTS, readPhotoMetadata, updatePhotoMetadata } from '../photo-metadata/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PhotoSubject = { name: string; subject: string }

export async function GET() {
  try {
    const available = new Set(await listPublicPhotos())
    const subjects = (await readPhotoMetadata())
      .filter((photo) => photo.subject !== undefined && available.has(photo.name))
      .map(({ name, subject }) => ({ name, subject: subject as string }))
    return Response.json({ subjects })
  } catch (error) {
    console.error('Could not read photo subjects:', error)
    return Response.json({ error: 'Could not read photo subjects.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('name' in body) || !('subject' in body)) {
      return Response.json({ error: 'Invalid photo subject.' }, { status: 400 })
    }
    const { name, subject } = body
    if (typeof name !== 'string' || typeof subject !== 'string' || !PHOTO_SUBJECTS.has(subject)) {
      return Response.json({ error: 'Choose one of the available subjects.' }, { status: 400 })
    }

    const available = new Set(await listPublicPhotos())
    if (!available.has(name)) return Response.json({ error: 'Photo not found.' }, { status: 404 })
    const photos = await updatePhotoMetadata(name, { subject })
    const subjects: PhotoSubject[] = photos
      .filter((photo) => photo.subject !== undefined)
      .map(({ name: photoName, subject: photoSubject }) => ({ name: photoName, subject: photoSubject as string }))
    return Response.json({ subjects })
  } catch (error) {
    console.error('Could not save photo subject:', error)
    return Response.json({ error: 'Could not save photo subject.' }, { status: 500 })
  }
}
