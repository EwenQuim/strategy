import { createBrowserHistory } from '@tanstack/react-router'
import {
  TUTORIAL,
  isCampaignUnlocked,
  isLevelUnlocked,
  totalVictories,
  visibleCampaigns,
  type Campaign,
} from './campaign'
import { readCampaignProgress, readClearedLevels } from './campaignProgress'
import { readDeveloperPreview } from './preferences'

type Parent = { href: string; index: number }

declare module '@tanstack/history' {
  interface HistoryState {
    campaignParents?: Parent[]
  }
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '')
const hrefFor = (path: string) => base + path
const pathname = (href: string) => href.split(/[?#]/)[0].replace(/\/$/, '') || '/'

export const campaignMenuTo = () =>
  totalVictories(readCampaignProgress) > 0 ? '/campaign' : '/'

export function campaignReturnTo(campaign: Campaign) {
  return campaign === TUTORIAL
    ? window.history.state?.campaignParents?.some(
        (parent: Parent) => pathname(parent.href) === hrefFor('/campaign'),
      )
      ? '/campaign'
      : '/'
    : '/campaign/$campaign'
}

function parentsFor(href: string): string[] | undefined {
  const path = pathname(href)
  if (path === hrefFor('/campaign'))
    return totalVictories(readCampaignProgress) > 0 ? [hrefFor('/')] : undefined
  const match = path.startsWith(base + '/campaign/')
    ? path.slice(base.length).match(/^\/campaign\/([^/]+)(?:\/([^/]+))?$/)
    : null
  if (!match) return undefined
  let slug: string
  let level: number | undefined
  try {
    slug = decodeURIComponent(match[1])
    level = match[2] === undefined ? undefined : Number(decodeURIComponent(match[2]))
  } catch {
    return undefined
  }
  const developerPreview = readDeveloperPreview()
  const campaign = visibleCampaigns(developerPreview).find((pack) => pack.slug === slug)
  if (!campaign || !isCampaignUnlocked(campaign, readCampaignProgress)) return undefined
  if (level !== undefined) {
    if (!isLevelUnlocked(campaign, level, readClearedLevels(campaign.slug), developerPreview))
      return undefined
  } else if (campaign === TUTORIAL) return undefined
  return [
    hrefFor('/'),
    ...(totalVictories(readCampaignProgress) > 0 ? [hrefFor('/campaign')] : []),
    ...(match[2] && campaign !== TUTORIAL
      ? [hrefFor('/campaign/' + encodeURIComponent(campaign.slug))]
      : []),
  ]
}

export function createCampaignHistory() {
  const history = createBrowserHistory()
  const push = history.push
  const replace = history.replace
  const initial = history.location
  const initialParents = parentsFor(initial.href)
  if (initialParents && !initial.state.campaignParents) {
    const ancestors: Parent[] = []
    for (const [index, href] of [...initialParents, initial.href].entries()) {
      const state = {
        ...(index === initialParents.length ? initial.state : {}),
        campaignParents: [...ancestors],
      }
      if (index === 0) replace(href, state)
      else push(href, state)
      // Each parent must be a real browser entry, not a coalesced history write.
      history.flush()
      ancestors.push({ href, index: history.location.state.__TSR_index })
    }
  }

  history.push = (href, state, options) => {
    const current = history.location
    const currentParents = parentsFor(current.href)
    const ancestors = current.state.campaignParents ?? []
    const parent = ancestors.find((entry) => pathname(entry.href) === pathname(href))
    if (currentParents && parent) {
      history.go(parent.index - current.state.__TSR_index, options)
      return
    }
    const targetParents = parentsFor(href)
    const nextParents = [
      ...ancestors,
      { href: current.href, index: current.state.__TSR_index },
    ].filter((entry) =>
      targetParents?.some((target) => pathname(target) === pathname(entry.href)),
    )
    const navigate = currentParents?.some((target) => pathname(target) === pathname(href))
      ? replace
      : push
    navigate(href, { ...state, campaignParents: nextParents }, options)
  }
  history.replace = (href, state, options) => {
    const targetParents = parentsFor(href)
    const ancestors = history.location.state.campaignParents ?? []
    replace(
      href,
      {
        ...state,
        campaignParents: ancestors.filter((entry) =>
          targetParents?.some((target) => pathname(target) === pathname(entry.href)),
        ),
      },
      options,
    )
  }
  return history
}
