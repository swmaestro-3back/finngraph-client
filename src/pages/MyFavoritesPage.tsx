import { useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { NewsSection } from '@/components/theme/NewsSection'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { FilterChip } from '@/components/ui/filter-chip'
import { Button } from '@/components/ui/button'
import { toNewsItem } from '@/lib/apiMappers'
import type { FavoriteItemRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import { changeColorClass, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { useFavoriteNews } from '@/lib/queries/useFavoriteNews'
import { cn } from '@/lib/utils'

const ROW =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-inset px-4 py-2.5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_88px_76px]'

const KIND_LABEL: Record<FavoriteItemRes['type'], string> = {
  STOCK: '종목',
  THEME: '테마',
}

type FavoriteTab = 'list' | 'news'

export default function MyFavoritesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<FavoriteTab>('list')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const { items, count, limit, ready, error: listError, refresh } = useFavorites()
  // 뉴스 탭을 열기 전에는 호출하지 않는다 — 관심 종목이 많으면 IN 절이 커진다
  const {
    data: newsDetails,
    loading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useFavoriteNews(tab === 'news')
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  const retryList = () => {
    void refresh().catch(() => {})
  }

  const listSkeleton = (
    <div className="card-surface overflow-hidden p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mb-2 h-8 animate-pulse rounded bg-muted" />
      ))}
    </div>
  )

  const failure = (message: string, retry: () => void) => (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <CircleAlert className="size-8 text-muted-foreground" />
      <p className="text-body text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RotateCw data-icon="inline-start" />
        다시 시도
      </Button>
    </div>
  )

  const renderRow = (item: FavoriteItemRes) => {
    const to = item.type === 'STOCK' ? `/stock/${item.key}` : `/theme/${item.key}`
    const name = item.stock?.name ?? item.theme?.name ?? item.key
    const change = item.stock?.change ?? item.theme?.change ?? null
    const open = () => navigate(to)

    return (
      <div
        key={`${item.type}:${item.key}`}
        {...(item.resolved && {
          role: 'link',
          tabIndex: 0,
          onClick: open,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.target !== event.currentTarget) return
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            open()
          },
        })}
        className={cn(
          ROW,
          item.resolved &&
            'cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2',
        )}
      >
        <FavoriteStar type={item.type} targetKey={item.key} label={name} size="sm" />
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-surface-inset px-1.5 py-0.5 text-micro tracking-[0.4px] text-foreground-secondary">
            {KIND_LABEL[item.type]}
          </span>
          {item.resolved ? (
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          ) : (
            <span className="truncate text-sm text-muted-foreground">
              {item.key} · 더 이상 제공되지 않는 대상이에요
            </span>
          )}
        </span>
        {item.resolved && (
          <span className="flex flex-col items-end gap-0.5 sm:contents">
            {item.stock ? (
              <span className="text-right font-mono text-sm font-medium text-foreground">
                {formatPriceOrDash(item.stock.price)}
              </span>
            ) : (
              <span className="text-right text-caption text-muted-foreground">
                종목 {item.theme?.stockCount ?? 0}개
              </span>
            )}
            <span
              className={cn(
                'text-right font-mono text-sm font-medium',
                changeColorClass(change ?? 0),
              )}
            >
              {formatChangeOrDash(change)}
            </span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-[9px] flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">관심</h2>
        <div className="flex gap-1.5">
          <FilterChip active={tab === 'list'} onClick={() => setTab('list')}>
            목록{ready && ` ${count}/${limit}`}
          </FilterChip>
          <FilterChip active={tab === 'news'} onClick={() => setTab('news')}>
            뉴스
          </FilterChip>
        </div>
      </div>

      {tab === 'list' &&
        (listError ? (
          failure('관심 목록을 불러오지 못했습니다.', retryList)
        ) : !ready ? (
          listSkeleton
        ) : items.length === 0 ? (
          <div className="card-surface flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-body text-foreground">아직 담은 관심이 없어요</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/stocks">종목 목록에서 찾아보기</Link>
            </Button>
          </div>
        ) : (
          <div className="card-surface overflow-hidden">{items.map(renderRow)}</div>
        ))}

      {tab === 'news' &&
        (newsError ? (
          failure('관심종목 뉴스를 불러오지 못했습니다.', refetchNews)
        ) : newsLoading ? (
          <div className="card-surface overflow-hidden p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="mb-2 h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="card-surface flex flex-col items-center justify-center gap-1 py-12">
            <p className="text-body text-foreground">관심종목 뉴스가 아직 없어요</p>
            <p className="text-caption text-muted-foreground">
              관심 종목을 담으면 관련 기사가 모입니다
            </p>
          </div>
        ) : (
          <NewsSection
            title="관심종목 뉴스"
            items={news}
            onItemClick={(item) => setOpenNewsId(item.id)}
          />
        ))}

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />
    </div>
  )
}
