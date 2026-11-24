import { listPublicPhotos } from '../photos/library'
import { readPhotoMetadata, writePhotoMetadata } from '../photo-metadata/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const available = new Set(await listPublicPhotos())
    const disliked = (await readPhotoMetadata())
      .filter((photo) => photo.disliked && available.has(photo.name))
      .map((photo) => photo.name)
    return Response.json({ disliked })
  } catch (error) {
    console.error('Could not read disliked photos:', error)
    return Response.json({ error: 'Could not read disliked photos.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('disliked' in body) || !Array.isArray(body.disliked)) {
      return Response.json({ error: 'Invalid dislike list.' }, { status: 400 })
    }

    const available = new Set(await listPublicPhotos())
    const disliked = [...new Set(body.disliked.filter((name): name is string => typeof name === 'string'))]
      .filter((name) => available.has(name))
    const current = await readPhotoMetadata()
    const dislikedSet = new Set(disliked)
    const names = new Set([...current.map((photo) => photo.name), ...disliked])
    const photos = [...names].flatMap((name) => {
      const existing = current.find((photo) => photo.name === name) ?? { name }
      if (dislikedSet.has(name)) {
        const { level: _removedLevel, ...preserved } = existing
        return [{ ...preserved, disliked: true }]
      }
      const { disliked: _removedDislike, ...preserved } = existing
      return preserved.level !== undefined || preserved.subject !== undefined ? [preserved] : []
    })

    await writePhotoMetadata(photos)
    return Response.json({ disliked })
  } catch (error) {
    console.error('Could not save disliked photos:', error)
    return Response.json({ error: 'Could not save disliked photos.' }, { status: 500 })
  }
}
