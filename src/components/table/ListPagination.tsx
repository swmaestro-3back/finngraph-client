import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { pageBlock } from '@/lib/listParams'
import { cn } from '@/lib/utils'

interface ListPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * 목록 하단 페이지 이동 — 번호는 5개씩 끊어 보인다(1~5, 6~10 …).
 * 이전·다음은 한 페이지씩 움직이고, 묶음 끝을 넘어가면 다음 묶음으로 바뀐다.
 */
export function ListPagination({ page, totalPages, onPageChange, className }: ListPaginationProps) {
  const go = (target: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    onPageChange(target)
  }

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="이전"
            href="#"
            aria-disabled={page === 1}
            className={cn(page === 1 && 'pointer-events-none opacity-50')}
            onClick={go(page - 1)}
          />
        </PaginationItem>
        {pageBlock(page, totalPages).map((n) => (
          <PaginationItem key={n}>
            <PaginationLink href="#" isActive={n === page} onClick={go(n)}>
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            text="다음"
            href="#"
            aria-disabled={page === totalPages}
            className={cn(page === totalPages && 'pointer-events-none opacity-50')}
            onClick={go(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
