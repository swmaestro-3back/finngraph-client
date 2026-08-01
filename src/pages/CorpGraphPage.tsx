// 기업 그래프 — 상품/조직 관계 그래프 페이지 (그래프 컴포넌트 미정)
export default function CorpGraphPage() {
  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-[9px]">
          <h1 className="text-[32px] font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
            기업 그래프
          </h1>
          <span className="text-[13px] text-muted-foreground">a</span>
        </div>
      </div>

      <section className="flex min-h-[max(320px,29.167vw)] items-center justify-center overflow-hidden rounded-3xl border border-border">
        <p className="text-[13px] text-muted-foreground">그래프 준비 중입니다.</p>
      </section>
    </div>
  )
}
