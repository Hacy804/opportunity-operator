import { readFile } from 'node:fs/promises';

export const OFFICIAL_RULES_URL = 'https://www.wemakedevs.org/hackathons/trueforge';
const fixtureUrl = new URL('../data/bounties.json', import.meta.url);

export async function loadAuthorizedBounties({
  mode = process.env.BOUNTY_FEED_MODE ?? 'live',
  fetchImpl = fetch
} = {}) {
  if (mode === 'fixture') return JSON.parse(await readFile(fixtureUrl, 'utf8'));
  if (mode !== 'live') throw new Error(`Unsupported BOUNTY_FEED_MODE: ${mode}`);
  return fetchOfficialHackathonFeed(fetchImpl);
}

export async function fetchOfficialHackathonFeed(fetchImpl = fetch) {
  const response = await fetchImpl(OFFICIAL_RULES_URL, {
    headers: { 'user-agent': 'opportunity-operator/0.1 (+local hackathon demo)' },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Official feed returned HTTP ${response.status}`);
  const html = await response.text();
  const requiredMarkers = ['The Agent Harness Hackathon', 'August 24', '30, 2026', 'TrueForge'];
  if (!requiredMarkers.every(marker => html.includes(marker))) {
    throw new Error('Official feed did not contain the expected event markers');
  }
  const bestUsePrize = /\$\s*5,000/.test(html) ? 5000 : 0;
  if (!bestUsePrize) throw new Error('Could not verify the advertised Best Use of TrueForge prize value');

  return [{
    id: 'tf-best-use-2026',
    source: 'wemakedevs-official-live',
    sourceType: 'public-web',
    liveVerified: true,
    fetchedAt: new Date().toISOString(),
    title: 'Best Use of TrueForge — Agent Harness Hackathon',
    rewardUsd: bestUsePrize,
    deadline: '2026-08-30T19:00:00Z',
    effortHours: 14,
    winProbability: 0.18,
    strategicReuse: 0.92,
    risk: 0.08,
    url: OFFICIAL_RULES_URL
  }];
}
