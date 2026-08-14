const maximumSupportedProfiles = 99;
const profileDiameter = 84;
const profileGap = 38;
const bubblePadding = 62;
const centerSpacing = profileDiameter + profileGap;
const arrangementCache = new Map();
const minimumRadiusGrowth = centerSpacing * .015;

function bubblePaddingForCount(count) {
  return Math.min(bubblePadding, 30 + count * 7);
}

function balancedRingCounts(total, ringTotal) {
  const counts = Array(ringTotal).fill(3);
  let remaining = total - ringTotal * 3;

  while (remaining > 0) {
    let selectedRing = 0;
    let selectedRatio = Infinity;
    counts.forEach((count, index) => {
      const ratio = count / (index + 1);
      if (ratio < selectedRatio - 1e-8 ||
          (Math.abs(ratio - selectedRatio) < 1e-8 && index > selectedRing)) {
        selectedRing = index;
        selectedRatio = ratio;
      }
    });
    counts[selectedRing] += 1;
    remaining -= 1;
  }
  return counts;
}

function ringSets(total) {
  const maximumRings = Math.floor(total / 3);
  return Array.from(
    { length: maximumRings },
    (_, index) => balancedRingCounts(total, index + 1),
  );
}

function centeredRingSets(total) {
  if (total === 6) return [[6]];
  if (total < 12) return [];

  const remaining = total - 6;
  const maximumOuterRings = Math.floor(remaining / 3);
  return Array.from(
    { length: maximumOuterRings },
    (_, index) => [6, ...balancedRingCounts(remaining, index + 1)],
  );
}

