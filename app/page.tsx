'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronLeft, ChevronRight, Heart, ImagePlus, Maximize2, Star, ThumbsDown,
  Minus, Plus, RotateCcw, ZoomIn,
} from 'lucide-react'

type PhotoPayload = { photos: string[]; error?: string }
type SelectionPayload = { selected: string[]; error?: string }
type Rating = { name: string; level: number }
type RatingPayload = { ratings: Rating[]; error?: string }
type DislikePayload = { disliked: string[]; error?: string }
type ViewerStatePayload = { currentPhoto: string | null; error?: string }
type PhotoSubject = { name: string; subject: string }
type SubjectPayload = { subjects: PhotoSubject[]; error?: string }
const SUBJECT_OPTIONS = ['Văn miếu', 'Đèn chùm', 'Piano', 'studio', 'Cổ phục', 'Cầu thang']
const MIN_ZOOM = 0.3
const MAX_ZOOM = 1.5

function photoUrl(name: string) {
  return `/${name.split('/').map(encodeURIComponent).join('/')}`
}

export default function Home() {
  const [photos, setPhotos] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [disliked, setDisliked] = useState<string[]>([])
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [subjectDrafts, setSubjectDrafts] = useState<Record<string, string>>({})
  const [inheritedSubject, setInheritedSubject] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showSelected, setShowSelected] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [focusZoom, setFocusZoom] = useState(1.5)
  const [focusPan, setFocusPan] = useState({ x: 0, y: 0 })
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null)
  const focusImageRef = useRef<HTMLImageElement>(null)

  const visiblePhotos = useMemo(
    () => showSelected ? photos.filter((photo) => selected.includes(photo)) : photos,
    [photos, selected, showSelected],
  )
  const currentPhoto = visiblePhotos[index]
  const currentIsSelected = currentPhoto ? selected.includes(currentPhoto) : false
  const currentSubject = currentPhoto ? subjectDrafts[currentPhoto] ?? subjects[currentPhoto] ?? inheritedSubject : null

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/photos', { cache: 'no-store' }).then((response) => response.json() as Promise<PhotoPayload>),
      fetch('/api/selection', { cache: 'no-store' }).then((response) => response.json() as Promise<SelectionPayload>),
      fetch('/api/ratings', { cache: 'no-store' }).then((response) => response.json() as Promise<RatingPayload>),
      fetch('/api/dislikes', { cache: 'no-store' }).then((response) => response.json() as Promise<DislikePayload>),
      fetch('/api/viewer-state', { cache: 'no-store' }).then((response) => response.json() as Promise<ViewerStatePayload>),
      fetch('/api/subjects', { cache: 'no-store' }).then((response) => response.json() as Promise<SubjectPayload>),
    ]).then(([photoData, selectionData, ratingData, dislikeData, viewerState, subjectData]) => {
      if (!alive) return
      if (photoData.error) setMessage(photoData.error)
      setPhotos(photoData.photos ?? [])
      setSelected(selectionData.selected ?? [])
      setRatings(Object.fromEntries((ratingData.ratings ?? []).map((rating) => [rating.name, rating.level] as const)))
      setDisliked(dislikeData.disliked ?? [])
      setSubjects(Object.fromEntries((subjectData.subjects ?? []).map((entry) => [entry.name, entry.subject] as const)))
      const savedIndex = photoData.photos?.indexOf(viewerState.currentPhoto ?? '') ?? -1
      if (savedIndex >= 0) setIndex(savedIndex)
    }).catch(() => {
      if (alive) setMessage('Không thể tải ảnh. Hãy làm mới trang để thử lại.')
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setZoom(1)
    setFocusZoom(1.5)
    setFocusPan({ x: 0, y: 0 })
  }, [currentPhoto])

  useEffect(() => {
    if (currentPhoto && subjects[currentPhoto]) setInheritedSubject(subjects[currentPhoto])
  }, [currentPhoto, subjects])

  useEffect(() => {
    if (loading || !currentPhoto) return
    const timer = window.setTimeout(() => {
      fetch('/api/viewer-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPhoto }),
      }).catch(() => {})
    }, 150)
    return () => window.clearTimeout(timer)
  }, [currentPhoto, loading])

  const move = useCallback((direction: number) => {
    if (currentSubject) setInheritedSubject(currentSubject)
    setIndex((current) => {
      const count = showSelected ? photos.filter((photo) => selected.includes(photo)).length : photos.length
      return count ? (current + direction + count) % count : 0
    })
  }, [currentSubject, photos, selected, showSelected])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
      if (focusMode && event.key === 'Tab') {
        event.preventDefault()
        move(1)
        return
      }
      if (focusMode && (event.code === 'Space' || event.key === ' ')) {
        event.preventDefault()
        move(-1)
        return
      }
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(MAX_ZOOM, value + 0.1))
      if (event.key === '-') setZoom((value) => Math.max(MIN_ZOOM, value - 0.1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusMode, move])

  async function toggleSelection() {
    if (!currentPhoto || saving) return
    const next = currentIsSelected
      ? selected.filter((photo) => photo !== currentPhoto)
      : [...selected, currentPhoto]
    setSelected(next)
    if (showSelected && currentIsSelected) {
      setIndex((current) => Math.min(current, Math.max(0, next.length - 1)))
    }
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/selection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: next }),
      })
      const data = await response.json() as SelectionPayload
      if (!response.ok) throw new Error(data.error || 'Không thể lưu danh sách.')
      setSelected(data.selected)
      setMessage('Đã lưu danh sách ảnh chọn')
      window.setTimeout(() => setMessage(''), 2400)
    } catch (error) {
      setSelected(selected)
      setMessage(error instanceof Error ? error.message : 'Không thể lưu danh sách.')
    } finally {
      setSaving(false)
    }
  }

  async function saveRating(level: number) {
    if (!currentPhoto || saving) return
    const previousRatings = ratings
    const previousDisliked = disliked
    const subjectToSave = currentSubject
    const nextDisliked = disliked.filter((photo) => photo !== currentPhoto)
    setRatings({ ...ratings, [currentPhoto]: level })
    if (nextDisliked.length !== disliked.length) setDisliked(nextDisliked)
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/ratings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentPhoto, level, ...(subjectToSave ? { subject: subjectToSave } : {}) }),
      })
      const data = await response.json() as RatingPayload
      if (!response.ok) throw new Error(data.error || 'Không thể lưu đánh giá.')
      setRatings(Object.fromEntries(data.ratings.map((rating) => [rating.name, rating.level] as const)))
      if (subjectToSave) setSubjects((current) => ({ ...current, [currentPhoto]: subjectToSave }))
      if (nextDisliked.length !== previousDisliked.length) {
        const dislikeResponse = await fetch('/api/dislikes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disliked: nextDisliked }),
        })
        const dislikeData = await dislikeResponse.json() as DislikePayload
        if (!dislikeResponse.ok) throw new Error(dislikeData.error || 'Could not remove dislike.')
        setDisliked(dislikeData.disliked)
      }
      setMessage('Đã lưu đánh giá ảnh')
      window.setTimeout(() => setMessage(''), 2400)
    } catch (error) {
      setRatings(previousRatings)
      setDisliked(previousDisliked)
      setMessage(error instanceof Error ? error.message : 'Không thể lưu đánh giá.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleDislike() {
    if (!currentPhoto || saving) return
    const previous = disliked
    const previousRatings = ratings
    const turningOn = !disliked.includes(currentPhoto)
    const next = disliked.includes(currentPhoto)
      ? disliked.filter((photo) => photo !== currentPhoto)
      : [...disliked, currentPhoto]
    if (turningOn) {
      const nextRatings = { ...ratings }
      delete nextRatings[currentPhoto]
      setRatings(nextRatings)
    }
    setDisliked(next)
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/dislikes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disliked: next }),
      })
      const data = await response.json() as DislikePayload
      if (!response.ok) throw new Error(data.error || 'Could not save dislike.')
      setDisliked(data.disliked)
      if (turningOn) {
        const ratingResponse = await fetch('/api/ratings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentPhoto, level: null }),
        })
        const ratingData = await ratingResponse.json() as RatingPayload
        if (!ratingResponse.ok) throw new Error(ratingData.error || 'Could not clear photo rating.')
        setRatings(Object.fromEntries(ratingData.ratings.map((rating) => [rating.name, rating.level] as const)))
      }
      setMessage('Dislike saved')
      window.setTimeout(() => setMessage(''), 2400)
    } catch (error) {
      setDisliked(previous)
      setRatings(previousRatings)
      setMessage(error instanceof Error ? error.message : 'Could not save dislike.')
    } finally {
      setSaving(false)
    }
  }

  function selectSubject(subject: string) {
    if (!currentPhoto) return
    setSubjectDrafts((current) => ({ ...current, [currentPhoto]: subject }))
  }

  function changeFilter(next: boolean) {
    if (currentSubject) setInheritedSubject(currentSubject)
    setShowSelected(next)
    setIndex(0)
  }

  function enterFocusMode() {
    setFocusZoom(1.5)
    setFocusPan({ x: 0, y: 0 })
    setFocusMode(true)
  }

  if (focusMode && currentPhoto) {
    return (
      <main
        className="focus-viewer"
        onPointerDown={(event) => {
          if (event.target instanceof Element && event.target.closest('button')) return
          event.currentTarget.setPointerCapture(event.pointerId)
          dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, panX: focusPan.x, panY: focusPan.y }
        }}
        onPointerMove={(event) => {
          const image = focusImageRef.current
          if (!dragOrigin.current || !image?.naturalWidth || !image.naturalHeight) return
          const fitScale = Math.min(
            window.innerWidth / image.naturalWidth,
            window.innerHeight / image.naturalHeight,
          )
          const scaledWidth = image.naturalWidth * fitScale * focusZoom
          const scaledHeight = image.naturalHeight * fitScale * focusZoom
          const panMargin = 180
          const maxX = (scaledWidth + window.innerWidth) / 2 + panMargin
          const maxY = (scaledHeight + window.innerHeight) / 2 + panMargin
          setFocusPan({
            x: Math.max(-maxX, Math.min(maxX, dragOrigin.current.panX + event.clientX - dragOrigin.current.pointerX)),
            y: Math.max(-maxY, Math.min(maxY, dragOrigin.current.panY + event.clientY - dragOrigin.current.pointerY)),
          })
        }}
        onWheel={(event) => {
          if (!event.ctrlKey || event.deltaY === 0) return
          event.preventDefault()
          const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, focusZoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)))
          if (nextZoom === focusZoom) return
          if (nextZoom <= 1) {
            setFocusPan({ x: 0, y: 0 })
          } else {
            const ratio = nextZoom / focusZoom
            const cursorX = event.clientX - window.innerWidth / 2
            const cursorY = event.clientY - window.innerHeight / 2
            let x = cursorX - ratio * (cursorX - focusPan.x)
            let y = cursorY - ratio * (cursorY - focusPan.y)
            const image = focusImageRef.current
            if (image?.naturalWidth && image.naturalHeight) {
              const fitScale = Math.min(
                window.innerWidth / image.naturalWidth,
                window.innerHeight / image.naturalHeight,
              )
              const maxX = (image.naturalWidth * fitScale * nextZoom + window.innerWidth) / 2 + 180
              const maxY = (image.naturalHeight * fitScale * nextZoom + window.innerHeight) / 2 + 180
              x = Math.max(-maxX, Math.min(maxX, x))
              y = Math.max(-maxY, Math.min(maxY, y))
            }
            setFocusPan({ x, y })
          }
          setFocusZoom(nextZoom)
        }}
        onPointerUp={() => { dragOrigin.current = null }}
        onPointerCancel={() => { dragOrigin.current = null }}
      >
        <img
          ref={focusImageRef}
          className="focus-photo is-draggable"
          src={photoUrl(currentPhoto)}
          alt={currentPhoto}
          draggable={false}
          style={{ transform: `translate3d(${focusPan.x}px, ${focusPan.y}px, 0) scale(${focusZoom})` }}
        />
        <div className="focus-controls">
          <div className="focus-actions">
          <span className="focus-photo-counter" aria-live="polite">
            {String(index + 1).padStart(2, '0')} / {String(visiblePhotos.length).padStart(2, '0')}
          </span>
          <span className="focus-zoom-level" aria-live="polite">{Math.round(focusZoom * 100)}%</span>
          <div className="focus-rating" role="group" aria-label="Đánh giá ảnh từ 1 đến 3 sao">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                className={`rating-star ${(ratings[currentPhoto] ?? 0) >= level ? 'active' : ''}`}
                onClick={() => saveRating(level)}
                disabled={saving}
                aria-label={`Đánh giá ${level} sao`}
                aria-pressed={(ratings[currentPhoto] ?? 0) === level}
                title={`${level} sao`}
              >
                <Star size={25} fill={(ratings[currentPhoto] ?? 0) >= level ? 'currentColor' : 'none'} />
              </button>
            ))}
            <span className="rating-value">{ratings[currentPhoto] ? `${ratings[currentPhoto]} sao` : 'Chưa đánh giá'}</span>
          </div>
          <button
            className={`focus-dislike ${disliked.includes(currentPhoto) ? 'active' : ''}`}
            onClick={toggleDislike}
            disabled={saving}
            aria-label={disliked.includes(currentPhoto) ? 'Bỏ dislike ảnh' : 'Dislike ảnh'}
            aria-pressed={disliked.includes(currentPhoto)}
            title={disliked.includes(currentPhoto) ? 'Bỏ dislike' : 'Dislike'}
          >
            <ThumbsDown size={19} />
          </button>
          <button onClick={() => move(1)} disabled={visiblePhotos.length < 2} className="focus-next" aria-label="Ảnh tiếp theo" title="Ảnh tiếp theo">
            <ChevronRight size={21} />
          </button>
          </div>
          <div className="focus-subjects" role="group" aria-label="Chủ đề ảnh">
            {SUBJECT_OPTIONS.map((subject) => (
              <button
                key={subject}
                className={`focus-subject ${currentSubject === subject ? 'active' : ''}`}
                onClick={() => selectSubject(subject)}
                disabled={saving}
                aria-pressed={currentSubject === subject}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ảnh Cưới, trang chủ">
          <span className="brand-mark"><Heart size={17} fill="currentColor" /></span>
          <span className="brand-name">một <b>ngày</b></span>
          <span className="brand-divider" />
          <span className="brand-subtitle">PHOTO REVIEW</span>
        </a>
        <div className="topbar-right">
          <span className="save-indicator"><span className={`save-dot ${saving ? 'is-saving' : ''}`} />{saving ? 'Đang lưu…' : message || 'Đã đồng bộ'}</span>
          <span className="topbar-separator" />
          <span className="topbar-count"><Heart size={15} /> {selected.length} ảnh đã chọn</span>
        </div>
      </header>

      <div className="workspace">
        <section className="viewer-column">
          <div className="heading-row">
            <div>
              <p className="eyebrow">BỘ SƯU TẬP CỦA BẠN</p>
              <h1>Những khoảnh khắc <em>đáng nhớ.</em></h1>
            </div>
            <div className="photo-count"><span className="count-number">{visiblePhotos.length.toString().padStart(2, '0')}</span><span> / {photos.length.toString().padStart(2, '0')} ẢNH</span></div>
          </div>

          <div className="stage-wrap">
            <div
              className="stage"
              onDoubleClick={enterFocusMode}
              onWheel={(event) => {
                if (!event.ctrlKey || !currentPhoto || event.deltaY === 0) return
                event.preventDefault()
                setZoom((value) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value * (event.deltaY < 0 ? 1.12 : 1 / 1.12))))
              }}
            >
              {loading ? (
                <div className="empty-state"><span className="loading-ring" /><p>Đang chuẩn bị bộ ảnh…</p></div>
              ) : currentPhoto ? (
                <>
                  <img className="main-photo" src={photoUrl(currentPhoto)} alt={currentPhoto} style={{ transform: `scale(${zoom})` }} />
                  <button className={`floating-heart ${currentIsSelected ? 'is-selected' : ''}`} onClick={toggleSelection} aria-label={currentIsSelected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'}>
                    <Heart size={19} fill={currentIsSelected ? 'currentColor' : 'none'} />
                  </button>
                  <div className="photo-caption"><span className="caption-indicator" />{currentPhoto}</div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><ImagePlus size={25} /></div>
                  <h2>{showSelected ? 'Chưa có ảnh yêu thích' : 'Bộ ảnh đang chờ bạn'}</h2>
                <p>{showSelected ? 'Hãy chọn vài tấm ảnh để xem lại ở đây.' : <>Thêm ảnh vào thư mục con bất kỳ trong <code>public/</code><br />để bắt đầu xem bộ sưu tập.</>}</p>
                </div>
              )}
              {currentPhoto && <button className="stage-hint" onClick={enterFocusMode}><Maximize2 size={13} /> Xem toàn màn hình</button>}
            </div>

            <div className="stage-toolbar">
              <div className="toolbar-group zoom-tools">
                <button className="icon-button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 0.1))} disabled={!currentPhoto} aria-label="Thu nhỏ"><Minus size={16} /></button>
                <button className="zoom-label" onClick={() => setZoom(1)} disabled={!currentPhoto}>{Math.round(zoom * 100)}%</button>
                <button className="icon-button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 0.1))} disabled={!currentPhoto} aria-label="Phóng to"><Plus size={16} /></button>
                <span className="tool-divider" />
                <button className="icon-button reset-button" onClick={() => setZoom(1)} disabled={!currentPhoto} aria-label="Đặt lại kích thước"><RotateCcw size={15} /></button>
              </div>
              <div className="toolbar-group nav-tools">
                <span className="current-number">{currentPhoto ? (index + 1).toString().padStart(2, '0') : '00'} <i>/</i> {visiblePhotos.length.toString().padStart(2, '0')}</span>
                <button className="nav-button" onClick={() => move(-1)} disabled={visiblePhotos.length < 2} aria-label="Ảnh trước"><ChevronLeft size={19} /></button>
                <button className="nav-button next-button" onClick={() => move(1)} disabled={visiblePhotos.length < 2} aria-label="Ảnh tiếp theo">Tiếp theo <ChevronRight size={17} /></button>
              </div>
            </div>
          </div>

          <div className="selection-callout">
            <span className="callout-heart"><Heart size={16} /></span>
            <span><b>Chọn tấm ảnh bạn yêu thích</b><small>Ảnh đã chọn sẽ được lưu tự động vào danh sách của bạn.</small></span>
            <button onClick={toggleSelection} disabled={!currentPhoto || saving} className={`select-button ${currentIsSelected ? 'selected' : ''}`}>
              {currentIsSelected ? <><Check size={16} /> Đã chọn</> : <><Heart size={16} /> Chọn ảnh này</>}
            </button>
          </div>
        </section>

        <aside className="sidebar">
          <div className="sidebar-head">
            <div><p className="eyebrow">THƯ VIỆN</p><h2>Ảnh của bạn <span>{photos.length}</span></h2></div>
            <button className="filter-button" onClick={() => changeFilter(!showSelected)} title={showSelected ? 'Hiện tất cả ảnh' : 'Chỉ hiện ảnh đã chọn'}><Heart size={16} fill={showSelected ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="filter-tabs">
            <button className={!showSelected ? 'active' : ''} onClick={() => changeFilter(false)}>Tất cả <span>{photos.length}</span></button>
            <button className={showSelected ? 'active' : ''} onClick={() => changeFilter(true)}>Đã chọn <span>{selected.length}</span></button>
          </div>

          {loading ? <div className="thumb-loading">Đang tải thư viện…</div> : visiblePhotos.length ? (
            <div className="thumbnail-grid">
              {visiblePhotos.map((photo, photoIndex) => {
                const isSelected = selected.includes(photo)
                return <button key={photo} className={`thumbnail ${photoIndex === index ? 'active' : ''}`} onClick={() => { if (currentSubject) setInheritedSubject(currentSubject); setIndex(photoIndex) }} aria-label={`Mở ảnh ${photo}`}>
                  <img src={photoUrl(photo)} alt="" loading="lazy" />
                  <span className="thumb-index">{String(photoIndex + 1).padStart(2, '0')}</span>
                  {isSelected && <span className="thumb-heart"><Heart size={12} fill="currentColor" /></span>}
                </button>
              })}
            </div>
          ) : <div className="sidebar-empty"><ImagePlus size={20} /><span>{showSelected ? 'Chưa có ảnh đã chọn' : 'Thư viện chưa có ảnh'}</span></div>}

          <div className="sidebar-footer"><span className="folder-mark">⌘</span><span>Đọc ảnh từ <b>public/</b> và các thư mục con</span></div>
        </aside>
      </div>
      <footer className="page-footer"><span>ĐƯỢC LÀM NÊN TỪ NHỮNG KHOẢNH KHẮC CỦA BẠN</span><span>← → chuyển ảnh <i>·</i> + / − thu phóng</span></footer>
    </main>
  )
}
