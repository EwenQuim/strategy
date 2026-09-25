import { createFileRoute, redirect } from '@tanstack/react-router'
import { Briefing } from '../components/Briefing'
import { Game } from '../components/Game'
import { CAMPAIGNS, isLevelUnlocked } from '../lib/campaign'
import { readCampaignProgress, recordCampaignVictory } from '../campaignProgress'

export const Route = createFileRoute('/campaign/$campaign/$level')({
  beforeLoad: ({ params }) => {
    const campaign = CAMPAIGNS.find((pack) => pack.slug === params.campaign)
    if (!campaign) throw redirect({ to: '/', replace: true })
    const id = Number(params.level)
    if (!isLevelUnlocked(campaign, id, readCampaignProgress(campaign.slug)))
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
          difficulty={level.difficulty}
          campaign={campaign}
          campaignLevel={level.id}
          onVictory={() => recordCampaignVictory(campaign.slug, level.id)}
        />
        {level.newElements.length > 0 && <Briefing level={level} />}
      </>
    )
  },
})
