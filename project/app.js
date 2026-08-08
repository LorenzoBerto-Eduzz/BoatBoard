import { organization } from "./data/example-organization.js?v=boatboard-20260808-32";
import { boardConfig } from "./data/board-config.js";
import { getProfileArrangement, profileLayoutConfig } from "./layout/profile-arrangements.js?v=boatboard-20260808-26";

const board = document.querySelector(".board");
const brandCompany = document.querySelector(".brand-company");
const canvas = document.querySelector(".organization-canvas");
const context = canvas.getContext("2d", { alpha: true });
const teamGap = 12;
const teamColumns = Math.ceil(Math.sqrt(organization.teams.length));
const teamRows = Math.ceil(organization.teams.length / teamColumns);
const camera = { scale: 1, x: 0, y: 0 };
const targetCamera = { scale: 1, x: 0, y: 0 };
const viewport = { width: 0, height: 0, fitScale: 1, sceneLeft: 0, sceneTop: 0 };
const teamCacheScale = .4;
let frameRequested = false;
let panStart = null;

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const membersByTeam = new Map(organization.teams.map((team) => [team.id, []]));
organization.colleagues.forEach((person) => membersByTeam.get(person.teamId)?.push(person));

const largestTeamRadius = Math.max(...organization.teams.map((team) =>
  getProfileArrangement(membersByTeam.get(team.id).length).bubbleRadius));
const teamCellSize = largestTeamRadius * 2 + teamGap;
const logicalSceneSize = Math.max(1320, teamCellSize * Math.max(teamColumns, teamRows) + teamGap * 2);

const renderedTeams = organization.teams.map((team, index) => {
  const members = membersByTeam.get(team.id);
  const arrangement = getProfileArrangement(members.length);
  const column = index % teamColumns;
  const row = Math.floor(index / teamColumns);
  const centerX = (column + .5) * logicalSceneSize / teamColumns;
  const centerY = (row + .5) * logicalSceneSize / teamRows;

  return {
    ...team,
    centerX,
    centerY,
    radius: arrangement.bubbleRadius,
    profiles: arrangement.positions.map((position, profileIndex) => ({
      ...members[profileIndex],
      x: centerX + position.x,
      y: centerY + position.y,
    })),
  };
});

const profilesById = new Map(
  renderedTeams.flatMap((team) => team.profiles.map((profile) => [profile.id, profile])),
);

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
    const x = center + profile.x - team.centerX;
    const y = center + profile.y - team.centerY;
    const profileGradient = bitmapContext.createLinearGradient(
      x - profileRadius,
      y - profileRadius,
      x + profileRadius,
      y + profileRadius,
    );
    profileGradient.addColorStop(0, profile.colors[0]);
    profileGradient.addColorStop(1, profile.colors[1]);
    bitmapContext.fillStyle = profileGradient;
    bitmapContext.beginPath();
    bitmapContext.arc(x, y, profileRadius, 0, Math.PI * 2);
    bitmapContext.fill();
    bitmapContext.strokeStyle = "rgba(13, 21, 26, .9)";
    bitmapContext.lineWidth = 1;
    bitmapContext.stroke();
    bitmapContext.fillStyle = "rgba(255, 255, 255, .92)";
    bitmapContext.font = `700 ${profileRadius * .92}px Inter, ui-sans-serif, system-ui, sans-serif`;
    bitmapContext.textAlign = "center";
    bitmapContext.textBaseline = "middle";
    bitmapContext.fillText(initials(profile.name), x, y + profileRadius * .04);
  });
  return bitmap;
}

renderedTeams.forEach((team) => {
  team.bitmap = createTeamBitmap(team);
});

function sceneToScreenX(value) {
  return viewport.sceneLeft + camera.x + value * viewport.fitScale * camera.scale;
}

function sceneToScreenY(value) {
  return viewport.sceneTop + camera.y + value * viewport.fitScale * camera.scale;
}

function visibleCircle(x, y, radius) {
  return x + radius >= 0 && y + radius >= 0 && x - radius <= viewport.width && y - radius <= viewport.height;
}

function drawLeadershipLinks(sceneScale) {
  context.save();
  context.lineCap = "round";
  context.lineWidth = 2;
  context.strokeStyle = "rgba(112, 132, 142, .2)";

  renderedTeams.forEach((team) => {
    const leader = profilesById.get(team.leaderId);
    if (!leader) return;
    const startX = sceneToScreenX(leader.x);
    const startY = sceneToScreenY(leader.y);
    const targetX = sceneToScreenX(team.centerX);
    const targetY = sceneToScreenY(team.centerY);
    const dx = startX - targetX;
    const dy = startY - targetY;
    const distance = Math.hypot(dx, dy) || 1;
    const targetRadius = team.radius * sceneScale;
    const endX = targetX + dx / distance * targetRadius;
    const endY = targetY + dy / distance * targetRadius;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  });
  context.restore();
}

