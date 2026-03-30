/**
 * Credit cost configuration per spec Section 4.3
 */

export const CREDIT_COSTS: Record<string, number> = {
  ai_text_generation: 1,
  ai_design_suggestions: 2,
  ai_background_removal: 3,
  ai_image_enhance: 5,
  ai_image_generation: 8,
  ai_full_design: 10,
  ai_video_scene: 15,
}

export function getCreditCost(action: string): number {
  const cost = CREDIT_COSTS[action]
  if (cost === undefined) {
    throw new Error(`Unknown AI action: ${action}`)
  }
  return cost
}

export const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  creator: 500,
  pro: 2000,
  team: 5000,
}

/** Rate limits per minute by tier and endpoint group (spec Section 11.4) */
export const RATE_LIMITS: Record<string, Record<string, number>> = {
  ai_actions: { free: 10, creator: 30, pro: 60, team: 100 },
  template_browse: { free: 60, creator: 120, pro: 120, team: 120 },
  auth: { free: 5, creator: 5, pro: 5, team: 5 },
  template_submit: { free: 5, creator: 20, pro: 20, team: 20 },  // per hour
  asset_export: { free: 20, creator: 60, pro: 120, team: 200 },
}
