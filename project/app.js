import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260808-50";
import {
  boardStateStorageKey,
  loadBoardState,
  reconcileBoardState,
  saveBoardState,
} from "./data/board-state.js?v=boatboard-20260808-50";
import { getProfileArrangement, profileLayoutConfig } from "./layout/profile-arrangements.js?v=boatboard-20260808-50";

const board = document.querySelector(".board");
const brandCompany = document.querySelector(".brand-company");
const brandSubtitle = document.querySelector(".brand small");
const canvas = document.querySelector(".organization-canvas");
const editorPanel = document.querySelector(".editor-panel");
const unplacedList = document.querySelector(".unplaced-list");
const panelToggle = document.querySelector(".panel-toggle");
const context = canvas.getContext("2d", { alpha: true });
const isEditor = document.body.classList.contains("editor-mode");
const organization = await loadOrganization();
const teamGap = 12;
const teamColumns = Math.max(1, Math.ceil(Math.sqrt(organization.teams.length)));
const teamRows = Math.max(1, Math.ceil(organization.teams.length / teamColumns));
const camera = { scale: 1, x: 0, y: 0 };
const targetCamera = { scale: 1, x: 0, y: 0 };
const viewport = { width: 0, height: 0, fitScale: 1, sceneLeft: 0, sceneTop: 0 };
const teamCacheScale = .4;
let frameRequested = false;
let interaction = null;
let ignoreNextContextMenu = false;
let cameraEase = .24;
let initialViewerFitApplied = false;
let selectedProfileId = null;
let previewProfileId = null;
let hoverCandidateId = null;
let hoverTimer = null;

if (!isEditor) {
  addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { capture: true, passive: false });
  addEventListener("gesturestart", (event) => event.preventDefault(), { capture: true, passive: false });
  addEventListener("gesturechange", (event) => event.preventDefault(), { capture: true, passive: false });
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
  return team.positions[profile.slotIndex];
}

function createTeamBitmap(team) {
  const diameter = team.radius * 2;
  const bitmap = document.createElement("canvas");
  bitmap.width = Math.ceil(diameter * teamCacheScale);
  bitmap.height = Math.ceil(diameter * teamCacheScale);
  const bitmapContext = bitmap.getContext("2d", { alpha: true });
  bitmapContext.scale(teamCacheScale, teamCacheScale);
  const center = team.radius;
  const bubbleGradient = bitmapContext.createRadialGradient(center, center, 0, center, center, team.radius);
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 28) / team.radius), "rgba(105, 139, 155, 0)");
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 17) / team.radius), "rgba(105, 139, 155, .018)");
  bubbleGradient.addColorStop(Math.max(0, (team.radius - 3) / team.radius), "rgba(143, 170, 181, .095)");
  bubbleGradient.addColorStop(1, "rgba(158, 183, 192, .155)");
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
      gradient.addColorStop(0, profile.colors[0]);
      gradient.addColorStop(1, profile.colors[1]);
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

function teamState(team) { return boardState.teams[team.id]; }
function sceneScale() { return viewport.fitScale * camera.scale; }
function sceneToScreenX(value) { return viewport.sceneLeft + camera.x + value * sceneScale(); }
function sceneToScreenY(value) { return viewport.sceneTop + camera.y + value * sceneScale(); }
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
  const margin = Math.min(52, Math.max(28, Math.min(viewport.width, viewport.height) * .045));
  const availableSquare = Math.max(1, Math.min(viewport.width, viewport.height) - margin * 2);
  const contentSize = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top, 1);
  const fittedSceneScale = availableSquare / contentSize;
  camera.scale = Math.min(30, Math.max(.08, fittedSceneScale / viewport.fitScale));
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

