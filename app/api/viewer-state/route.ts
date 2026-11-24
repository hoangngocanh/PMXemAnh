import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { listPublicPhotos } from '../photos/library'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stateFile = path.join(process.cwd(), 'data', 'viewer-state.json')

export async function GET() {
  try {
    const content = await readFile(stateFile, 'utf8')
    const state = JSON.parse(content) as { currentPhoto?: unknown }
    return Response.json({ currentPhoto: typeof state.currentPhoto === 'string' ? state.currentPhoto : null })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Response.json({ currentPhoto: null })
    console.error('Could not read viewer state:', error)
    return Response.json({ error: 'Could not read viewer state.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('currentPhoto' in body) || typeof body.currentPhoto !== 'string') {
      return Response.json({ error: 'Invalid current photo.' }, { status: 400 })
    }

    const available = new Set(await listPublicPhotos())
    if (!available.has(body.currentPhoto)) return Response.json({ error: 'Photo not found.' }, { status: 404 })

    await mkdir(path.dirname(stateFile), { recursive: true })
    await writeFile(stateFile, `${JSON.stringify({ currentPhoto: body.currentPhoto }, null, 2)}\n`, 'utf8')
    return Response.json({ currentPhoto: body.currentPhoto })
  } catch (error) {
    console.error('Could not save viewer state:', error)
    return Response.json({ error: 'Could not save viewer state.' }, { status: 500 })
  }
}
