import { LEGAL_DOCS, type LegalSlug } from '@/data/legal'

interface LegalPageProps {
  doc: LegalSlug
}

export default function LegalPage({ doc }: LegalPageProps) {
  const current = LEGAL_DOCS[doc]

  return (
    <div className="page-container pt-7 pb-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
          {current.title}
        </h1>
        <p className="mt-3 text-body leading-relaxed text-foreground-secondary break-keep">
          {current.summary}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-caption text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>문서 상태</dt>
            <dd className="font-medium text-foreground">초안</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>시행일</dt>
            <dd className="font-medium text-foreground">미정</dd>
          </div>
        </dl>
        <p className="mt-5 rounded-lg border border-border bg-muted px-4 py-3 text-caption leading-relaxed text-foreground-secondary break-keep">
          이 문서는 정식 공개 전 초안입니다. 확정되면 시행일과 함께 이 페이지에서 공지합니다.
        </p>

        <article className="card-surface mt-6 px-6 py-8 sm:px-9">
          {current.articles.map((article) => (
            <section key={article.heading} className="[&+&]:mt-8">
              <h2 className="text-sm font-semibold text-foreground">{article.heading}</h2>
              {article.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2 text-sm leading-relaxed text-foreground break-keep [text-wrap:pretty]"
                >
                  {paragraph}
                </p>
              ))}
              {article.items && (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-muted-foreground">
                  {article.items.map((item) => (
                    <li key={item} className="break-keep [text-wrap:pretty]">
                      {item}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
