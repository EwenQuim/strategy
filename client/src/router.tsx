import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../generated/routeTree.gen'
import { createCampaignHistory } from './campaignHistory'

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  history: createCampaignHistory(),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
