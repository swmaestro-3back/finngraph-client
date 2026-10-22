// Lucian UX/UI Prompt #068 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#068
import { useState, type UIEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthCheck } from '@/components/auth/AuthCheck'
import { LEGAL_DOCS } from '@/data/legal'
import {
  CONSENT_ITEMS,
  allConsented,
  fillConsent,
  type ConsentKey,
  type ConsentState,
} from '@/lib/consent'

interface ConsentStepProps {
  value: ConsentState
  onChange: (next: ConsentState) => void
  onNext: () => void
}

function trackReading(event: UIEvent<HTMLDivElement>) {
  const el = event.currentTarget
  const max = el.scrollHeight - el.clientHeight
  el.parentElement?.style.setProperty('--p', String(max > 0 ? el.scrollTop / max : 1))
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
      <label className="fg-cs-all" data-on={all || undefined}>
        <AuthCheck
          size="lg"
          checked={all}
          onCheckedChange={(checked) => onChange(fillConsent(checked))}
        />
        <span>약관 전체 동의</span>
      </label>

      <ul className="fg-cs-list">
        {CONSENT_ITEMS.map((item) => {
          const doc = item.doc ? LEGAL_DOCS[item.doc] : null
          const open = expanded === item.key
          const panelId = `consent-doc-${item.key}`
          return (
            <li key={item.key} className="fg-cs-it">
              <div className="fg-cs-row">
                <AuthCheck
                  id={`consent-${item.key}`}
                  checked={value[item.key]}
                  onCheckedChange={(checked) => onChange({ ...value, [item.key]: checked })}
                />
                <label htmlFor={`consent-${item.key}`} className="fg-cs-lab">
                  <span className="fg-cs-req">필수</span>
                  <span className="break-keep">{item.label}</span>
                </label>
                {doc && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setExpanded(open ? null : item.key)}
                    className="fg-cs-chev"
                  >
                    <ChevronDown className="size-4.5" strokeWidth={2} />
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
                  data-open={open || undefined}
                  className="fg-cs-fold"
                >
                  <div>
                    <div className="fg-cs-doc">
                      <div className="fg-cs-doc__txt" onScroll={trackReading}>
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
                      <span aria-hidden className="fg-cs-doc__bar" />
                      <div className="fg-cs-doc__foot">
                        <Link to={`/${doc.slug}`} target="_blank" rel="noreferrer">
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

      <button type="submit" disabled={!all} className="fg-au-go">
        동의하고 계속하기
      </button>
    </form>
  )
}
