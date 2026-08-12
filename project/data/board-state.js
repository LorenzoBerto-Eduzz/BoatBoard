export const boardStateStorageKey = "boatboard.board-state.v6";

export async function loadBoardState() {
  try {
    const response = await fetch("/api/board", { cache: "no-store" });
    if (response.ok) return response.json();
  } catch {
    // Fall through to the browser-local draft when the file service is unavailable.
  }
  try {
    const stored = localStorage.getItem(boardStateStorageKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function reconcileBoardState(savedState, defaultTeams, organization) {
  const colleagueById = new Map(organization.colleagues.map((person) => [person.id, person]));
  const colleaguesByTeam = new Map(organization.teams.map((team) => [team.id, []]));
  organization.colleagues.forEach((person) => colleaguesByTeam.get(person.teamId)?.push(person));
  const hasSavedState = savedState?.version === 1 && savedState.teams;
  const teams = Object.fromEntries(organization.teams.map((team) => {
    const fallback = defaultTeams[team.id];
    const stored = hasSavedState ? savedState.teams[team.id] : null;
    const leader = stored?.leaderId ? colleagueById.get(stored.leaderId) : null;
    const alphabeticalIds = colleaguesByTeam.get(team.id)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((person) => person.id);
    const validIds = new Set(alphabeticalIds);
    const storedOrder = Array.isArray(stored?.profileOrder)
      ? stored.profileOrder.filter((id, index, values) => validIds.has(id) && values.indexOf(id) === index)
      : [];
    const profileOrder = [...storedOrder, ...alphabeticalIds.filter((id) => !storedOrder.includes(id))];
    return [team.id, {
      placed: stored ? stored.placed !== false : false,
      x: Number.isFinite(stored?.x) ? stored.x : fallback.x,
      y: Number.isFinite(stored?.y) ? stored.y : fallback.y,
      rotation: Number.isFinite(stored?.rotation) ? stored.rotation : 0,
      leaderId: leader && leader.teamId !== team.id ? leader.id : null,
      profileOrder,
    }];
  }));
  return { version: 1, teams };
}

export function saveBoardState(state) {
  localStorage.setItem(boardStateStorageKey, JSON.stringify(state));
  fetch("/api/board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  }).catch(() => {});
}
