import { Link } from 'react-router-dom'
import { GapValue, MockBadge, NotReady } from '@/components/fg/Gap'
import { GallerySection } from '@/dev/gallery/GallerySection'
import { useGap, useGapMode } from '@/lib/useGap'

export function GapGallery() {
  const mode = useGapMode()
  const quote = useGap(
    'investor-flow-amount',
    import.meta.env.DEV ? () => import('@/dev/fixtures/gallery').then((m) => m.galleryFixture.flowAmount) : null,
  )
  const issue = useGap(
    'issue-timeline',
    import.meta.env.DEV ? () => import('@/dev/fixtures/gallery').then((m) => m.galleryFixture.flowTitle) : null,
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
          외국인 순매수 <GapValue gap="investor-flow-amount" mock={quote.status === 'mock' ? quote.data : null} />
        </span>
        <span>
          이어진 흐름 <GapValue gap="issue-timeline" mock={issue.status === 'mock' ? issue.data : null} />
        </span>
        <span>
          문구형 <GapValue gap="issue-timeline" label="이슈 흐름 준비 중" />
        </span>
        {(quote.status === 'mock' || issue.status === 'mock') && <MockBadge />}
      </div>
      <NotReady gap="issues" />
    </GallerySection>
  )
}
