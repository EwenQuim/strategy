const locales = ['en', 'fr'] as const
type Locale = (typeof locales)[number]

const isLocale = (tag: string): tag is Locale => locales.includes(tag as Locale)

export const locale: Locale =
  navigator.languages.map((tag) => tag.slice(0, 2)).find(isLocale) ?? 'en'

export const t = <Message>(translations: Record<Locale, Message>): Message =>
  translations[locale]

const pluralRules = new Intl.PluralRules(locale)

export const plural = (
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
) => forms[pluralRules.select(count)] ?? forms.other
