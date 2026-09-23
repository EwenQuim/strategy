import { createFileRoute, redirect } from '@tanstack/react-router'
import { Briefing } from '../components/Briefing'
import { Game } from '../components/Game'
import { CAMPAIGN_LEVELS, isLevelUnlocked } from '../lib/campaign'
import { readCampaignProgress, recordCampaignVictory } from '../campaignProgress'

export const Route = createFileRoute('/campaign/$level')({
  beforeLoad: ({ params }) => {
    const id = Number(params.level)
    if (
      !/^(?:[1-9]|1[0-9]|20)$/.test(params.level) ||
      !isLevelUnlocked(id, readCampaignProgress())
    )
      throw redirect({ to: '/campaign', replace: true })
    return { level: CAMPAIGN_LEVELS[id - 1] }
  },
  remountDeps: ({ params }) => params.level,
  component: function CampaignBattle() {
    const { level } = Route.useRouteContext()
    return (
      <>
        <Game
          seed={level.seed}
          mode="ai"
          setup={level.setup}
          campaignLevel={level.id}
          onVictory={() => recordCampaignVictory(level.id)}
        />
        <Briefing level={level} />
      </>
    )
  },
})
