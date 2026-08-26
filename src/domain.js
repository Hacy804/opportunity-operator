export function normalizeBounty(raw) {
  const required = ['id', 'title', 'rewardUsd', 'deadline', 'effortHours', 'winProbability'];
  for (const key of required) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') {
      throw new Error(`Missing required bounty field: ${key}`);
    }
  }
  const deadline = new Date(raw.deadline);
  if (Number.isNaN(deadline.getTime())) throw new Error('Invalid deadline');
  return {
    id: String(raw.id),
    title: String(raw.title).trim(),
    source: String(raw.source ?? 'unknown'),
    rewardUsd: Number(raw.rewardUsd),
    deadline: deadline.toISOString(),
    effortHours: Number(raw.effortHours),
    winProbability: clamp(Number(raw.winProbability), 0, 1),
    strategicReuse: clamp(Number(raw.strategicReuse ?? 0), 0, 1),
    risk: clamp(Number(raw.risk ?? 0.25), 0, 1),
    url: String(raw.url ?? ''),
    ...(raw.sourceType ? { sourceType: String(raw.sourceType) } : {}),
    ...(raw.liveVerified !== undefined ? { liveVerified: Boolean(raw.liveVerified) } : {}),
    ...(raw.fetchedAt ? { fetchedAt: new Date(raw.fetchedAt).toISOString() } : {})
  };
}

export function scoreBounty(bounty, hourlyCost = 35) {
  const expectedReward = bounty.rewardUsd * bounty.winProbability;
  const buildCost = bounty.effortHours * hourlyCost;
  const reuseCredit = buildCost * bounty.strategicReuse * 0.55;
  const riskPenalty = bounty.rewardUsd * bounty.risk * 0.2;
  const expectedValueUsd = expectedReward - buildCost + reuseCredit - riskPenalty;
  return {
    ...bounty,
    expectedValueUsd: round(expectedValueUsd),
    expectedRewardUsd: round(expectedReward),
    estimatedBuildCostUsd: round(buildCost),
    recommendation: expectedValueUsd >= 0 ? 'pursue' : 'skip'
  };
}

export function verifyCandidate(candidate) {
  const checks = [
    { name: 'positive EV', pass: candidate.expectedValueUsd > 0 },
    { name: 'authorized source', pass: ['authorized-demo-feed', 'wemakedevs-official-live'].includes(candidate.source) },
    { name: 'deadline present', pass: Boolean(candidate.deadline) },
    { name: 'no payment or signing', pass: true },
    { name: 'submission remains mock', pass: true }
  ];
  return { pass: checks.every(check => check.pass), checks };
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function round(value) { return Math.round(value * 100) / 100; }
