import { Search, Share2, Star, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChip, FilterChipGroup } from '@/components/fg/FilterChip'
import { IconButton } from '@/components/fg/IconButton'
import { ChangeBadge, PriceChange } from '@/components/fg/PriceChange'
import { HeadingTabs, Segment, UnderlineTabs } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { MoreChip, StockChip } from '@/components/fg/StockChip'
import { GallerySection } from '@/dev/gallery/GallerySection'

type Relation = 'supply' | 'customer' | 'acquire' | 'invest' | 'theme'
type StockTab = 'overview' | 'news' | 'links' | 'finance'
type FeedSort = 'time' | 'cov'

const RELATIONS: readonly { value: Relation; label: string }[] = [
  { value: 'supply', label: '공급' },
  { value: 'customer', label: '고객' },
  { value: 'acquire', label: '인수' },
  { value: 'invest', label: '투자' },
  { value: 'theme', label: '같은 테마' },
]

const STOCK_TABS: readonly { value: StockTab; label: string; count?: number }[] = [
  { value: 'overview', label: '개요' },
  { value: 'news', label: '뉴스·이슈', count: 25 },
  { value: 'links', label: '이어진 기업', count: 8 },
  { value: 'finance', label: '재무·수급' },
]

const FEED_SORTS: readonly { value: FeedSort; label: string }[] = [
  { value: 'time', label: '최신순' },
  { value: 'cov', label: '매체 많은 순' },
]

const HUB_TABS = [
  { key: 'issues', label: '뜨는 이슈', to: '/dev/fg' },
  { key: 'stocks', label: '움직인 종목', to: '/dev/fg?hub=stocks' },
  { key: 'themes', label: '움직인 테마', to: '/dev/fg?hub=themes' },
]

export function BasicsGallery() {
  const [params] = useSearchParams()
  const [relation, setRelation] = useState<Relation>('supply')
  const [tab, setTab] = useState<StockTab>('overview')
  const [sort, setSort] = useState<FeedSort>('time')
  const [starred, setStarred] = useState(false)
  return (
    <>
      <GallerySection title="Button">
        <div className="fg-gal__row">
          <Button variant="primary">관심 종목에 추가</Button>
          <Button variant="secondary">근거 3건 보기</Button>
          <Button variant="tertiary">관계 탐색에서 보기</Button>
          <Button variant="text">원문 보기 ↗</Button>
        </div>
        <div className="fg-gal__row">
          <Button variant="primary" busy>
            저장 중
          </Button>
          <Button variant="primary" disabled>
            로그인
          </Button>
          <Button variant="secondary" size="sm">
            더 보기
          </Button>
          <ButtonLink to="/dev/fg" size="lg">
            링크 버튼
          </ButtonLink>
        </div>
      </GallerySection>
      <GallerySection title="IconButton">
        <div className="fg-gal__row">
          <IconButton label="검색">
            <Search size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <IconButton label="공유">
            <Share2 size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <IconButton
            label={starred ? '관심 해제' : '관심 등록'}
            aria-pressed={starred}
            onClick={() => setStarred((on) => !on)}
          >
            <Star size={20} strokeWidth={1.75} fill={starred ? 'currentColor' : 'none'} aria-hidden="true" />
          </IconButton>
          <IconButton label="닫기" disabled>
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </div>
      </GallerySection>
      <GallerySection title="Badge">
        <div className="fg-gal__row">
          <Badge tone="inferred">AI 추론</Badge>
          <Badge strong>AI 요약</Badge>
          <Badge>직접 언급</Badge>
          <Badge tone="event">수주 이벤트</Badge>
          <Badge>뉴스</Badge>
          <Badge>공시</Badge>
          <Badge>20분 지연</Badge>
          <Badge tone="issue">타임라인 4번째</Badge>
          <Badge strong>새 이슈</Badge>
          <Badge tone="high">52주 신고가</Badge>
          <Badge tone="low">52주 신저가</Badge>
        </div>
      </GallerySection>
      <GallerySection title="StockChip · CompanyLogo">
        <div className="fg-gal__row">
          <StockChip ticker="091230" name="한빛반도체" change={2.31} />
          <StockChip ticker="104830" name="대성화학" change={-0.84} />
          <StockChip ticker="200710" name="누리소재" kind="inferred" />
          <StockChip ticker="131760" name="세진정밀" kind="inferred" />
          <StockChip ticker="091230" name="한빛반도체" change={1.68} withLogo />
          <MoreChip count={3} />
        </div>
        <div className="fg-gal__row">
          <CompanyLogo name="한빛반도체" size={16} />
          <CompanyLogo name="한빛반도체" size={24} />
          <CompanyLogo name="한빛반도체" />
          <CompanyLogo name="한빛반도체" size={40} />
        </div>
      </GallerySection>
      <GallerySection title="PriceChange">
        <PriceChange price={72400} change={1.68} amount={1200} display />
        <div className="fg-gal__row">
          <PriceChange price={18250} change={-0.82} amount={-150} />
          <PriceChange price={5030} change={0} amount={0} basis="15:30 기준 · 장 마감" />
        </div>
        <div className="fg-gal__row">
          <ChangeBadge value={4.12} />
          <ChangeBadge value={-1.05} />
        </div>
      </GallerySection>
      <GallerySection title="FilterChip">
        <FilterChipGroup label="관계 유형" options={RELATIONS} value={relation} onChange={setRelation} />
        <div className="fg-gal__row">
          <FilterChip pressed={false} disabled>
            공시만
          </FilterChip>
          <FilterChip pressed count={3}>
            새 이슈만
          </FilterChip>
        </div>
      </GallerySection>
      <GallerySection title="SegmentedTabs">
        <HeadingTabs label="허브 보기" options={HUB_TABS} current={params.get('hub') ?? 'issues'} />
        <UnderlineTabs label="종목 상세" options={STOCK_TABS} value={tab} onChange={setTab} />
        <Segment label="정렬" options={FEED_SORTS} value={sort} onChange={setSort} />
      </GallerySection>
      <GallerySection title="Skeleton">
        <div className="fg-gal__narrow fg-stack">
          <Skeleton width={120} height={12} />
          <Skeleton width="90%" height={20} />
          <Skeleton width="60%" height={20} />
          <Skeleton height={14} />
          <div className="fg-gal__row">
            <Skeleton width={120} height={32} shape="chip" />
            <Skeleton width={96} height={22} shape="chip" />
          </div>
        </div>
      </GallerySection>
      <GallerySection title="StateBlock">
        <StateBlock
          kind="empty"
          title="아직 연결된 기업이 없어요"
          description="연결 단계를 늘리면 더 먼 관계까지 찾아볼 수 있어요"
          action={<Button size="sm">2단계로 넓히기</Button>}
        />
        <StateBlock
          kind="error"
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요"
          action={<Button size="sm">다시 시도</Button>}
        />
        <StateBlock kind="not-ready" title="오늘 브리핑을 준비하고 있어요" description="평일 19시 이후에 갱신돼요" />
      </GallerySection>
      <GallerySection title="Disclaimer">
        <Disclaimer />
      </GallerySection>
    </>
  )
}
