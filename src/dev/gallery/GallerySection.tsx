import type { ReactNode } from 'react'

interface GallerySectionProps {
  title: string
  children: ReactNode
}

export function GallerySection({ title, children }: GallerySectionProps) {
  return (
    <section className="fg-section">
      <h2 className="fg-section__title">{title}</h2>
      <div className="fg-gal">{children}</div>
    </section>
  )
}
