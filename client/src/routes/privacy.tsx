import { createFileRoute } from '@tanstack/react-router'
import { MenuLayout } from '../components/MenuLayout'
import { menuCardClassName } from '../components/styles'
import * as p from '../i18n/privacy'

export const Route = createFileRoute('/privacy')({
  component: function Privacy() {
    return (
      <MenuLayout title={p.title}>
        <div className={menuCardClassName + ' flex flex-col gap-5 p-4 min-[900px]:p-6'}>
          <p className="text-xs text-muted">{p.updated}</p>
          {p.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="text-base">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </MenuLayout>
    )
  },
})
