import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { listPublicPhotos } from '../photos/library'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const selectionFile = path.join(process.cwd(), 'data', 'selected-images.json')
export async function GET() {
  try {
    const content = await readFile(selectionFile, 'utf8')
    return Response.json(JSON.parse(content))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return Response.json({ selected: [] })
    }
    console.error('Could not read selected images:', error)
    return Response.json({ error: 'Không thể đọc danh sách ảnh đã chọn.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    const selected =
      typeof body === 'object' && body !== null && 'selected' in body && Array.isArray(body.selected)
        ? body.selected.filter((name): name is string => typeof name === 'string')
        : null

    if (!selected) {
      return Response.json({ error: 'Danh sách ảnh không hợp lệ.' }, { status: 400 })
    }

    const uniqueNames = [...new Set(selected)]
    const available = new Set(await listPublicPhotos())
    const validNames = uniqueNames.filter((name) => available.has(name))

    await mkdir(path.dirname(selectionFile), { recursive: true })
    await writeFile(selectionFile, `${JSON.stringify({ selected: validNames }, null, 2)}\n`, 'utf8')

    return Response.json({ selected: validNames })
  } catch (error) {
    console.error('Could not save selected images:', error)
    return Response.json({ error: 'Không thể lưu danh sách ảnh đã chọn.' }, { status: 500 })
  }
}
