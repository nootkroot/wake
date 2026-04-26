// Figma asset URLs — expire ~7 days from fetch.
// For production, download and serve from /public.
export const FIGMA_ASSETS = {
  neonBgCity:           'https://www.figma.com/api/mcp/asset/384c608c-4c56-414b-8b65-b7ff5c72a065',
  cardImagePothole:     'https://www.figma.com/api/mcp/asset/c4acb6ad-9d52-4b9f-b585-176e84303c28',
  cardImageStreetlight: 'https://www.figma.com/api/mcp/asset/fb5eda5b-8cea-4f25-8a22-e54580c72de2',
  heroBlur:             'https://www.figma.com/api/mcp/asset/24bd3b61-18b2-41ab-9fc2-9760a66a0a8c',
  roundSun:             'https://www.figma.com/api/mcp/asset/7bd40fd9-eb79-4714-a074-39e264ac7059',
} as const;
