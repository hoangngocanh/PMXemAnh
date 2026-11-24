import { listPublicPhotos } from './library'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const photos = await listPublicPhotos()
    return Response.json({ photos })
  } catch (error) {
    console.error('Could not read photos from public:', error)
    return Response.json({ error: 'Không thể đọc thư mục ảnh.' }, { status: 500 })
  }
}
