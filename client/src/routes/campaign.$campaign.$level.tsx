import { createFileRoute, redirect } from '@tanstack/react-router'
import { Briefing } from '../components/Briefing'
import { Game } from '../components/Game'
import { isCampaignUnlocked, visibleCampaigns, isLevelUnlocked } from '../lib/campaign'
import {
  readCampaignProgress,
  readClearedLevels,
  recordCampaignVictory,
} from '../campaignProgress'
import { readDeveloperPreview } from '../preferences'

export const Route = createFileRoute('/campaign/$campaign/$level')({
  beforeLoad: ({ params }) => {
    const developerPreview = readDeveloperPreview()
    const campaign = visibleCampaigns(developerPreview).find(
      (pack) => pack.slug === params.campaign,
    )
    if (!campaign) throw redirect({ to: '/', replace: true })
    if (!isCampaignUnlocked(campaign, readCampaignProgress))
      throw redirect({ to: '/campaign', replace: true })
    const id = Number(params.level)
    if (!isLevelUnlocked(campaign, id, readClearedLevels(campaign.slug), developerPreview))
      throw redirect({
        to: '/campaign/$campaign',
        params: { campaign: campaign.slug },
        replace: true,
      })
    return { campaign, level: campaign.levels[id - 1] }
  },
  remountDeps: ({ params }) => [params.campaign, params.level],
  component: function CampaignBattle() {
    const { campaign, level } = Route.useRouteContext()
    return (
      <>
        <Game
          seed={level.seed}
          mode="ai"
          setup={level.setup}
          bot={{ name: 'depthsearch', difficulty: level.difficulty }}
          campaign={campaign}
          campaignLevel={level.id}
          onVictory={() => recordCampaignVictory(campaign.slug, level.id)}
        />
        {level.newElements.length > 0 && <Briefing level={level} />}
      </>
    )
  },
})