function createConcentricCandidate(ringCounts, hasCenter) {
  const positions = hasCenter ? [{ x: 0, y: 0 }] : [];
  const ringRadii = [];
  let previousRadius = hasCenter ? 0 : null;

  ringCounts.forEach((count, ringIndex) => {
    const tangentialRadius = centerSpacing / (2 * Math.sin(Math.PI / count));
    const radius = previousRadius === null
      ? tangentialRadius
      : Math.max(tangentialRadius, previousRadius + centerSpacing);
    ringRadii.push(radius);
    const angleOffset = -Math.PI / 2 + (ringIndex % 2 === 1 ? Math.PI / count : 0);

    for (let index = 0; index < count; index += 1) {
      const angle = angleOffset + index * Math.PI * 2 / count;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    previousRadius = radius;
  });

  return {
    contentRadius: previousRadius ?? 0,
    hasCenter,
    positions,
    ringCounts,
    ringRadii,
  };
}

function candidateScore(candidate) {
  if (candidate.positions.length === 1) return 0;

  const nearestDistances = candidate.positions.map((position, index) => {
    let nearest = Infinity;
    candidate.positions.forEach((other, otherIndex) => {
      if (index === otherIndex) return;
      nearest = Math.min(nearest, Math.hypot(position.x - other.x, position.y - other.y));
    });
    return nearest;
  });
  const deviations = nearestDistances.map((distance) => Math.abs(distance - centerSpacing));
  const averageDeviation = deviations.reduce((sum, deviation) => sum + deviation, 0) / deviations.length;
  const maximumDeviation = Math.max(...deviations);
  const centerPenalty = candidate.hasCenter && candidate.ringCounts[0] !== 6 ? 3 : 0;
  const centralHole = candidate.hasCenter
    ? 0
    : Math.max(0, candidate.ringRadii[0] - profileDiameter / 2);

  return candidate.contentRadius
    + averageDeviation * 5
    + maximumDeviation * 1.5
    + centerPenalty
    + centralHole * 10;
}

function buildHarmonicArrangement(count) {
  const alternateArrangements = new Map([
    [11, { hasCenter: false, ringCounts: [3, 8] }],
    [12, { hasCenter: false, ringCounts: [3, 9] }],
    [13, { hasCenter: false, ringCounts: [4, 9] }],
    [25, { hasCenter: false, ringCounts: [4, 8, 13] }],
    [26, { hasCenter: false, ringCounts: [4, 9, 13] }],
    [27, { hasCenter: false, ringCounts: [4, 9, 14] }],
  ]);
  const alternateArrangement = alternateArrangements.get(count);
  const alternateCounts = alternateArrangement?.ringCounts;
  const hasCenter = alternateArrangement?.hasCenter ?? true;
  const estimatedRingTotal = (-1 + Math.sqrt(1 + 4 * (count - 1) / 3)) / 2;
  const ringTotal = Math.max(2, Math.round(estimatedRingTotal));
  const profileTotal = count - 1;
  const weightTotal = ringTotal * (ringTotal + 1) / 2;
  const exactCounts = Array.from(
    { length: ringTotal },
    (_, index) => profileTotal * (index + 1) / weightTotal,
  );
  const ringCounts = alternateCounts
    ? [...alternateCounts]
    : exactCounts.map((value) => Math.max(3, Math.floor(value)));
  let assigned = ringCounts.reduce((sum, value) => sum + value, 0);

  while (!alternateCounts && assigned < profileTotal) {
    let selectedRing = 0;
    let selectedRemainder = -Infinity;
    exactCounts.forEach((value, index) => {
      const remainder = value - ringCounts[index];
      if (remainder > selectedRemainder) {
        selectedRing = index;
        selectedRemainder = remainder;
      }
    });
    ringCounts[selectedRing] += 1;
    assigned += 1;
  }
  while (!alternateCounts && assigned > profileTotal) {
    let selectedRing = ringCounts.length - 1;
    let selectedSurplus = -Infinity;
    ringCounts.forEach((value, index) => {
      const surplus = value - exactCounts[index];
      if (value > 3 && surplus > selectedSurplus) {
        selectedRing = index;
        selectedSurplus = surplus;
      }
    });
    ringCounts[selectedRing] -= 1;
    assigned -= 1;
  }

  const positions = hasCenter ? [{ x: 0, y: 0 }] : [];
  let previousRadius = hasCenter ? 0 : null;
  let contentRadius = 0;
  const radialSpacing = centerSpacing * 1.22;
  ringCounts.forEach((profilesInRing, ringIndex) => {
    const tangentialRadius = centerSpacing * 1.1 / (2 * Math.sin(Math.PI / profilesInRing));
    const radius = previousRadius === null
      ? tangentialRadius
      : Math.max(tangentialRadius, previousRadius + radialSpacing);
    const displayRadius = count === 24
      ? radius * .95
      : count === 23 && ringIndex === ringCounts.length - 1
        ? radius * .965
        : radius;
    const angleOffset = -Math.PI / 2
      + (alternateCounts && ringIndex % 2 === 1 ? Math.PI / profilesInRing : 0);
    for (let profileIndex = 0; profileIndex < profilesInRing; profileIndex += 1) {
      const angle = angleOffset + profileIndex * Math.PI * 2 / profilesInRing;
      positions.push({ x: Math.cos(angle) * displayRadius, y: Math.sin(angle) * displayRadius });
    }
    previousRadius = radius;
    contentRadius = displayRadius;
  });

  return {
    bubbleRadius: contentRadius + profileDiameter / 2 + bubblePaddingForCount(count),
    positions,
  };
}

function buildCircularArrangement(count) {
  if (count === 1) {
    return {
      bubbleRadius: profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [{ x: 0, y: 0 }],
    };
  }
  if (count === 2) {
    return {
      bubbleRadius: centerSpacing / 2 + profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [
        { x: -centerSpacing / 2, y: 0 },
        { x: centerSpacing / 2, y: 0 },
      ],
    };
  }
  if (count === 6) {
    const radius = centerSpacing * 1.1;
    return {
      bubbleRadius: radius + profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [{ x: 0, y: 0 }, ...Array.from({ length: 5 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      })],
    };
  }
  if (count === 7) {
    const radius = centerSpacing * .9;
    return {
      bubbleRadius: radius + profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [{ x: 0, y: 0 }, ...Array.from({ length: 6 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      })],
    };
  }
  if (count === 9) {
    const innerRadius = centerSpacing * .58;
    const outerRadius = centerSpacing * 1.52;
    return {
      bubbleRadius: outerRadius + profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [
        ...Array.from({ length: 3 }, (_, index) => {
          const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
          return { x: Math.cos(angle) * innerRadius, y: Math.sin(angle) * innerRadius };
        }),
        ...Array.from({ length: 6 }, (_, index) => {
          const angle = -Math.PI / 2 + Math.PI / 6 + index * Math.PI * 2 / 6;
          return { x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius };
        }),
      ],
    };
  }
  if (count === 10) {
    const innerRadius = centerSpacing * .62;
    const outerRadius = centerSpacing * 1.58;
    return {
      bubbleRadius: outerRadius + profileDiameter / 2 + bubblePaddingForCount(count),
      positions: [
        ...Array.from({ length: 3 }, (_, index) => {
          const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
          return { x: Math.cos(angle) * innerRadius, y: Math.sin(angle) * innerRadius };
        }),
        ...Array.from({ length: 7 }, (_, index) => {
          const angle = -Math.PI / 2 + Math.PI / 7 + index * Math.PI * 2 / 7;
          return { x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius };
        }),
      ],
    };
  }
  if (count >= 11) return buildHarmonicArrangement(count);

  const ringCandidates = ringSets(count)
    .map((ringCounts) => createConcentricCandidate(ringCounts, false));
  const centeredCandidates = [];
  if (count >= 7) {
    const centeredSets = count <= 8 ? ringSets(count - 1) : centeredRingSets(count - 1);
    centeredSets
      .forEach((ringCounts) => centeredCandidates.push(createConcentricCandidate(ringCounts, true)));
  }
  const candidates = count >= 15 && centeredCandidates.length > 0
    ? centeredCandidates
    : [...ringCandidates, ...centeredCandidates];
  const best = candidates.sort((left, right) => candidateScore(left) - candidateScore(right))[0];
  const profileScale = count >= 3 && count <= 5 ? 1.1 : 1;

  return {
    bubbleRadius: best.contentRadius * profileScale + profileDiameter / 2 + bubblePaddingForCount(count),
    positions: best.positions.map((position) => ({
      x: position.x * profileScale,
      y: position.y * profileScale,
    })),
  };
}

export function getProfileArrangement(count) {
  if (!Number.isInteger(count) || count < 1 || count > maximumSupportedProfiles) {
    throw new RangeError(`Profile count must be an integer from 1 to ${maximumSupportedProfiles}.`);
  }
  for (let currentCount = 1; currentCount <= count; currentCount += 1) {
    if (arrangementCache.has(currentCount)) continue;
    const arrangement = buildCircularArrangement(currentCount);
    const currentPadding = bubblePaddingForCount(currentCount);
    const contentRadius = arrangement.bubbleRadius - profileDiameter / 2 - currentPadding;
    const previous = arrangementCache.get(currentCount - 1);
    const previousContentRadius = previous
      ? previous.bubbleRadius - profileDiameter / 2 - bubblePaddingForCount(currentCount - 1)
      : 0;
    const normalizedRadius = currentCount === 1
      ? contentRadius
      : Math.max(contentRadius, previousContentRadius + minimumRadiusGrowth);
    const scale = contentRadius > 0 ? normalizedRadius / contentRadius : 1;
    arrangementCache.set(currentCount, {
      bubbleRadius: normalizedRadius + profileDiameter / 2 + currentPadding,
      positions: arrangement.positions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale,
      })),
    });
  }
  return arrangementCache.get(count);
}

export const profileLayoutConfig = Object.freeze({
  maximumSupportedProfiles,
  profileDiameter,
  profileGap,
  bubblePadding,
});
