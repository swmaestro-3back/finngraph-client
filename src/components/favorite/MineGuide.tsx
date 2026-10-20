import { Check, ChevronRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IconButton } from '@/components/fg/IconButton'
import { GUIDE_STEPS, type GuideStepState } from '@/lib/fg/mineGuide'
import { cn } from '@/lib/utils'

interface MineGuideProps {
  steps: readonly GuideStepState[]
  onClose: () => void
  onCreate: () => void
  onFill: () => void
  onOpen: () => void
}

export function MineGuide({ steps, onClose, onCreate, onFill, onOpen }: MineGuideProps) {
  const done = steps.filter((step) => step.done).length

  const action = (step: GuideStepState) => {
    const label = { star: '종목 찾아보기', folder: '새 테마 만들기', fill: '편집으로 담기', returns: '테마 열어 보기' }[step.key]
    const icon = <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
    if (step.key === 'star') {
      return (
        <Link to="/stocks" className="fg-sdmore fg-mine__guidego">
          {label}
          {icon}
        </Link>
      )
    }
    const run = { folder: onCreate, fill: onFill, returns: onOpen }[step.key]
    return (
      <button type="button" className="fg-sdmore fg-mine__guidego" onClick={run}>
        {label}
        {icon}
      </button>
    )
  }

  return (
    <section className="fg-mine__guide" aria-labelledby="fg-mine-guide">
      <div className="fg-mine__guidehead">
        <h2 id="fg-mine-guide" className="fg-mine__guidetitle">
          나만의 테마 시작하기
        </h2>
        <span className="fg-mine__guidecount fg-num">{`${done} / ${steps.length}`}</span>
        <IconButton label="시작 안내 닫기" title="닫기" className="fg-mine__guideclose" onClick={onClose}>
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </div>
      <span className="fg-mine__guidebar" aria-hidden="true">
        <i style={{ width: `${((done / steps.length) * 100).toFixed(1)}%` }} />
      </span>
      {done === steps.length && (
        <p className="fg-mine__guidedone">시작하기를 모두 마쳤어요. 닫아도 제목 옆 ? 에서 다시 볼 수 있어요</p>
      )}
      <ol className="fg-mine__guidelist">
        {steps.map((step) => (
          <li key={step.key} className={cn('fg-mine__guidestep', step.done && 'is-done')}>
            <span className="fg-mine__guidemark" aria-hidden="true">
              {step.done && <Check size={14} strokeWidth={2.5} />}
            </span>
            <span className="fg-mine__guidetext">
              <b>{GUIDE_STEPS[step.key].title}</b>
              <span>{GUIDE_STEPS[step.key].hint}</span>
              <span className="fg-sr">{step.done ? '완료' : '아직 안 함'}</span>
            </span>
            {!step.done && step.ready && action(step)}
          </li>
        ))}
      </ol>
    </section>
  )
}
