import { Link } from 'react-router-dom'
import { GapValue, MockBadge, NotReady } from '@/components/fg/Gap'
import { GallerySection } from '@/dev/gallery/GallerySection'
import { useGap, useGapMode } from '@/lib/useGap'

export function GapGallery() {
  const mode = useGapMode()
  const sample = useGap(
    'stock-quote-ext',
    import.meta.env.DEV ? () => import('@/dev/fixtures/gallery').then((m) => m.galleryFixture) : null,
  )
  return (
    <GallerySection title="데이터 갭">
      <div className="fg-gal__row">
        <span>
          지금 모드 <b>{mode === 'mock' ? '목업' : '준비 중'}</b>
        </span>
        <Link to="/dev/fg?gaps=off">운영 모습 보기</Link>
        <Link to="/dev/fg?gaps=on">목업 보기</Link>
      </div>
      <div className="fg-gal__row">
        <span>
          52주 최고 대비 <GapValue gap="stock-quote-ext" mock={sample.status === 'mock' ? sample.data.gapFromHigh : null} />
        </span>
        <span>
          대표 이슈 <GapValue gap="theme-issue" mock={sample.status === 'mock' ? sample.data.issueTitle : null} />
        </span>
        {sample.status === 'mock' && <MockBadge />}
      </div>
      <NotReady gap="issues" />
    </GallerySection>
  )
}