function focusColleague(personId, focusScale = .5) {
  if (isEditor) return;
  const source = profilesById.get(personId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  targetCamera.scale = Math.min(30, Math.max(.08, focusScale));
  const scale = viewport.fitScale * targetCamera.scale;
  const searchPanel = document.querySelector(".viewer-search.is-open .viewer-search-panel");
  const remainingCenter = searchPanel
    ? (searchPanel.getBoundingClientRect().right + viewport.width) / 2
    : viewport.width / 2;
  const focusX = viewport.width / 2 + (remainingCenter - viewport.width / 2) * .62;
  const focusY = viewport.height / 2 + profileLayoutConfig.profileDiameter / 2 * scale +
    Math.min(32, viewport.height * .035);
  targetCamera.x = focusX - viewport.sceneLeft - position.x * scale;
  targetCamera.y = focusY - viewport.sceneTop - position.y * scale;
  cameraEase = .065;
  requestDraw();
}

function publishSelectedProfilePosition() {
  const popupProfileId = selectedProfileId ?? previewProfileId;
  if (!popupProfileId) return;
  const source = profilesById.get(popupProfileId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  dispatchEvent(new CustomEvent("boatboard:profile-position", {
    detail: {
      personId: popupProfileId,
      x: sceneToScreenX(position.x),
      y: sceneToScreenY(position.y),
      radius: profileLayoutConfig.profileDiameter / 2 * sceneScale(),
    },
  }));
}

function drawSelectedProfileRing() {
  if (!selectedProfileId) return;
  const source = profilesById.get(selectedProfileId);
  if (!source || !teamState(source.team).placed) return;
  const position = profileWorldPosition(source.team, source.profile);
  const radius = profileLayoutConfig.profileDiameter / 2 * sceneScale() + 6;
  context.save();
  context.beginPath();
  context.arc(sceneToScreenX(position.x), sceneToScreenY(position.y), radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(158, 183, 192, .16)";
  context.lineWidth = 4;
  context.stroke();
  context.restore();
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
  context.strokeStyle = "rgba(43, 58, 65, .25)";
  context.stroke();
}

function drawLeadershipLinks() {
  context.save();
  context.lineCap = "round";
  context.lineWidth = 3;
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
      context.strokeStyle = "rgba(43, 58, 65, .25)";
      context.stroke();
    }
  }
  context.restore();
}

function drawBubble(team, centerX, centerY, radius, scale) {
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 28 * scale)) / radius), "rgba(105, 139, 155, 0)");
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 17 * scale)) / radius), "rgba(105, 139, 155, .018)");
  gradient.addColorStop(Math.max(0, (radius - Math.min(radius, 3 * scale)) / radius), "rgba(143, 170, 181, .095)");
  gradient.addColorStop(1, "rgba(158, 183, 192, .155)");
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
    if (scale <= teamCacheScale && !reorderingThisTeam) {
      context.drawImage(team.bitmap, centerX - radius, centerY - radius, radius * 2, radius * 2);
    } else {
      drawBubble(team, centerX, centerY, radius, scale);
      team.profiles.forEach((profile) => {
        if (reorderingThisTeam && profile.id === interaction.source.profile.id) return;
        if (reorderingThisTeam && profile.id === interaction.candidate?.profile.id) {
          const original = team.positions[interaction.originalSlot];
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
  if (!isEditor) drawSelectedProfileRing();
  publishSelectedProfilePosition();
  if (!interaction && cameraDifference > .0001) requestDraw();
}

function requestDraw() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(drawScene);
}

function resizeCanvas() {
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
  if (!isEditor && !initialViewerFitApplied) {
    fitPlacedBubbles();
    initialViewerFitApplied = true;
  }
  requestDraw();
}

function localPointer(event) {
  const rectangle = board.getBoundingClientRect();
  return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
}

function teamAt(x, y) {
  const sceneX = screenToSceneX(x);
  const sceneY = screenToSceneY(y);
  return [...renderedTeams].reverse().find((team) => {
    const state = teamState(team);
    return state.placed && Math.hypot(sceneX - state.x, sceneY - state.y) <= team.radius;
  }) ?? null;
}

function profileAt(x, y) {
  const sceneX = screenToSceneX(x);
  const sceneY = screenToSceneY(y);
  const profileRadius = profileLayoutConfig.profileDiameter / 2;
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

function persistBoard() {
  saveBoardState(boardState);
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

function renderUnplacedTeams() {
  if (!isEditor || !unplacedList) return;
  unplacedList.replaceChildren();
  renderedTeams.filter((team) => !teamState(team).placed).forEach((team) => {
    const item = document.createElement("div");
    item.className = "tray-team";
    item.dataset.teamId = team.id;
    item.title = `Drag ${team.name} onto the board`;
    const label = document.createElement("span");
    label.textContent = team.name;
    item.append(label);
    item.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const ghost = document.createElement("div");
      ghost.className = "tray-bubble-ghost";
      const previewScale = 84 / (team.radius * 2);
      team.profiles.forEach((profile) => {
        const position = profileSlotPosition(team, profile);
        const dot = document.createElement("span");
        dot.style.left = `${48 + position.x * previewScale}px`;
        dot.style.top = `${48 + position.y * previewScale}px`;
        dot.style.background = `linear-gradient(145deg, ${profile.colors[0]}, ${profile.colors[1]})`;
        ghost.append(dot);
      });
      document.body.append(ghost);
      interaction = { type: "tray", pointerId: event.pointerId, team, ghost };
      ghost.style.transform = `translate(${event.clientX - 48}px, ${event.clientY - 48}px)`;
      item.setPointerCapture(event.pointerId);
    });
    unplacedList.append(item);
  });
  unplacedList.classList.toggle("is-empty", unplacedList.children.length === 0);
}

brandCompany.textContent = organization.companyName;
brandSubtitle.textContent = isEditor ? `${organization.pageTitle} Editor` : organization.pageTitle;
resizeCanvas();
addEventListener("resize", resizeCanvas);
if (!isEditor) {
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
    focusColleague(event.detail?.personId, event.detail?.scale);
  });
  addEventListener("storage", (event) => {
    if (event.key === boardStateStorageKey) location.reload();
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

if (!isEditor) {
  board.addEventListener("pointermove", (event) => {
    if (interaction || selectedProfileId || event.target.closest(".viewer-search, .profile-popup-close")) {
      clearProfileHover();
      return;
    }
    const pointer = localPointer(event);
    const hovered = profileAt(pointer.x, pointer.y);
    const personId = hovered?.profile.id ?? null;
    board.classList.toggle("is-profile-hover", Boolean(personId));
    if (personId === hoverCandidateId) return;
    clearTimeout(hoverTimer);
    if (previewProfileId) {
      const previousId = previewProfileId;
      previewProfileId = null;
      dispatchEvent(new CustomEvent("boatboard:preview-colleague-end", { detail: { personId: previousId } }));
    }
    hoverCandidateId = personId;
    if (!hovered) return;
    hoverTimer = setTimeout(() => {
      if (hoverCandidateId !== personId || selectedProfileId) return;
      previewProfileId = personId;
      dispatchEvent(new CustomEvent("boatboard:preview-colleague", {
        detail: { personId, placement: "auto", x: pointer.x, y: pointer.y },
      }));
      requestDraw();
    }, 1000);
  });
  board.addEventListener("pointerleave", clearProfileHover);
}
if (isEditor) {
  saveBoardState(boardState);
  renderUnplacedTeams();
  panelToggle.addEventListener("click", () => {
    const collapsed = editorPanel.classList.toggle("is-collapsed");
    panelToggle.setAttribute("aria-expanded", String(!collapsed));
    panelToggle.setAttribute("aria-label", collapsed ? "Show teams panel" : "Hide teams panel");
  });
}

board.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (!isEditor) clearProfileHover();
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
  const pointer = localPointer(event);
  if (!isEditor) clearProfileHover();
  cameraEase = .24;
  targetCamera.scale = camera.scale;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  if (isEditor) {
    const source = profileAt(pointer.x, pointer.y);
    if (source) {
      interaction = { type: "connection", pointerId: event.pointerId, pointerX: pointer.x, pointerY: pointer.y, source, targetTeamId: null };
    } else {
      const team = teamAt(pointer.x, pointer.y);
      if (team) {
        const state = teamState(team);
        interaction = { type: "team", pointerId: event.pointerId, team, pointerX: event.clientX, pointerY: event.clientY, x: state.x, y: state.y };
      }
    }
  }
  if (!interaction) {
    interaction = {
      type: "pan", pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY,
      x: camera.x, y: camera.y, moved: false, clickProfile: isEditor ? null : profileAt(pointer.x, pointer.y),
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
    const state = teamState(interaction.team);
    state.x = interaction.x + (event.clientX - interaction.pointerX) / sceneScale();
    state.y = interaction.y + (event.clientY - interaction.pointerY) / sceneScale();
  } else if (interaction.type === "connection") {
    const pointer = localPointer(event);
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
  } else if (event.type === "pointerup" && completed.type === "connection" && completed.targetTeamId) {
    boardState.teams[completed.targetTeamId].leaderId = completed.source.profile.id;
    persistBoard();
  } else if (completed.type === "team") {
    const panelBounds = editorPanel?.getBoundingClientRect();
    if (panelBounds && event.clientX >= panelBounds.left && event.clientX <= panelBounds.right &&
        event.clientY >= panelBounds.top && event.clientY <= panelBounds.bottom) {
      teamState(completed.team).placed = false;
      renderUnplacedTeams();
    }
    persistBoard();
  } else if (completed.type === "tray") {
    completed.ghost.remove();
    const boardBounds = board.getBoundingClientRect();
    const droppedOnBoard = event.clientX >= boardBounds.left && event.clientX <= boardBounds.right &&
      event.clientY >= boardBounds.top && event.clientY <= boardBounds.bottom;
    if (droppedOnBoard) {
      const pointer = localPointer(event);
      const state = teamState(completed.team);
      state.x = screenToSceneX(pointer.x);
      state.y = screenToSceneY(pointer.y);
      state.placed = true;
      persistBoard();
      renderUnplacedTeams();
    }
  }
  interaction = null;
  board.classList.remove("is-panning");
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  requestDraw();
}

addEventListener("pointerup", stopInteraction);
addEventListener("pointercancel", stopInteraction);
if (isEditor) {
  board.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (ignoreNextContextMenu) {
      ignoreNextContextMenu = false;
      return;
    }
    const pointer = localPointer(event);
    const source = profileAt(pointer.x, pointer.y);
    if (source) {
      const leadershipStates = Object.values(boardState.teams)
        .filter((state) => state.leaderId === source.profile.id);
      if (leadershipStates.length === 0) {
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
      leadershipStates.forEach((state) => { state.leaderId = null; });
      persistBoard();
      return;
    }
    const team = teamAt(pointer.x, pointer.y);
    if (!team) return;
    teamState(team).placed = false;
    persistBoard();
    renderUnplacedTeams();
  });
  addEventListener("keydown", () => finishProfileReorder(false));
}
board.addEventListener("dblclick", (event) => {
  if (isEditor && (profileAt(localPointer(event).x, localPointer(event).y) || teamAt(localPointer(event).x, localPointer(event).y))) return;
  Object.assign(camera, { scale: 1, x: 0, y: 0 });
  Object.assign(targetCamera, camera);
  requestDraw();
});
