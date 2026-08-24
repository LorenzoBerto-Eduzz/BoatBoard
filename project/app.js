import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260808-50";
import {
  boardStateStorageKey,
  loadBoardState,
  reconcileBoardState,
  saveBoardState,
} from "./data/board-state.js?v=boatboard-20260809-91";
import { getProfileArrangement, profileLayoutConfig } from "./layout/profile-arrangements.js?v=boatboard-20260812-112";
import { loadRuntimeContext } from "./data/runtime-source.js?v=boatboard-20260821-153";
import { compactPopupLayoutMedia, compactTouchUiMedia } from "./responsive-layout.js?v=boatboard-20260824-1";

const board = document.querySelector(".board");
const brandCompany = document.querySelector(".brand-company");
const brandRuntime = document.querySelector(".brand-runtime");
const canvas = document.querySelector(".organization-canvas");
const editorPanel = document.querySelector(".editor-panel");
const context = canvas.getContext("2d", { alpha: true });
const isEditorPage = document.body.classList.contains("editor-page");
const runtimeContext = await loadRuntimeContext();
let editActive = document.body.classList.contains("editor-mode");
const organization = await loadOrganization();
const teamGap = 12;
const teamColumns = Math.max(1, Math.ceil(Math.sqrt(organization.teams.length)));
const teamRows = Math.max(1, Math.ceil(organization.teams.length / teamColumns));
const camera = { scale: 1, x: 0, y: 0 };
const targetCamera = { scale: 1, x: 0, y: 0 };
const viewport = { width: 0, height: 0, fitScale: 1, sceneLeft: 0, sceneTop: 0 };
function setStableMobileViewportHeight() {
  if (compactTouchUiMedia.matches) {
    document.documentElement.style.setProperty("--stable-mobile-height", `${innerHeight}px`);
    document.documentElement.style.setProperty("--compact-team-sheet-height", `${Math.round(innerHeight * .38)}px`);
  } else {
    document.documentElement.style.removeProperty("--stable-mobile-height");
    document.documentElement.style.removeProperty("--compact-team-sheet-height");
  }
}
setStableMobileViewportHeight();
const teamCacheResolutionScale = .4;
const teamDetailSwitchScale = .24;
let frameRequested = false;
let interaction = null;
const touchPointers = new Map();
let ignoreNextContextMenu = false;
let cameraEase = .24;
let initialFitApplied = false;
let fittedOverviewCameraScale = 1;
let lastPublishedLineZoom = null;
const connectionLineTuning = {
  minZoom: .5,
  maxZoom: 3,
  minWidth: 1.05,
  maxWidth: 2.45,
};
let selectedProfileId = null;
let selectedTeamId = null;
const selectedBubbleIds = new Set();
let previewProfileId = null;
let hoverCandidateId = null;
let hoverTimer = null;
let organizationRefreshVersion = 0;
const fallbackProfileColors = [
  ["#e4bd5e", "#8f6424"], ["#f0d968", "#a48727"], ["#5c86b9", "#2b456f"],
  ["#78c8df", "#367c9d"], ["#df817d", "#944a50"], ["#7bc27a", "#3d7b48"],
  ["#60966a", "#2c5939"], ["#62b9ad", "#33766f"], ["#de9462", "#965334"],
  ["#a78ac8", "#654d8d"], ["#dc87ad", "#914e73"], ["#8299c9", "#465d8e"],
];

if (!editActive) {
  addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { capture: true, passive: false });
  addEventListener("gesturestart", (event) => event.preventDefault(), { capture: true, passive: false });
  addEventListener("gesturechange", (event) => event.preventDefault(), { capture: true, passive: false });
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function updateBrandHeader() {
  const isDevelopment = runtimeContext.mode === "development";
  brandRuntime.hidden = !isDevelopment;
  fitCompactBrandTitle();
}

function fitCompactBrandTitle() {
  brandCompany.style.removeProperty("font-size");
  if (!compactPopupLayoutMedia.matches) return;
  requestAnimationFrame(() => {
    const availableWidth = brandCompany.parentElement?.clientWidth ?? 0;
    if (!availableWidth || brandCompany.scrollWidth <= availableWidth) return;
    const maximumSize = parseFloat(getComputedStyle(brandCompany).fontSize);
    const fittedSize = Math.max(10, maximumSize * availableWidth / brandCompany.scrollWidth);
    brandCompany.style.fontSize = `${fittedSize}px`;
  });
}

function arrangementForCount(count) {
  return count === 0
    ? { bubbleRadius: profileLayoutConfig.bubblePadding, positions: [] }
    : getProfileArrangement(count);
}

const membersByTeam = new Map(organization.teams.map((team) => [team.id, []]));
organization.colleagues.forEach((person) => membersByTeam.get(person.teamId)?.push(person));
const largestTeamRadius = organization.teams.length > 0
  ? Math.max(...organization.teams.map((team) =>
    arrangementForCount(membersByTeam.get(team.id).length).bubbleRadius))
  : 0;
const teamCellSize = largestTeamRadius * 2 + teamGap;
const logicalSceneSize = Math.max(1320, teamCellSize * Math.max(teamColumns, teamRows) + teamGap * 2);

const renderedTeams = organization.teams.map((team, index) => {
  const arrangement = arrangementForCount(membersByTeam.get(team.id).length);
  const alphabeticalMembers = [...membersByTeam.get(team.id)]
    .sort((left, right) => left.name.localeCompare(right.name));
  const column = index % teamColumns;
  const row = Math.floor(index / teamColumns);
  return {
    ...team,
    radius: arrangement.bubbleRadius,
    positions: arrangement.positions,
    defaultX: (column + .5) * logicalSceneSize / teamColumns,
    defaultY: (row + .5) * logicalSceneSize / teamRows,
    profiles: alphabeticalMembers.map((profile, slotIndex) => ({
      ...profile,
      slotIndex,
    })),
  };
});

const teamsById = new Map(renderedTeams.map((team) => [team.id, team]));
const profilesById = new Map(renderedTeams.flatMap((team) =>
  team.profiles.map((profile) => [profile.id, { profile, team }])));
const defaultTeamStates = Object.fromEntries(renderedTeams.map((team) => [team.id, {
  x: team.defaultX,
  y: team.defaultY,
}]));
const boardState = reconcileBoardState(await loadBoardState(), defaultTeamStates, organization);

renderedTeams.forEach((team) => {
  const order = boardState.teams[team.id].profileOrder;
  team.profiles.forEach((profile) => { profile.slotIndex = order.indexOf(profile.id); });
});

await Promise.all(renderedTeams.flatMap((team) => team.profiles.map(async (profile) => {
  if (!profile.imageUrl) return;
  const image = new Image();
  image.decoding = "async";
  image.src = profile.imageUrl;
  try {
    await image.decode();
    profile.imageElement = image;
  } catch {
    profile.imageElement = null;
  }
})));

function profileSlotPosition(team, profile) {
  return rotateProfilePosition(team.positions[profile.slotIndex], teamState(team).rotation);
}

function rotateProfilePosition(position, degrees = 0) {
  if (!degrees) return position;
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: position.x * cosine - position.y * sine,
    y: position.x * sine + position.y * cosine,
  };
}

