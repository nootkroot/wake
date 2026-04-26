import { FIGMA_ASSETS } from './figma-assets';

export type Severity = 1 | 2 | 3 | 4;

export type Submission = {
  id: string;
  title: string;
  body: string;
  image_url?: string;
  severity: Severity;
  display_score: number;
  vote_count: number;
  tags: string[];
  created_at: string;
};

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: '1',
    title: 'Broken streetlight on 5th Ave',
    body: 'Streetlight has been out for weeks; the corner is unsafe at night.',
    image_url: FIGMA_ASSETS.cardImageStreetlight,
    severity: 3,
    display_score: 45,
    vote_count: 51,
    tags: ['Safety'],
    created_at: '2026-04-05T00:00:00Z',
  },
  {
    id: '2',
    title: 'Pothole on Pike St.',
    body: 'Massive pothole near the intersection has damaged several cars.',
    image_url: FIGMA_ASSETS.cardImagePothole,
    severity: 3,
    display_score: 45,
    vote_count: 49,
    tags: ['Safety'],
    created_at: '2026-04-05T00:00:00Z',
  },
  {
    id: '3',
    title: 'Bus shelter vandalized at 12th',
    body: 'Smashed glass at the 12th & Oak stop; needs immediate cleanup.',
    image_url: FIGMA_ASSETS.cardImageStreetlight,
    severity: 2,
    display_score: 14,
    vote_count: 18,
    tags: ['Transport'],
    created_at: '2026-04-19T00:00:00Z',
  },
  {
    id: '4',
    title: 'Park lighting insufficient',
    body: 'Riverside Park trails go pitch dark after sunset.',
    image_url: FIGMA_ASSETS.cardImagePothole,
    severity: 2,
    display_score: 28,
    vote_count: 32,
    tags: ['Safety'],
    created_at: '2026-04-12T00:00:00Z',
  },
  {
    id: '5',
    title: 'Trash overflow on Main St.',
    body: 'Bins along the commercial strip overflowing every weekend.',
    image_url: FIGMA_ASSETS.cardImageStreetlight,
    severity: 2,
    display_score: 22,
    vote_count: 27,
    tags: ['Sanitation'],
    created_at: '2026-04-15T00:00:00Z',
  },
];

export function getMockSubmissions(): Submission[] {
  return MOCK_SUBMISSIONS;
}

export function severityLabel(s: Severity): string {
  return ['Low', 'Med.', 'High', 'Crit.'][s - 1] + ` -  ${s}/4`;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  const weeks = Math.floor(days / 7);
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'} AGO`;
  if (days >= 1) return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
  return 'TODAY';
}