function drawBubble(team, centerX, centerY, radius, sceneScale) {
  const fade = Math.min(radius, 28 * sceneScale);
  const middle = Math.min(radius, 17 * sceneScale);
  const edge = Math.min(radius, 3 * sceneScale);
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(Math.max(0, (radius - fade) / radius), "rgba(105, 139, 155, 0)");
  gradient.addColorStop(Math.max(0, (radius - middle) / radius), "rgba(105, 139, 155, .018)");
  gradient.addColorStop(Math.max(0, (radius - edge) / radius), "rgba(143, 170, 181, .095)");
  gradient.addColorStop(1, "rgba(158, 183, 192, .155)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}

function drawProfile(profile, sceneScale) {
  const x = sceneToScreenX(profile.x);
  const y = sceneToScreenY(profile.y);
  const radius = profileLayoutConfig.profileDiameter / 2 * sceneScale;
  if (!visibleCircle(x, y, radius)) return;

  if (radius < 3) {
    context.fillStyle = profile.colors[0];
  } else {
    const gradient = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, profile.colors[0]);
    gradient.addColorStop(1, profile.colors[1]);
    context.fillStyle = gradient;
  }
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  if (radius >= 3) {
    context.strokeStyle = "rgba(13, 21, 26, .9)";
    context.lineWidth = Math.max(.7, sceneScale);
    context.stroke();
  }
  if (radius >= 7) {
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
  if (!panStart && cameraDifference > .0001) {
    const easing = .24;
    camera.scale += (targetCamera.scale - camera.scale) * easing;
    camera.x += (targetCamera.x - camera.x) * easing;
    camera.y += (targetCamera.y - camera.y) * easing;
  } else if (!panStart) {
    camera.scale = targetCamera.scale;
    camera.x = targetCamera.x;
    camera.y = targetCamera.y;
  }
  context.clearRect(0, 0, viewport.width, viewport.height);
  const sceneScale = viewport.fitScale * camera.scale;
  drawLeadershipLinks(sceneScale);

  renderedTeams.forEach((team) => {
    const centerX = sceneToScreenX(team.centerX);
    const centerY = sceneToScreenY(team.centerY);
    const radius = team.radius * sceneScale;
    if (!visibleCircle(centerX, centerY, radius)) return;
    if (sceneScale <= teamCacheScale) {
      context.drawImage(team.bitmap, centerX - radius, centerY - radius, radius * 2, radius * 2);
      return;
    }
    drawBubble(team, centerX, centerY, radius, sceneScale);
    team.profiles.forEach((profile) => drawProfile(profile, sceneScale));
  });
  if (!panStart && cameraDifference > .0001) requestDraw();
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
  requestDraw();
}

brandCompany.textContent = boardConfig.companyName;
resizeCanvas();
addEventListener("resize", resizeCanvas);

board.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rectangle = board.getBoundingClientRect();
  const cursorX = event.clientX - rectangle.left;
  const cursorY = event.clientY - rectangle.top;
  const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1;
  const normalizedDelta = Math.max(-120, Math.min(120, event.deltaY * deltaMultiplier));
  const depthBoost = .8 + Math.sqrt(targetCamera.scale) * .2;
  const gestureBoost = event.ctrlKey ? 1.35 : 1;
  const sensitivity = .0054 * depthBoost * gestureBoost;
  const nextScale = Math.min(30, Math.max(1, targetCamera.scale * Math.exp(-normalizedDelta * sensitivity)));
  const ratio = nextScale / targetCamera.scale;
  targetCamera.x = cursorX - viewport.sceneLeft
    - (cursorX - viewport.sceneLeft - targetCamera.x) * ratio;
  targetCamera.y = cursorY - viewport.sceneTop
    - (cursorY - viewport.sceneTop - targetCamera.y) * ratio;
  targetCamera.scale = nextScale;
  board.classList.toggle("is-zoomed", targetCamera.scale > 1);
  requestDraw();
}, { passive: false });

board.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  targetCamera.scale = camera.scale;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  panStart = { pointerX: event.clientX, pointerY: event.clientY, x: camera.x, y: camera.y };
  board.setPointerCapture(event.pointerId);
  board.classList.add("is-panning");
});

board.addEventListener("pointermove", (event) => {
  if (!panStart) return;
  camera.x = panStart.x + event.clientX - panStart.pointerX;
  camera.y = panStart.y + event.clientY - panStart.pointerY;
  targetCamera.x = camera.x;
  targetCamera.y = camera.y;
  requestDraw();
});

function stopPanning(event) {
  if (!panStart) return;
  panStart = null;
  board.classList.remove("is-panning");
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
}

board.addEventListener("pointerup", stopPanning);
board.addEventListener("pointercancel", stopPanning);
board.addEventListener("dblclick", () => {
  camera.scale = 1;
  camera.x = 0;
  camera.y = 0;
  targetCamera.scale = 1;
  targetCamera.x = 0;
  targetCamera.y = 0;
  board.classList.remove("is-zoomed", "is-panning");
  requestDraw();
});
