import { useRef, useState } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { DataTable, type Column } from '@/components/fg/DataTable'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { SideSheet } from '@/components/fg/SideSheet'
import { Week52Range } from '@/components/fg/Week52Range'
import { GallerySection } from '@/dev/gallery/GallerySection'
import { formatChange } from '@/lib/format'

interface QuoteRow {
  name: string
  price: string
  change: number
  high: string
  gap: string
  value: string
  cap: string
  newHigh?: boolean
}

const QUOTES: QuoteRow[] = [
  { name: '동해전선', price: '23,150', change: 4.12, high: '23,150', gap: '0.0%', value: '1,208억', cap: '8,930억', newHigh: true },
  { name: '한빛반도체', price: '72,400', change: 1.68, high: '74,900', gap: '−3.3%', value: '3,412억', cap: '12.4조' },
  { name: '누리소재', price: '41,050', change: 0.94, high: '46,800', gap: '−12.3%', value: '871억', cap: '2.1조' },
  { name: '세진정밀', price: '9,880', change: 0, high: '15,200', gap: '−35.0%', value: '112억', cap: '3,240억' },
  { name: '대성화학', price: '18,250', change: -0.82, high: '18,400', gap: '−0.8%', value: '540억', cap: '1.6조' },
]

const QUOTE_COLUMNS: Column<QuoteRow>[] = [
  {
    key: 'name',
    header: '종목',
    cell: (row) => (
      <>
        <b>{row.name}</b> {row.newHigh && <Badge tone="high">52주 신고가</Badge>}
      </>
    ),
  },
  { key: 'price', header: '현재가', cell: (row) => row.price },
  { key: 'change', header: '등락률', sort: 'descending', cell: (row) => <ChangeText value={row.change} /> },
  { key: 'high', header: '52주 최고', cell: (row) => row.high },
  { key: 'gap', header: '최고가 대비', cell: (row) => <span className="fg-w52__gap">{row.gap}</span> },
  { key: 'value', header: '거래대금', note: '준비 중', cell: (row) => row.value },
  { key: 'cap', header: '시가총액', cell: (row) => row.cap },
]

interface FinRow {
  item: string
  unit: string
  values: string[]
}

const FIN_ROWS: FinRow[] = [
  { item: '매출액', unit: '조 원', values: ['23.1', '17.2', '21.8', '24.6'] },
  { item: '영업이익', unit: '조 원', values: ['4.8', '−0.4', '2.6', '3.9'] },
  { item: 'EPS(주당순이익)', unit: '원', values: ['6,030', '−1,005', '3,685', '5,094'] },
  { item: 'ROE(자기자본이익률)', unit: '%', values: ['13.6', '−2.2', '8.1', '10.8'] },
  { item: '부채비율', unit: '%', values: ['38.2', '45.6', '41.3', '36.9'] },
]

const FIN_COLUMNS: Column<FinRow>[] = [
  {
    key: 'item',
    header: '항목',
    cell: (row) => (
      <>
        <b>{row.item}</b>
        <small>{row.unit}</small>
      </>
    ),
  },
  ...['2022', '2023', '2024', '2025'].map((year, i) => ({
    key: year,
    header: year,
    cell: (row: FinRow) => row.values[i],
  })),
]

export function CompositeGallery() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  return (
    <>
      <GallerySection title="Week52Range">
        <div className="fg-gal__narrow fg-stack">
          <Week52Range name="한빛반도체" price={72400} high={74900} low={38200} />
          <Week52Range name="동해전선" price={23150} high={23150} low={14020} state="high" />
          <Week52Range name="누리소재" price={41050} high={46800} low={28300} variant="compact" />
          <Week52Range name="세진정밀" price={9880} high={15200} low={9880} state="low" variant="compact" />
        </div>
      </GallerySection>
      <GallerySection title="DataTable">
        <DataTable label="종목 표" columns={QUOTE_COLUMNS} rows={QUOTES} rowKey={(row) => row.name} />
        <DataTable label="재무 지표" columns={FIN_COLUMNS} rows={FIN_ROWS} rowKey={(row) => row.item} variant="financials" />
      </GallerySection>
      <GallerySection title="MemberGate">
        <MemberGate
          subject="이런 기업 9곳"
          scope="공급 5 · 고객 2 · 투자 1 · 같은 테마 1 · 관계 경로와 원문 근거까지 볼 수 있어요"
        />
        <div className="fg-gal__narrow">
          <MemberGate subject="이런 기업 9곳" variant="compact" />
        </div>
      </GallerySection>
      <GallerySection title="SideSheet">
        <div className="fg-gal__row">
          <Button ref={opener} variant="secondary" onClick={() => setSheetOpen(true)}>
            근거 3건 보기
          </Button>
        </div>
        <SideSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          closeLabel="근거 닫기"
          returnFocusRef={opener}
          meta={
            <span className="fg-row">
              <Badge tone="inferred">AI 추론</Badge>
              <span className="fg-caption">근거 3건</span>
            </span>
          }
          title="누리소재는 한빛반도체의 소재 공급사예요"
        >
          <figure className="fg-ev">
            <blockquote className="fg-quote">“누리소재는 한빛반도체 생산라인에 감광액을 공급하는 주요 협력사다.”</blockquote>
            <figcaption className="fg-ev__src">
              <span>예시경제 · 10.01</span>
            </figcaption>
          </figure>
          <p className="fg-caption">{`누리소재 오늘 ${formatChange(0.94)}`}</p>
          <Disclaimer />
        </SideSheet>
      </GallerySection>
    </>
  )
}
