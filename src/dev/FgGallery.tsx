import { BasicsGallery } from '@/dev/gallery/BasicsGallery'
import '@/dev/gallery/gallery.css'

export default function FgGallery() {
  return (
    <div className="fg-main fg-wrap">
      <header className="fg-pagehead">
        <div>
          <h1 className="fg-pagehead__title">컴포넌트 갤러리</h1>
          <p className="fg-pagehead__sub">디자인 시스템 미리보기와 나란히 비교하는 개발 전용 화면이에요</p>
        </div>
      </header>
      <BasicsGallery />
    </div>
  )
}