function createTeamBitmap(team) {
  const diameter = team.radius * 2;
  const bitmap = document.createElement("canvas");
  bitmap.width = Math.ceil(diameter * teamCacheResolutionScale);
  bitmap.height = Math.ceil(diameter * teamCacheResolutionScale);
  const bitmapContext = bitmap.getContext("2d", { alpha: true });
  bitmapContext.scale(teamCacheResolutionScale, teamCacheResolutionScale);
  const center = team.radius;
  const bubbleGradient = bitmapContext.createRadialGradient(center, center, 0, center, center, team.radius);
  bubbleGradient.addColorStop(0, "rgba(126, 154, 167, .024)");
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 42) / team.radius), "rgba(126, 154, 167, .03)");
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 25) / team.radius), "rgba(119, 151, 166, .038)");
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 3) / team.radius), "rgba(154, 181, 192, .125)");
  bubbleGradient.addColorStop(1, "rgba(170, 194, 203, .19)");
  bitmapContext.fillStyle = bubbleGradient;
  bitmapContext.beginPath();
  bitmapContext.arc(center, center, team.radius, 0, Math.PI * 2);
  bitmapContext.fill();
  const profileRadius = profileLayoutConfig.profileDiameter / 2;
  team.profiles.forEach((profile) => {
    const position = profileSlotPosition(team, profile);
    const x = center + position.x;
    const y = center + position.y;
    bitmapContext.save();
    bitmapContext.beginPath();
    bitmapContext.arc(x, y, profileRadius, 0, Math.PI * 2);
    bitmapContext.clip();
    if (profile.imageElement) {
      bitmapContext.drawImage(profile.imageElement, x - profileRadius, y - profileRadius, profileRadius * 2, profileRadius * 2);
    } else {
      const gradient = bitmapContext.createLinearGradient(x - profileRadius, y - profileRadius, x + profileRadius, y + profileRadius);
      const colors = profile.colors ?? fallbackProfileColors[0];
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      bitmapContext.fillStyle = gradient;
      bitmapContext.fillRect(x - profileRadius, y - profileRadius, profileRadius * 2, profileRadius * 2);
    }
    bitmapContext.restore();
    bitmapContext.beginPath();
    bitmapContext.arc(x, y, profileRadius, 0, Math.PI * 2);
    bitmapContext.strokeStyle = "rgba(13, 21, 26, .9)";
    bitmapContext.lineWidth = 1;
    bitmapContext.stroke();
    if (!profile.imageElement) {
      bitmapContext.fillStyle = "rgba(255, 255, 255, .92)";
      bitmapContext.font = `700 ${profileRadius * .92}px Inter, ui-sans-serif, system-ui, sans-serif`;
      bitmapContext.textAlign = "center";
      bitmapContext.textBaseline = "middle";
      bitmapContext.fillText(initials(profile.name), x, y + profileRadius * .04);
    }
  });
  return bitmap;
}

renderedTeams.forEach((team) => { team.bitmap = createTeamBitmap(team); });

async function refreshOrganization(nextOrganization) {
  const refreshVersion = ++organizationRefreshVersion;
  const normalizedOrganization = {
    ...nextOrganization,
    teams: [...nextOrganization.teams],
    colleagues: nextOrganization.colleagues.map((person, index) => ({
      ...person,
      colors: person.colors ?? fallbackProfileColors[index % fallbackProfileColors.length],
    })),
  };
  const columns = Math.max(1, Math.ceil(Math.sqrt(normalizedOrganization.teams.length)));
  const rows = Math.max(1, Math.ceil(normalizedOrganization.teams.length / columns));
  const members = new Map(normalizedOrganization.teams.map((team) => [team.id, []]));
  normalizedOrganization.colleagues.forEach((person) => members.get(person.teamId)?.push(person));
  const refreshed = normalizedOrganization.teams.map((team, index) => {
    const arrangement = arrangementForCount(members.get(team.id).length);
    return {
      ...team,
      radius: arrangement.bubbleRadius,
      positions: arrangement.positions,
      defaultX: (index % columns + .5) * logicalSceneSize / columns,
      defaultY: (Math.floor(index / columns) + .5) * logicalSceneSize / rows,
      profiles: [...members.get(team.id)].sort((a, b) => a.name.localeCompare(b.name))
        .map((profile, slotIndex) => ({ ...profile, slotIndex })),
    };
  });
  const defaults = Object.fromEntries(refreshed.map((team) => [team.id, { x: team.defaultX, y: team.defaultY }]));
  const reconciled = reconcileBoardState(boardState, defaults, normalizedOrganization);
  const replacementProfiles = new Map(refreshed.flatMap((team) => team.profiles.map((profile) => [profile.id, profile])));
  renderedTeams.forEach((team) => {
    // Retain decoded images while a colleague's unrelated text fields are edited.
    team.profiles.forEach((profile) => {
      const replacement = replacementProfiles.get(profile.id);
      if (replacement && replacement.imageUrl === profile.imageUrl) replacement.imageElement = profile.imageElement;
    });
  });
  const refreshedProfilesById = new Map();
  refreshed.forEach((team) => {
    const order = reconciled.teams[team.id].profileOrder;
    team.profiles.forEach((profile) => {
      profile.slotIndex = order.indexOf(profile.id);
      refreshedProfilesById.set(profile.id, { profile, team });
    });
  });
  await Promise.all(refreshed.flatMap((team) => team.profiles.map(async (profile) => {
    if (!profile.imageUrl || profile.imageElement) return;
    const image = new Image();
    image.decoding = "async";
    image.src = profile.imageUrl;
    try { await image.decode(); profile.imageElement = image; } catch { profile.imageElement = null; }
  })));
  refreshed.forEach((team) => { team.bitmap = createTeamBitmap(team); });
  if (refreshVersion !== organizationRefreshVersion) return;
  organization.companyName = normalizedOrganization.companyName;
  organization.pageTitle = normalizedOrganization.pageTitle;
  organization.teams = normalizedOrganization.teams;
  organization.colleagues = normalizedOrganization.colleagues;
  Object.keys(boardState).forEach((key) => delete boardState[key]);
  Object.assign(boardState, reconciled);
  renderedTeams.splice(0, renderedTeams.length, ...refreshed);
  teamsById.clear();
  refreshed.forEach((team) => teamsById.set(team.id, team));
  profilesById.clear();
  refreshedProfilesById.forEach((value, key) => profilesById.set(key, value));
  [...selectedBubbleIds].forEach((teamId) => {
    if (!teamsById.has(teamId)) selectedBubbleIds.delete(teamId);
  });
  brandCompany.textContent = organization.companyName;
  updateBrandHeader();
  saveBoardState(boardState);
  requestDraw();
}

function teamState(team) { return boardState.teams[team.id]; }
function sceneScale() { return viewport.fitScale * camera.scale; }
function targetSceneScale() { return viewport.fitScale * targetCamera.scale; }
function sceneToScreenX(value) { return viewport.sceneLeft + camera.x + value * sceneScale(); }
function sceneToScreenY(value) { return viewport.sceneTop + camera.y + value * sceneScale(); }
function sceneToTargetScreenX(value) { return viewport.sceneLeft + targetCamera.x + value * targetSceneScale(); }
function sceneToTargetScreenY(value) { return viewport.sceneTop + targetCamera.y + value * targetSceneScale(); }
function screenToSceneX(value) { return (value - viewport.sceneLeft - camera.x) / sceneScale(); }
function screenToSceneY(value) { return (value - viewport.sceneTop - camera.y) / sceneScale(); }
function visibleCircle(x, y, radius) {
  return x + radius >= 0 && y + radius >= 0 && x - radius <= viewport.width && y - radius <= viewport.height;
}

