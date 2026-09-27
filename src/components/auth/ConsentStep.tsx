import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LEGAL_DOCS } from '@/data/legal'
import {
  CONSENT_ITEMS,
  allConsented,
  fillConsent,
  type ConsentKey,
  type ConsentState,
} from '@/lib/consent'
import { cn } from '@/lib/utils'

interface ConsentStepProps {
  value: ConsentState
  onChange: (next: ConsentState) => void
  onNext: () => void
}

export function ConsentStep({ value, onChange, onNext }: ConsentStepProps) {
  const [expanded, setExpanded] = useState<ConsentKey | null>(null)
  const all = allConsented(value)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (all) onNext()
      }}
      className="flex flex-col gap-5"
    >
      <label
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-xl border bg-muted px-4 py-3.5 transition-colors',
          all ? 'border-primary/40' : 'border-border',
        )}
      >
        <Checkbox
          checked={all}
          onCheckedChange={(checked) => onChange(fillConsent(checked === true))}
          className="size-5 [&_svg]:size-4"
        />
        <span className="text-body font-semibold text-foreground">약관 전체 동의</span>
      </label>

      <ul className="flex flex-col">
        {CONSENT_ITEMS.map((item) => {
          const doc = item.doc ? LEGAL_DOCS[item.doc] : null
          const open = expanded === item.key
          const panelId = `consent-doc-${item.key}`
          return (
            <li key={item.key} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 py-3">
                <Checkbox
                  id={`consent-${item.key}`}
                  checked={value[item.key]}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, [item.key]: checked === true })
                  }
                />
                <label
                  htmlFor={`consent-${item.key}`}
                  className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-1.5 text-body text-foreground"
                >
                  <span className="shrink-0 text-caption font-medium text-primary">필수</span>
                  <span className="break-keep">{item.label}</span>
                </label>
                {doc && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setExpanded(open ? null : item.key)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ChevronDown
                      className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
                      strokeWidth={2}
                    />
                    <span className="sr-only">
                      {doc.title} 내용 {open ? '접기' : '펼치기'}
                    </span>
                  </button>
                )}
              </div>

              {doc && (
                <div
                  id={panelId}
                  aria-hidden={!open}
                  inert={!open}
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="mb-3 rounded-lg border border-border bg-muted/60">
                      <div className="max-h-52 overflow-y-auto px-4 py-3">
                        {doc.articles.map((article) => (
                          <section key={article.heading} className="[&+&]:mt-3">
                            <h3 className="text-caption font-semibold text-foreground">
                              {article.heading}
                            </h3>
                            {article.paragraphs?.map((paragraph) => (
                              <p
                                key={paragraph}
                                className="mt-1 text-caption leading-relaxed text-foreground-secondary break-keep"
                              >
                                {paragraph}
                              </p>
                            ))}
                            {article.items && (
                              <ol className="mt-1 list-decimal space-y-1 pl-4 text-caption leading-relaxed text-foreground-secondary marker:text-muted-foreground">
                                {article.items.map((entry) => (
                                  <li key={entry} className="break-keep">
                                    {entry}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </section>
                        ))}
                      </div>
                      <div className="border-t border-border bg-background px-4 py-2 text-caption">
                        <Link
                          to={`/${doc.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          새 창에서 전문 보기
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Button type="submit" size="lg" disabled={!all} className="h-10 w-full">
        동의하고 계속하기
      </Button>
    </form>
  )
}