function fitPlacedBubbles() {
  const placed = renderedTeams.filter((team) => teamState(team).placed);
  if (placed.length === 0) return;
  const bounds = placed.reduce((result, team) => {
    const state = teamState(team);
    result.left = Math.min(result.left, state.x - team.radius);
    result.right = Math.max(result.right, state.x + team.radius);
    result.top = Math.min(result.top, state.y - team.radius);
    result.bottom = Math.max(result.bottom, state.y + team.radius);
    return result;
  }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  const shortestViewportSide = Math.min(viewport.width, viewport.height);
  const margin = compactTouchUiMedia.matches
    ? Math.min(7, Math.max(3, shortestViewportSide * .01))
    : compactPopupLayoutMedia.matches
      ? Math.min(22, Math.max(12, shortestViewportSide * .025))
      : Math.min(52, Math.max(28, shortestViewportSide * .045));
  const contentWidth = Math.max(bounds.right - bounds.left, 1);
  const contentHeight = Math.max(bounds.bottom - bounds.top, 1);
  const squareFitScale = Math.max(1, Math.min(viewport.width, viewport.height) - margin * 2) /
    Math.max(contentWidth, contentHeight);
  const rectangularFitScale = Math.min(
    Math.max(1, viewport.width - margin * 2) / contentWidth,
    Math.max(1, viewport.height - margin * 2) / contentHeight,
  );
  const fittedSceneScale = compactTouchUiMedia.matches
    ? squareFitScale + (rectangularFitScale - squareFitScale) * .5
    : squareFitScale;
  camera.scale = Math.min(30, Math.max(.08, fittedSceneScale / viewport.fitScale));
  fittedOverviewCameraScale = camera.scale;
  const appliedSceneScale = viewport.fitScale * camera.scale;
  camera.x = viewport.width / 2 - viewport.sceneLeft - (bounds.left + bounds.right) / 2 * appliedSceneScale;
  camera.y = viewport.height / 2 - viewport.sceneTop - (bounds.top + bounds.bottom) / 2 * appliedSceneScale;
  Object.assign(targetCamera, camera);
}

function profileWorldPosition(team, profile) {
  const state = teamState(team);
  const position = profileSlotPosition(team, profile);
  return { x: state.x + position.x, y: state.y + position.y };
}

function focusColleague(personId, focusScale = fittedOverviewCameraScale, fitPopup = false) {
  if (editActive) return;
  const source = profilesById.get(personId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  targetCamera.scale = Math.min(30, Math.max(.08,
    compactPopupLayoutMedia.matches ? fittedOverviewCameraScale * 1.12 : focusScale));
  const scale = viewport.fitScale * targetCamera.scale;
  const compactFocus = compactPopupLayoutMedia.matches ? compactBoardFocusPoint() : null;
  const searchPanel = compactFocus ? null : document.querySelector(".viewer-search.is-open .viewer-search-panel");
  const remainingCenter = searchPanel
    ? (searchPanel.getBoundingClientRect().right + viewport.width) / 2
    : viewport.width / 2;
  const focusX = compactFocus?.x ?? viewport.width / 2 + (remainingCenter - viewport.width / 2) * .7;
  let focusY = compactFocus?.y ?? viewport.height / 2 + profileLayoutConfig.profileDiameter / 2 * scale +
    Math.min(44, viewport.height * .048);
  if (compactFocus && fitPopup) {
    const profilePopup = document.querySelector(".profile-popup.is-open:not(.popup-outgoing)");
    if (profilePopup) {
      const margin = 8;
      const profileRadius = profileLayoutConfig.profileDiameter / 2 * scale;
      const popupTop = focusY - profileRadius - profilePopup.offsetHeight;
      if (popupTop < margin) focusY += margin - popupTop;
    }
  }
  targetCamera.x = focusX - viewport.sceneLeft - position.x * scale;
  targetCamera.y = focusY - viewport.sceneTop - position.y * scale;
  cameraEase = .105;
  requestDraw();
}

function compactBoardFocusPoint() {
  const searchPanel = document.querySelector(".viewer-search-panel");
  const openTeamSheet = document.querySelector(".team-popup.is-open:not(.popup-outgoing)");
  const upperBoundary = searchPanel?.getBoundingClientRect().bottom ?? 0;
  // offsetTop is unaffected by the sheet's opening scale transform, unlike its client rectangle.
  const lowerBoundary = openTeamSheet?.offsetTop ?? viewport.height;
  const verticalFraction = openTeamSheet ? .5 : .4;
  return {
    x: viewport.width / 2,
    y: upperBoundary + Math.max(0, lowerBoundary - upperBoundary) * verticalFraction,
  };
}

function focusTeam(teamId) {
  if (editActive || !compactPopupLayoutMedia.matches) return;
  const team = teamsById.get(teamId);
  if (!team || !teamState(team).placed) return;
  const state = teamState(team);
  const focus = compactBoardFocusPoint();
  targetCamera.scale = Math.min(30, Math.max(.08, fittedOverviewCameraScale * 1.12));
  const scale = viewport.fitScale * targetCamera.scale;
  targetCamera.x = focus.x - viewport.sceneLeft - state.x * scale;
  targetCamera.y = focus.y - viewport.sceneTop - state.y * scale;
  cameraEase = .105;
  requestDraw();
}

function publishSelectedProfilePosition() {
  const popupProfileId = selectedProfileId ?? previewProfileId;
  if (!popupProfileId) return;
  const source = profilesById.get(popupProfileId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  const contentCenter = placedContentCenter();
  dispatchEvent(new CustomEvent("boatboard:profile-position", {
    detail: {
      personId: popupProfileId,
      x: sceneToScreenX(position.x),
      y: sceneToScreenY(position.y),
      radius: profileLayoutConfig.profileDiameter / 2 * sceneScale(),
      contentCenterX: sceneToScreenX(contentCenter.x),
      contentCenterY: sceneToScreenY(contentCenter.y),
      targetX: sceneToTargetScreenX(position.x),
      targetY: sceneToTargetScreenY(position.y),
      targetRadius: profileLayoutConfig.profileDiameter / 2 * targetSceneScale(),
      targetContentCenterX: sceneToTargetScreenX(contentCenter.x),
      targetContentCenterY: sceneToTargetScreenY(contentCenter.y),
    },
  }));
}

function placedContentCenter() {
  const placed = renderedTeams.filter((team) => teamState(team).placed);
  if (placed.length === 0) return { x: logicalSceneSize / 2, y: logicalSceneSize / 2 };
  const bounds = placed.reduce((result, team) => {
    const state = teamState(team);
    result.left = Math.min(result.left, state.x - team.radius);
    result.right = Math.max(result.right, state.x + team.radius);
    result.top = Math.min(result.top, state.y - team.radius);
    result.bottom = Math.max(result.bottom, state.y + team.radius);
    return result;
  }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
}

function selectionRingOffset(baseOffset) {
  if (!compactTouchUiMedia.matches) return baseOffset;
  const zoomRatio = camera.scale / Math.max(.001, fittedOverviewCameraScale);
  // Keep the 4px stroke just outside its target while contracting the gap quickly when zooming out.
  return Math.max(2.75, baseOffset * Math.min(1, zoomRatio * zoomRatio));
}

function drawSelectedProfileRing() {
  if (!selectedProfileId) return;
  const source = profilesById.get(selectedProfileId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  const radius = profileLayoutConfig.profileDiameter / 2 * sceneScale() + selectionRingOffset(6);
  context.save();
  context.beginPath();
  context.arc(sceneToScreenX(position.x), sceneToScreenY(position.y), radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(158, 183, 192, .16)";
  context.lineWidth = 4;
  context.stroke();
  context.restore();
}

function drawSelectedTeamRing() {
  if (!selectedTeamId || !document.querySelector(".team-popup.is-open:not(.popup-outgoing)")) return;
  const team = teamsById.get(selectedTeamId);
  if (!team || !teamState(team).placed) return;
  const state = teamState(team);
  context.save();
  context.beginPath();
  context.arc(sceneToScreenX(state.x), sceneToScreenY(state.y), team.radius * sceneScale() + selectionRingOffset(7), 0, Math.PI * 2);
  context.strokeStyle = "rgba(158, 183, 192, .16)";
  context.lineWidth = 4;
  context.stroke();
  context.restore();
}

function drawEditorBubbleSelection() {
  if (!editActive || selectedBubbleIds.size === 0) return;
  const scale = sceneScale();
  context.save();
  context.strokeStyle = "rgba(158, 183, 192, .16)";
  context.lineWidth = 4;
  selectedBubbleIds.forEach((teamId) => {
    const team = teamsById.get(teamId);
    if (!team || !teamState(team).placed) return;
    const state = teamState(team);
    context.beginPath();
    context.arc(sceneToScreenX(state.x), sceneToScreenY(state.y), team.radius * scale + selectionRingOffset(7), 0, Math.PI * 2);
    context.stroke();
  });
  context.restore();
}

function drawMarqueeSelection() {
  if (interaction?.type !== "marquee") return;
  const left = Math.min(interaction.startX, interaction.currentX);
  const top = Math.min(interaction.startY, interaction.currentY);
  const width = Math.abs(interaction.currentX - interaction.startX);
  const height = Math.abs(interaction.currentY - interaction.startY);
  context.save();
  context.fillStyle = "rgba(116, 163, 181, .08)";
  context.strokeStyle = "rgba(157, 195, 208, .56)";
  context.lineWidth = 1.5;
  context.fillRect(left, top, width, height);
  context.strokeRect(left + .75, top + .75, Math.max(0, width - 1.5), Math.max(0, height - 1.5));
  context.restore();
}

function updateMarqueeSelection(selection) {
  const left = Math.min(selection.startX, selection.currentX);
  const right = Math.max(selection.startX, selection.currentX);
  const top = Math.min(selection.startY, selection.currentY);
  const bottom = Math.max(selection.startY, selection.currentY);
  const scale = sceneScale();
  selectedBubbleIds.clear();
  renderedTeams.forEach((team) => {
    const state = teamState(team);
    if (!state.placed) return;
    const centerX = sceneToScreenX(state.x);
    const centerY = sceneToScreenY(state.y);
    const nearestX = Math.max(left, Math.min(centerX, right));
    const nearestY = Math.max(top, Math.min(centerY, bottom));
    const radius = team.radius * scale;
    if (Math.hypot(centerX - nearestX, centerY - nearestY) <= radius) selectedBubbleIds.add(team.id);
  });
}

function teamMoveInteraction(team, event) {
  if (!selectedBubbleIds.has(team.id)) {
    selectedBubbleIds.clear();
    selectedBubbleIds.add(team.id);
  }
  const moves = [...selectedBubbleIds]
    .map((teamId) => teamsById.get(teamId))
    .filter((selectedTeam) => selectedTeam && teamState(selectedTeam).placed)
    .map((selectedTeam) => {
      const selectedState = teamState(selectedTeam);
      return { team: selectedTeam, x: selectedState.x, y: selectedState.y };
    });
  return {
    type: "team", pointerId: event.pointerId, team, moves,
    pointerX: event.clientX, pointerY: event.clientY,
  };
}

function publishSelectedTeamPosition() {
  if (!selectedTeamId) return;
  const team = teamsById.get(selectedTeamId);
  if (!team || !teamState(team).placed) return;
  const state = teamState(team);
  const contentCenter = placedContentCenter();
  dispatchEvent(new CustomEvent("boatboard:team-position", { detail: {
    teamId: team.id,
    x: sceneToScreenX(state.x),
    y: sceneToScreenY(state.y),
    radius: team.radius * sceneScale() + 8,
    contentCenterX: sceneToScreenX(contentCenter.x),
    contentCenterY: sceneToScreenY(contentCenter.y),
  } }));
}

function drawLineBetweenProfileAndTeam(sourceTeam, profile, targetTeam) {
  const source = profileWorldPosition(sourceTeam, profile);
  const targetState = teamState(targetTeam);
  const startCenterX = sceneToScreenX(source.x);
  const startCenterY = sceneToScreenY(source.y);
  const targetCenterX = sceneToScreenX(targetState.x);
  const targetCenterY = sceneToScreenY(targetState.y);
  const dx = targetCenterX - startCenterX;
  const dy = targetCenterY - startCenterY;
  const distance = Math.hypot(dx, dy) || 1;
  const unitX = dx / distance;
  const unitY = dy / distance;
  const profileRadius = profileLayoutConfig.profileDiameter / 2 * sceneScale();
  const teamRadius = targetTeam.radius * sceneScale();
  context.beginPath();
  context.moveTo(startCenterX + unitX * profileRadius, startCenterY + unitY * profileRadius);
  context.lineTo(targetCenterX - unitX * teamRadius, targetCenterY - unitY * teamRadius);
  context.strokeStyle = "rgba(70, 86, 94, .224)";
  context.stroke();
}

function drawLeadershipLinks() {
  context.save();
  context.lineCap = "round";
  const overviewZoomRatio = camera.scale / fittedOverviewCameraScale;
  const zoomRange = Math.max(.01, connectionLineTuning.maxZoom - connectionLineTuning.minZoom);
  const connectionLineProgress = Math.min(1, Math.max(0,
    (overviewZoomRatio - connectionLineTuning.minZoom) / zoomRange));
  const lineWidth = connectionLineTuning.minWidth +
    (connectionLineTuning.maxWidth - connectionLineTuning.minWidth) * connectionLineProgress;
  context.lineWidth = lineWidth * (compactTouchUiMedia.matches ? .6 : 1);
  renderedTeams.forEach((targetTeam) => {
    const targetState = teamState(targetTeam);
    if (!targetState.placed || !targetState.leaderId) return;
    const source = profilesById.get(targetState.leaderId);
    if (!source || !teamState(source.team).placed) return;
    drawLineBetweenProfileAndTeam(source.team, source.profile, targetTeam);
  });
  if (interaction?.type === "connection") {
    const source = interaction.source;
    const targetTeam = interaction.targetTeamId ? teamsById.get(interaction.targetTeamId) : null;
    if (targetTeam) {
      drawLineBetweenProfileAndTeam(source.team, source.profile, targetTeam);
    } else {
      const sourcePosition = profileWorldPosition(source.team, source.profile);
      const startX = sceneToScreenX(sourcePosition.x);
      const startY = sceneToScreenY(sourcePosition.y);
      const dx = interaction.pointerX - startX;
      const dy = interaction.pointerY - startY;
      const distance = Math.hypot(dx, dy) || 1;
      const radius = profileLayoutConfig.profileDiameter / 2 * sceneScale();
      context.beginPath();
      context.moveTo(startX + dx / distance * radius, startY + dy / distance * radius);
      context.lineTo(interaction.pointerX, interaction.pointerY);
      context.strokeStyle = "rgba(70, 86, 94, .224)";
      context.stroke();
    }
  }
  context.restore();
}

function drawBubble(team, centerX, centerY, radius, scale) {
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, "rgba(126, 154, 167, .024)");
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 42 * scale)) / radius), "rgba(126, 154, 167, .03)");
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 25 * scale)) / radius), "rgba(119, 151, 166, .038)");
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 3 * scale)) / radius), "rgba(154, 181, 192, .125)");
  gradient.addColorStop(1, "rgba(170, 194, 203, .19)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}

function drawProfile(team, profile, scale, overridePosition = null) {
  const position = overridePosition ?? profileWorldPosition(team, profile);
  const x = sceneToScreenX(position.x);
  const y = sceneToScreenY(position.y);
  const radius = profileLayoutConfig.profileDiameter / 2 * scale;
  if (!visibleCircle(x, y, radius)) return;
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  if (profile.imageElement) {
    context.drawImage(profile.imageElement, x - radius, y - radius, radius * 2, radius * 2);
  } else if (radius < 3) {
    context.fillStyle = profile.colors[0];
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  } else {
    const gradient = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, profile.colors[0]);
    gradient.addColorStop(1, profile.colors[1]);
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.restore();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  if (radius >= 3) {
    context.strokeStyle = "rgba(13, 21, 26, .9)";
    context.lineWidth = Math.max(.7, scale);
    context.stroke();
  }
  if (radius >= 7 && !profile.imageElement) {
    context.fillStyle = "rgba(255, 255, 255, .92)";
    context.font = `700 ${radius * .92}px Inter, ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials(profile.name), x, y + radius * .04);
  }
}

function rotationHandlePosition(team) {
  const state = teamState(team);
  return { x: sceneToScreenX(state.x + team.radius) + 10, y: sceneToScreenY(state.y) };
}

function drawRotationHandles() {
  if (!editActive) return;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 1.35;
  context.strokeStyle = "rgba(151, 169, 177, .24)";
  renderedTeams.forEach((team) => {
    if (!teamState(team).placed) return;
    const handle = rotationHandlePosition(team);
    context.save();
    context.translate(handle.x, handle.y);
    context.beginPath();
    context.moveTo(-2.5, -8);
    context.quadraticCurveTo(4.5, 0, -2.5, 8);
    context.stroke();
    context.beginPath();
    context.moveTo(-2.5, -8);
    context.lineTo(-2.1, -3.7);
    context.moveTo(-2.5, -8);
    context.lineTo(1.7, -7.2);
    context.moveTo(-2.5, 8);
    context.lineTo(-2.1, 3.7);
    context.moveTo(-2.5, 8);
    context.lineTo(1.7, 7.2);
    context.stroke();
    context.restore();
  });
  context.restore();
}

function drawScene() {
  frameRequested = false;
  const cameraDifference = Math.max(
    Math.abs(targetCamera.scale - camera.scale),
    Math.abs(targetCamera.x - camera.x) / 100,
    Math.abs(targetCamera.y - camera.y) / 100,
  );
  if (!interaction && cameraDifference > .0001) {
    camera.scale += (targetCamera.scale - camera.scale) * cameraEase;
    camera.x += (targetCamera.x - camera.x) * cameraEase;
    camera.y += (targetCamera.y - camera.y) * cameraEase;
  } else if (!interaction) {
    Object.assign(camera, targetCamera);
    cameraEase = .24;
  }
  context.clearRect(0, 0, viewport.width, viewport.height);
  drawLeadershipLinks();
  const scale = sceneScale();
  renderedTeams.forEach((team) => {
    const state = teamState(team);
    if (!state.placed) return;
    const centerX = sceneToScreenX(state.x);
    const centerY = sceneToScreenY(state.y);
    const radius = team.radius * scale;
    if (!visibleCircle(centerX, centerY, radius)) return;
    const reorderingThisTeam = interaction?.type === "reorder" && interaction.source.team.id === team.id;
    const rotatingThisTeam = interaction?.type === "rotation" && interaction.team.id === team.id;
    if (scale <= teamDetailSwitchScale && !reorderingThisTeam && !rotatingThisTeam) {
      context.drawImage(team.bitmap, centerX - radius, centerY - radius, radius * 2, radius * 2);
    } else {
      drawBubble(team, centerX, centerY, radius, scale);
      team.profiles.forEach((profile) => {
        if (reorderingThisTeam && profile.id === interaction.source.profile.id) return;
        if (reorderingThisTeam && profile.id === interaction.candidate?.profile.id) {
          const original = rotateProfilePosition(team.positions[interaction.originalSlot], state.rotation);
          drawProfile(team, profile, scale, { x: state.x + original.x, y: state.y + original.y });
          return;
        }
        drawProfile(team, profile, scale);
      });
    }
  });
  if (interaction?.type === "reorder") {
    drawProfile(interaction.source.team, interaction.source.profile, scale, {
      x: screenToSceneX(interaction.pointerX),
      y: screenToSceneY(interaction.pointerY),
    });
  }
  drawRotationHandles();
  drawEditorBubbleSelection();
  drawSelectedTeamRing();
  drawSelectedProfileRing();
  drawMarqueeSelection();
  publishSelectedTeamPosition();
  publishSelectedProfilePosition();
  publishCurrentLineZoom();
  if (!interaction && cameraDifference > .0001) requestDraw();
}

function requestDraw() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(drawScene);
}

function publishCurrentLineZoom() {
  if (runtimeContext.mode !== "development") return;
  const zoom = camera.scale / fittedOverviewCameraScale;
  if (lastPublishedLineZoom !== null && Math.abs(lastPublishedLineZoom - zoom) < .001) return;
  lastPublishedLineZoom = zoom;
  dispatchEvent(new CustomEvent("boatboard:line-zoom", { detail: { zoom } }));
}

function resizeCanvas() {
  const hadViewport = viewport.width > 0 && viewport.height > 0;
  const currentCenter = hadViewport ? {
    x: screenToSceneX(viewport.width / 2),
    y: screenToSceneY(viewport.height / 2),
  } : null;
  const targetScaleBeforeResize = hadViewport ? targetSceneScale() : 1;
  const targetCenter = hadViewport ? {
    x: (viewport.width / 2 - viewport.sceneLeft - targetCamera.x) / targetScaleBeforeResize,
    y: (viewport.height / 2 - viewport.sceneTop - targetCamera.y) / targetScaleBeforeResize,
  } : null;
  const rectangle = board.getBoundingClientRect();
  const pixelRatio = Math.min(2, devicePixelRatio || 1);
  viewport.width = rectangle.width;
  viewport.height = rectangle.height;
  viewport.fitScale = Math.min(viewport.width, viewport.height) / logicalSceneSize;
  viewport.sceneLeft = (viewport.width - logicalSceneSize * viewport.fitScale) / 2;
  viewport.sceneTop = (viewport.height - logicalSceneSize * viewport.fitScale) / 2;
  canvas.width = Math.round(viewport.width * pixelRatio);
  canvas.height = Math.round(viewport.height * pixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (!initialFitApplied) {
    fitPlacedBubbles();
    initialFitApplied = true;
  } else {
    const currentScale = sceneScale();
    const targetScale = targetSceneScale();
    camera.x = viewport.width / 2 - viewport.sceneLeft - currentCenter.x * currentScale;
    camera.y = viewport.height / 2 - viewport.sceneTop - currentCenter.y * currentScale;
    targetCamera.x = viewport.width / 2 - viewport.sceneLeft - targetCenter.x * targetScale;
    targetCamera.y = viewport.height / 2 - viewport.sceneTop - targetCenter.y * targetScale;
  }
  const focusedProfileRadius = profileLayoutConfig.profileDiameter / 2
    * viewport.fitScale * fittedOverviewCameraScale * 1.12;
  document.documentElement.style.setProperty(
    "--compact-focused-profile-radius",
    `${focusedProfileRadius}px`,
  );
  requestDraw();
  fitCompactBrandTitle();
}

function localPointer(event) {
  const rectangle = board.getBoundingClientRect();
  return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
}

function touchPair() {
  return [...touchPointers.entries()].slice(0, 2);
}

function touchPairGeometry(pair = touchPair()) {
  const rectangle = board.getBoundingClientRect();
  const first = pair[0][1];
  const second = pair[1][1];
  return {
    centerX: (first.x + second.x) / 2 - rectangle.left,
    centerY: (first.y + second.y) / 2 - rectangle.top,
    distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
  };
}

function beginTouchPinch() {
  const pair = touchPair();
  if (pair.length < 2) return;
  if (interaction?.type === "team" || interaction?.type === "rotation") persistBoard();
  const geometry = touchPairGeometry(pair);
  cameraEase = .24;
  targetCamera.scale = camera.scale;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  const scale = sceneScale();
  interaction = {
    type: "pinch",
    pointerIds: pair.map(([pointerId]) => pointerId),
    initialDistance: geometry.distance,
    initialScale: camera.scale,
    anchorX: (geometry.centerX - viewport.sceneLeft - camera.x) / scale,
    anchorY: (geometry.centerY - viewport.sceneTop - camera.y) / scale,
  };
  board.classList.remove("is-moving-team", "is-rotating", "is-marquee-selecting");
  board.classList.add("is-panning");
}

function updateTouchPinch() {
  if (interaction?.type !== "pinch") return;
  const pair = interaction.pointerIds.map((pointerId) => [pointerId, touchPointers.get(pointerId)]);
  if (pair.some(([, point]) => !point)) return;
  const geometry = touchPairGeometry(pair);
  const nextScale = Math.min(30, Math.max(.08,
    interaction.initialScale * geometry.distance / interaction.initialDistance));
  const scale = viewport.fitScale * nextScale;
  camera.scale = nextScale;
  camera.x = geometry.centerX - viewport.sceneLeft - interaction.anchorX * scale;
  camera.y = geometry.centerY - viewport.sceneTop - interaction.anchorY * scale;
  targetCamera.scale = camera.scale;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  requestDraw();
}

function teamAt(x, y) {
  const sceneX = screenToSceneX(x);
  const sceneY = screenToSceneY(y);
  return [...renderedTeams].reverse().find((team) => {
    const state = teamState(team);
    return state.placed && Math.hypot(sceneX - state.x, sceneY - state.y) <= team.radius + 12 / sceneScale();
  }) ?? null;
}

function profileAt(x, y) {
  const sceneX = screenToSceneX(x);
  const sceneY = screenToSceneY(y);
  const profileRadius = profileLayoutConfig.profileDiameter / 2 + 7 / sceneScale();
  for (const team of [...renderedTeams].reverse()) {
    const state = teamState(team);
    if (!state.placed) continue;
    for (const profile of team.profiles) {
      const position = profileSlotPosition(team, profile);
      if (Math.hypot(sceneX - state.x - position.x, sceneY - state.y - position.y) <= profileRadius) {
        return { team, profile };
      }
    }
  }
  return null;
}

function rotationHandleAt(x, y) {
  if (!editActive) return null;
  return [...renderedTeams].reverse().find((team) => {
    const state = teamState(team);
    if (!state.placed) return false;
    const handle = rotationHandlePosition(team);
    return Math.abs(x - handle.x) <= 8 && Math.abs(y - handle.y) <= 13;
  }) ?? null;
}

function persistBoard() {
  saveBoardState(boardState);
  dispatchEvent(new CustomEvent("boatboard:board-changed", { detail: { boardState: structuredClone(boardState) } }));
  requestDraw();
}

function finishProfileReorder(commit) {
  if (interaction?.type !== "reorder") return;
  const { source, candidate, originalSlot } = interaction;
  if (commit && candidate) {
    const candidateSlot = candidate.profile.slotIndex;
    source.profile.slotIndex = candidateSlot;
    candidate.profile.slotIndex = originalSlot;
    const order = teamState(source.team).profileOrder;
    order[originalSlot] = candidate.profile.id;
    order[candidateSlot] = source.profile.id;
    source.team.bitmap = createTeamBitmap(source.team);
    interaction = null;
    persistBoard();
    return;
  }
  interaction = null;
  requestDraw();
}

brandCompany.textContent = organization.companyName;
updateBrandHeader();
resizeCanvas();
requestAnimationFrame(() => board.classList.add("is-ui-ready"));
addEventListener("resize", resizeCanvas);
addEventListener("orientationchange", () => {
  setTimeout(() => {
    setStableMobileViewportHeight();
    resizeCanvas();
  }, 250);
});
{
  addEventListener("boatboard:select-colleague", (event) => {
    selectedProfileId = event.detail?.personId ?? null;
    previewProfileId = null;
    requestDraw();
  });
  addEventListener("boatboard:close-colleague", () => {
    selectedProfileId = null;
    requestDraw();
  });
  addEventListener("boatboard:focus-colleague", (event) => {
    focusColleague(event.detail?.personId, event.detail?.scale, event.detail?.fitPopup === true);
  });
  addEventListener("storage", (event) => {
    if (event.key === boardStateStorageKey && !editActive) location.reload();
  });
}
addEventListener("boatboard:select-team", (event) => { selectedTeamId = event.detail?.teamId ?? null; requestDraw(); });
addEventListener("boatboard:close-team", () => { selectedTeamId = null; requestDraw(); });
addEventListener("boatboard:focus-team", (event) => focusTeam(event.detail?.teamId));
addEventListener("boatboard:refresh-popup-positions", requestDraw);
addEventListener("boatboard:line-tuning", (event) => {
  const next = event.detail;
  if (!next) return;
  connectionLineTuning.minZoom = Number(next.minZoom) || .5;
  connectionLineTuning.maxZoom = Math.max(connectionLineTuning.minZoom + .01, Number(next.maxZoom) || 3);
  connectionLineTuning.minWidth = Math.max(.1, Number(next.minWidth) || 1.05);
  connectionLineTuning.maxWidth = Math.max(connectionLineTuning.minWidth, Number(next.maxWidth) || 2.45);
  requestDraw();
});
addEventListener("boatboard:enter-edit-mode", () => {
  editActive = true;
  clearProfileHover();
  selectedProfileId = null;
  selectedTeamId = null;
  board.classList.remove("is-team-hover", "is-profile-hover");
  requestDraw();
});
addEventListener("boatboard:exit-edit-mode", () => {
  editActive = false;
  interaction = null;
  selectedBubbleIds.clear();
  board.classList.remove("is-rotating", "is-rotation-hover", "is-panning", "is-marquee-selecting", "is-team-drag-hover", "is-moving-team");
  requestDraw();
});
addEventListener("boatboard:ensure-popup-visible", (event) => {
  const dx = Number(event.detail?.dx) || 0;
  const dy = Number(event.detail?.dy) || 0;
  if (!dx && !dy) return;
  targetCamera.x = camera.x + dx;
  targetCamera.y = camera.y + dy;
  targetCamera.scale = camera.scale;
  cameraEase = .17;
  requestDraw();
});
if (isEditorPage) {
  addEventListener("boatboard:organization-changed", (event) => {
    if (event.detail?.organization) refreshOrganization(event.detail.organization);
  });
}

function clearProfileHover() {
  clearTimeout(hoverTimer);
  hoverTimer = null;
  hoverCandidateId = null;
  board.classList.remove("is-profile-hover");
  if (previewProfileId) {
    const personId = previewProfileId;
    previewProfileId = null;
    dispatchEvent(new CustomEvent("boatboard:preview-colleague-end", { detail: { personId } }));
  }
}

{
  board.addEventListener("pointermove", (event) => {
    if (editActive) return;
    if (interaction || event.target.closest(".viewer-search, .profile-popup, .team-popup")) {
      clearProfileHover();
      board.classList.remove("is-team-hover", "is-profile-hover");
      return;
    }
    const pointer = localPointer(event);
    const hovered = profileAt(pointer.x, pointer.y);
    const personId = hovered?.profile.id ?? null;
    board.classList.toggle("is-profile-hover", Boolean(personId));
    board.classList.toggle("is-team-hover", !personId && Boolean(teamAt(pointer.x, pointer.y)));
    clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverCandidateId = null;
    if (previewProfileId) {
      const previousId = previewProfileId;
      previewProfileId = null;
      dispatchEvent(new CustomEvent("boatboard:preview-colleague-end", { detail: { personId: previousId } }));
    }
  });
  board.addEventListener("pointerleave", () => { clearProfileHover(); board.classList.remove("is-team-hover"); });
}
if (isEditorPage) {
  board.addEventListener("pointermove", (event) => {
    if (!editActive) return;
    if (interaction) return;
    if (event.target.closest(".profile-popup, .team-popup, .editor-panel")) {
      board.classList.remove("is-rotation-hover", "is-profile-hover", "is-team-drag-hover");
      return;
    }
    const pointer = localPointer(event);
    const rotationTeam = rotationHandleAt(pointer.x, pointer.y);
    board.classList.toggle("is-rotation-hover", Boolean(rotationTeam));
    board.classList.remove("is-profile-hover");
    board.classList.toggle("is-team-drag-hover", !rotationTeam && Boolean(teamAt(pointer.x, pointer.y)));
  });
  board.addEventListener("pointerleave", () => board.classList.remove("is-rotation-hover", "is-profile-hover", "is-team-drag-hover"));
  saveBoardState(boardState);
  addEventListener("boatboard:tray-drag-start", (event) => {
    const team = teamsById.get(event.detail?.teamId);
    if (team) {
      const ghost = document.createElement("div");
      ghost.className = "tray-bubble-ghost";
      document.body.append(ghost);
      interaction = { type: "native-tray", team, ghost };
    }
  });
  addEventListener("boatboard:tray-drag-move", (event) => {
    if (interaction?.type !== "native-tray") return;
    interaction.ghost.style.left = `${event.detail.x}px`;
    interaction.ghost.style.top = `${event.detail.y}px`;
  });
  addEventListener("boatboard:tray-drag-end", () => {
    if (interaction?.type === "native-tray") { interaction.ghost.remove(); interaction = null; }
  });
  board.addEventListener("dragover", (event) => {
    if (!event.dataTransfer.types.includes("application/x-boatboard-team")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  board.addEventListener("drop", (event) => {
    const team = teamsById.get(event.dataTransfer.getData("application/x-boatboard-team"));
    if (!team) return;
    event.preventDefault();
    const pointer = localPointer(event);
    const state = teamState(team);
    state.x = screenToSceneX(pointer.x);
    state.y = screenToSceneY(pointer.y);
    state.placed = true;
    interaction?.ghost?.remove();
    interaction = null;
    persistBoard();
  });
}

board.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (!editActive) clearProfileHover();
  const pointer = localPointer(event);
  const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1;
  const normalizedDelta = Math.max(-120, Math.min(120, event.deltaY * deltaMultiplier));
  const depthBoost = .8 + Math.sqrt(targetCamera.scale) * .2;
  const gestureBoost = event.ctrlKey ? 1.35 : 1;
  cameraEase = .24;
  const nextScale = Math.min(30, Math.max(.08, targetCamera.scale * Math.exp(-normalizedDelta * .0054 * depthBoost * gestureBoost)));
  const ratio = nextScale / targetCamera.scale;
  targetCamera.x = pointer.x - viewport.sceneLeft - (pointer.x - viewport.sceneLeft - targetCamera.x) * ratio;
  targetCamera.y = pointer.y - viewport.sceneTop - (pointer.y - viewport.sceneTop - targetCamera.y) * ratio;
  targetCamera.scale = nextScale;
  requestDraw();
}, { passive: false });

board.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const overFixedUi = event.target instanceof Element && event.target.closest(
    ".viewer-search-panel, .profile-popup, .team-popup, .editor-panel",
  );
  if (event.pointerType === "touch" && !overFixedUi) {
    touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPointers.size >= 2) {
      event.preventDefault();
      board.setPointerCapture(event.pointerId);
      beginTouchPinch();
      requestDraw();
      return;
    }
  }
  const pointer = localPointer(event);
  const clickedViewerProfile = profileAt(pointer.x, pointer.y);
  if (!editActive && clickedViewerProfile?.profile.id === previewProfileId) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverCandidateId = null;
  } else if (!editActive) clearProfileHover();
  cameraEase = .24;
  targetCamera.scale = camera.scale;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  if (editActive) {
    if (event.shiftKey) {
      selectedBubbleIds.clear();
      interaction = {
        type: "marquee", pointerId: event.pointerId,
        startX: pointer.x, startY: pointer.y, currentX: pointer.x, currentY: pointer.y,
      };
      board.classList.add("is-marquee-selecting");
    }
    if (!interaction) {
      const rotationTeam = rotationHandleAt(pointer.x, pointer.y);
      if (rotationTeam) {
        interaction = {
          type: "rotation", pointerId: event.pointerId, team: rotationTeam,
          pointerY: event.clientY, rotation: teamState(rotationTeam).rotation,
        };
        board.classList.add("is-rotating");
      } else {
        const team = teamAt(pointer.x, pointer.y);
        if (team) {
          interaction = teamMoveInteraction(team, event);
          board.classList.add("is-moving-team");
        }
      }
    }
  }
  if (!interaction) {
    interaction = {
      type: "pan", pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY,
      x: camera.x, y: camera.y, moved: false, clickProfile: clickedViewerProfile,
      clickTeam: clickedViewerProfile ? null : teamAt(pointer.x, pointer.y),
    };
    board.classList.add("is-panning");
  }
  board.setPointerCapture(event.pointerId);
  requestDraw();
});

addEventListener("pointerdown", (event) => {
  if (interaction?.type !== "reorder") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ignoreNextContextMenu = event.button === 2;
  finishProfileReorder(Boolean(interaction.candidate));
}, { capture: true });

addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" && touchPointers.has(event.pointerId)) {
    touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (interaction?.type === "pinch") {
      event.preventDefault();
      updateTouchPinch();
      return;
    }
  }
  if (interaction?.type === "reorder") {
    const pointer = localPointer(event);
    interaction.pointerX = pointer.x;
    interaction.pointerY = pointer.y;
    const hovered = profileAt(pointer.x, pointer.y);
    if (hovered && hovered.team.id === interaction.source.team.id && hovered.profile.id !== interaction.source.profile.id) {
      interaction.candidate = hovered;
    } else {
      interaction.candidate = null;
    }
    requestDraw();
    return;
  }
  if (!interaction || interaction.pointerId !== event.pointerId) return;
  if (interaction.type === "pan") {
    const dx = event.clientX - interaction.pointerX;
    const dy = event.clientY - interaction.pointerY;
    if (!interaction.moved && Math.hypot(dx, dy) <= 3) return;
    interaction.moved = true;
    camera.x = interaction.x + dx;
    camera.y = interaction.y + dy;
    targetCamera.x = camera.x;
    targetCamera.y = camera.y;
  } else if (interaction.type === "team") {
    const dx = (event.clientX - interaction.pointerX) / sceneScale();
    const dy = (event.clientY - interaction.pointerY) / sceneScale();
    interaction.moves.forEach((move) => {
      const state = teamState(move.team);
      state.x = move.x + dx;
      state.y = move.y + dy;
    });
  } else if (interaction.type === "marquee") {
    const pointer = localPointer(event);
    interaction.currentX = pointer.x;
    interaction.currentY = pointer.y;
    updateMarqueeSelection(interaction);
  } else if (interaction.type === "rotation") {
    const degrees = interaction.rotation + (event.clientY - interaction.pointerY) * .6;
    const snapped = Math.round(degrees / 10) * 10;
    teamState(interaction.team).rotation = ((snapped % 360) + 360) % 360;
  } else if (interaction.type === "connection") {
    const pointer = localPointer(event);
    interaction.moved ||= Math.hypot(pointer.x - interaction.startX, pointer.y - interaction.startY) > 4;
    interaction.pointerX = pointer.x;
    interaction.pointerY = pointer.y;
    const target = teamAt(pointer.x, pointer.y);
    interaction.targetTeamId = target && target.id !== interaction.source.team.id ? target.id : null;
  } else if (interaction.type === "tray") {
    interaction.ghost.style.transform = `translate(${event.clientX - 48}px, ${event.clientY - 48}px)`;
  }
  requestDraw();
});

function stopInteraction(event) {
  if (event.pointerType === "touch") {
    touchPointers.delete(event.pointerId);
    if (interaction?.type === "pinch" && interaction.pointerIds.includes(event.pointerId)) {
      const remaining = [...touchPointers.entries()][0];
      interaction = remaining ? {
        type: "pan", pointerId: remaining[0], pointerX: remaining[1].x, pointerY: remaining[1].y,
        x: camera.x, y: camera.y, moved: true, clickProfile: null, clickTeam: null,
      } : null;
      board.classList.toggle("is-panning", Boolean(remaining));
      if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
      requestDraw();
      return;
    }
  }
  if (!interaction || interaction.pointerId !== event.pointerId) return;
  const completed = interaction;
  if (event.type === "pointerup" && completed.type === "pan" && !completed.moved && completed.clickProfile) {
    const pointer = localPointer(event);
    dispatchEvent(new CustomEvent("boatboard:select-colleague", {
      detail: {
        personId: completed.clickProfile.profile.id,
        placement: "auto",
        source: "canvas",
        x: pointer.x,
        y: pointer.y,
      },
    }));
  } else if (event.type === "pointerup" && completed.type === "pan" && !completed.moved && completed.clickTeam) {
    dispatchEvent(new CustomEvent("boatboard:select-team", { detail: { teamId: completed.clickTeam.id, source: "canvas" } }));
  } else if (!editActive && event.type === "pointerup" && completed.type === "connection" && !completed.moved) {
    const pointer = localPointer(event);
    dispatchEvent(new CustomEvent("boatboard:select-colleague", {
      detail: { personId: completed.source.profile.id, placement: "auto", source: "canvas", x: pointer.x, y: pointer.y },
    }));
  } else if (event.type === "pointerup" && completed.type === "connection" && completed.targetTeamId) {
    boardState.teams[completed.targetTeamId].leaderId = completed.source.profile.id;
    persistBoard();
  } else if (!editActive && event.type === "pointerup" && completed.type === "team" && Math.hypot(event.clientX - completed.pointerX, event.clientY - completed.pointerY) <= 3) {
    dispatchEvent(new CustomEvent("boatboard:select-team", { detail: { teamId: completed.team.id, source: "canvas" } }));
  } else if (completed.type === "team") {
    const panelBounds = editorPanel?.getBoundingClientRect();
    if (panelBounds && event.clientX >= panelBounds.left && event.clientX <= panelBounds.right &&
        event.clientY >= panelBounds.top && event.clientY <= panelBounds.bottom) {
      completed.moves.forEach((move) => { teamState(move.team).placed = false; });
    }
    persistBoard();
  } else if (completed.type === "rotation") {
    completed.team.bitmap = createTeamBitmap(completed.team);
    persistBoard();
  }
  interaction = null;
  board.classList.remove("is-panning");
  board.classList.remove("is-moving-team");
  board.classList.remove("is-rotating");
  board.classList.remove("is-marquee-selecting");
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  requestDraw();
}

addEventListener("pointerup", stopInteraction);
addEventListener("pointercancel", stopInteraction);
addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const layers = [...document.querySelectorAll(
    ".viewer-search.is-open, .profile-popup.is-open:not(.popup-outgoing), .team-popup.is-open:not(.popup-outgoing)",
  )];
  const latest = layers.sort((left, right) =>
    Number(right.dataset.openOrder ?? 0) - Number(left.dataset.openOrder ?? 0))[0];
  if (!latest) {
    if (editActive && selectedBubbleIds.size > 0) {
      selectedBubbleIds.clear();
      requestDraw();
    }
    return;
  }
  event.preventDefault();
  latest.querySelector(".viewer-search-close, .profile-popup-close, .team-popup-close")?.click();
});
if (isEditorPage) {
  board.addEventListener("contextmenu", (event) => {
    if (!editActive) return;
    event.preventDefault();
    if (ignoreNextContextMenu) {
      ignoreNextContextMenu = false;
      return;
    }
    const pointer = localPointer(event);
    const source = profileAt(pointer.x, pointer.y);
    if (source) {
      interaction = {
        type: "reorder",
        source,
        originalSlot: source.profile.slotIndex,
        candidate: null,
        pointerX: pointer.x,
        pointerY: pointer.y,
      };
      requestDraw();
      return;
    }
    const team = teamAt(pointer.x, pointer.y);
    if (!team) return;
    teamState(team).placed = false;
    persistBoard();
  });
  addEventListener("keydown", () => finishProfileReorder(false));
}
