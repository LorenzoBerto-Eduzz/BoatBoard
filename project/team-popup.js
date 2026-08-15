import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-79";
import { loadBoardState } from "./data/board-state.js?v=boatboard-20260811-108";

const popup = document.querySelector(".team-popup");
const closeButton = popup?.querySelector(".team-popup-close");
const content = popup?.querySelector(".team-popup-content");
const organization = popup ? await loadOrganization() : null;
const boardState = popup ? await loadBoardState() : null;
const teamsById = new Map(organization?.teams.map((team) => [team.id, team]) ?? []);
const peopleById = new Map(organization?.colleagues.map((person) => [person.id, person]) ?? []);
let selectedTeamId = null;
let preferredPlacement = "bottom-right";
let placementLocked = false;
let ensureVisibleOnPosition = false;
let selectionSource = "canvas";
let requestExistingPopupMove = false;
const popupTransitionMs = 160;
const popupInEasing = "cubic-bezier(.22, .7, .28, 1)";
const popupOutEasing = "cubic-bezier(.72, 0, .78, .3)";

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function sizeDescription(element, defaultLines) {
  requestAnimationFrame(() => {
    const styles = getComputedStyle(element);
    const lineHeight = parseFloat(styles.lineHeight);
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const chrome = padding + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const textLines = Math.max(1, Math.ceil(Math.max(0, element.scrollHeight - padding) / lineHeight));
    const visibleLines = textLines >= defaultLines ? Math.min(6, Math.max(defaultLines, textLines)) + .5 : defaultLines;
    element.style.height = `${visibleLines * lineHeight + chrome}px`;
    element.style.overflowY = textLines > 6 ? "auto" : "hidden";
  });
}

function createAvatar(person) {
  const avatar = document.createElement("span");
  avatar.className = "team-popup-avatar";
  avatar.style.setProperty("--avatar-light", person.colors[0]);
  avatar.style.setProperty("--avatar-dark", person.colors[1]);
  if (person.imageUrl) {
    const image = document.createElement("img");
    image.src = person.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => { image.remove(); avatar.textContent = initials(person.name); });
    avatar.append(image);
  } else avatar.textContent = initials(person.name);
  return avatar;
}

function createMember(person) {
  const button = document.createElement("button");
  button.className = "team-popup-member";
  button.type = "button";
  const name = document.createElement("span");
  name.className = "team-popup-member-name";
  name.textContent = person.name;
  button.append(createAvatar(person), name);
  button.addEventListener("click", () => {
    dispatchEvent(new CustomEvent("boatboard:select-colleague", {
      detail: { personId: person.id, placement: "auto", source: "team-popup" },
    }));
  });
  return button;
}

function renderTeam(teamId) {
  const team = teamsById.get(teamId);
  if (!team || !content) return;
  content.replaceChildren();
  const title = document.createElement("div");
  title.className = "team-popup-title";
  title.textContent = team.name;
  const description = document.createElement("div");
  description.className = "team-popup-description";
  description.textContent = team.description || "Example team description. Additional information can continue on a new line.";
  const members = document.createElement("div");
  members.className = "team-popup-members";
  const membersViewport = document.createElement("div");
  membersViewport.className = "team-popup-members-viewport";
  const teamMembers = organization.colleagues.filter((person) => person.teamId === teamId)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  teamMembers.forEach((person) => members.append(createMember(person)));
  const leader = peopleById.get(boardState?.teams?.[teamId]?.leaderId);
  if (leader) {
    const leaderCell = document.createElement("div");
    leaderCell.className = "team-popup-leader-cell";
    const label = document.createElement("small");
    label.className = "team-popup-leader-label";
    label.textContent = "Líder";
    leaderCell.append(createMember(leader));
    members.append(leaderCell, label);
  }
  const totalRows = Math.ceil(teamMembers.length / 2) + (leader ? 1 : 0);
  const visibleRows = Math.max(1, Math.min(6, totalRows));
  const viewportHeight = (visibleRows + 1 / 3) * 52 + visibleRows * 2.88;
  membersViewport.style.setProperty("--team-member-viewport-height", `${viewportHeight}px`);
  membersViewport.append(members);
  content.append(title, membersViewport, description);
  sizeDescription(description, 3);
}

function animateOutgoingPopup() {
  const outgoing = popup.cloneNode(true);
  outgoing.classList.add("popup-outgoing", "is-open");
  outgoing.removeAttribute("aria-label");
  outgoing.setAttribute("aria-hidden", "true");
  popup.parentElement.append(outgoing);
  const animation = outgoing.animate([
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(.2)" },
  ], { duration: popupTransitionMs, easing: popupOutEasing, fill: "forwards" });
  animation.finished.finally(() => outgoing.remove());
}

function animatePopupIn() {
  popup.getAnimations().forEach((animation) => animation.cancel());
  popup.classList.add("is-open");
  popup.animate([
    { opacity: 0, transform: "scale(.2)" },
    { opacity: 1, transform: "scale(1)" },
  ], { duration: popupTransitionMs, easing: popupInEasing });
}

function animatePopupOut() {
  popup.getAnimations().forEach((animation) => animation.cancel());
  const animation = popup.animate([
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(.2)" },
  ], { duration: popupTransitionMs, easing: popupOutEasing, fill: "forwards" });
  animation.finished.finally(() => {
    popup.classList.remove("is-open");
    animation.cancel();
  });
}

function ensureVisible() {
  const margin = 18;
  const tolerance = 2;
  const rectangles = [...document.querySelectorAll(
    ".profile-popup.is-open:not(.popup-outgoing), .team-popup.is-open:not(.popup-outgoing)",
  )].map((element) => element.getBoundingClientRect());
  const rectangle = {
    left: Math.min(...rectangles.map((item) => item.left)),
    right: Math.max(...rectangles.map((item) => item.right)),
    top: Math.min(...rectangles.map((item) => item.top)),
    bottom: Math.max(...rectangles.map((item) => item.bottom)),
  };
  const searchRectangle = document.querySelector(".viewer-search.is-open .viewer-search-panel")?.getBoundingClientRect();
  const leftBoundary = searchRectangle ? searchRectangle.right + margin : margin;
  const dx = rectangle.left < leftBoundary - tolerance ? leftBoundary - rectangle.left
    : rectangle.right > innerWidth - margin + tolerance ? innerWidth - margin - rectangle.right : 0;
  const dy = rectangle.top < margin - tolerance ? margin - rectangle.top
    : rectangle.bottom > innerHeight - margin + tolerance ? innerHeight - margin - rectangle.bottom : 0;
  if (dx || dy) dispatchEvent(new CustomEvent("boatboard:ensure-popup-visible", { detail: { dx, dy } }));
}

function placementCandidates(x, y) {
  const horizontal = x < innerWidth / 2 ? "right" : "left";
  const vertical = y < innerHeight / 2 ? "bottom" : "top";
  const oppositeHorizontal = horizontal === "right" ? "left" : "right";
  const oppositeVertical = vertical === "bottom" ? "top" : "bottom";
  return [`${vertical}-${horizontal}`, `${oppositeVertical}-${horizontal}`, `${vertical}-${oppositeHorizontal}`, `${oppositeVertical}-${oppositeHorizontal}`];
}

function rectangleFor(placement, x, y) {
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  return {
    left: placement.endsWith("left") ? x - width : x,
    right: placement.endsWith("left") ? x : x + width,
    top: placement.startsWith("top") ? y - height : y,
    bottom: placement.startsWith("top") ? y : y + height,
  };
}

function overlapArea(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function bestPlacement(x, y, radius, contentCenterX, contentCenterY, ignoreProfile = false) {
  const profile = ignoreProfile ? null : document.querySelector(".profile-popup.is-open:not(.popup-outgoing)")?.getBoundingClientRect();
  const search = document.querySelector(".viewer-search.is-open .viewer-search-panel")?.getBoundingClientRect();
  const occupied = [profile, search].filter(Boolean);
  return placementCandidates(x, y).sort((left, right) => {
    const anchor = (placement) => ({
      x: x + (placement.endsWith("right") ? radius : -radius),
      y: y + (placement.startsWith("bottom") ? radius : -radius),
    });
    const leftAnchor = anchor(left);
    const rightAnchor = anchor(right);
    const leftRect = rectangleFor(left, leftAnchor.x, leftAnchor.y);
    const rightRect = rectangleFor(right, rightAnchor.x, rightAnchor.y);
    const overflow = (rect) => Math.max(0, -rect.left) + Math.max(0, rect.right - innerWidth)
      + Math.max(0, -rect.top) + Math.max(0, rect.bottom - innerHeight);
    const occupiedOverlap = (rect) => occupied.reduce((total, obstacle) => total + overlapArea(rect, obstacle), 0);
    const distanceFromContent = (rect) => Math.hypot(
      (rect.left + rect.right) / 2 - contentCenterX,
      (rect.top + rect.bottom) / 2 - contentCenterY,
    );
    const score = (rect) => occupiedOverlap(rect) * 1e9 + overflow(rect) * 1e5 - distanceFromContent(rect);
    return score(leftRect) - score(rightRect);
  })[0];
}

function closePopup() {
  selectedTeamId = null;
  placementLocked = false;
  delete popup.dataset.openOrder;
  animatePopupOut();
  popup.setAttribute("aria-hidden", "true");
  dispatchEvent(new CustomEvent("boatboard:close-team"));
}

if (popup) {
  addEventListener("boatboard:select-team", (event) => {
    const teamId = event.detail?.teamId ?? null;
    if (teamId === selectedTeamId && popup.classList.contains("is-open")) return closePopup();
    if (selectedTeamId && popup.classList.contains("is-open")) {
      animateOutgoingPopup();
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
    }
    selectedTeamId = teamId;
    if (teamId) {
      window.boatboardUiLayerSequence = (window.boatboardUiLayerSequence ?? 0) + 1;
      popup.dataset.openOrder = String(window.boatboardUiLayerSequence);
    }
    selectionSource = event.detail?.source ?? "canvas";
    requestExistingPopupMove = selectionSource === "profile-popup";
    if (teamId) renderTeam(teamId);
    ensureVisibleOnPosition = Boolean(document.querySelector(".profile-popup.is-open:not(.popup-outgoing)"));
    preferredPlacement = event.detail?.placement ?? preferredPlacement;
    placementLocked = Boolean(event.detail?.placement);
    popup.setAttribute("aria-hidden", String(!teamId));
    if (teamId) animatePopupIn();
  });
  addEventListener("boatboard:team-position", (event) => {
    if (!selectedTeamId || event.detail?.teamId !== selectedTeamId) return;
    const radius = Math.max(0, event.detail.radius);
    const cornerOffset = radius / Math.SQRT2;
    const x = event.detail.x;
    const y = event.detail.y;
    if (!placementLocked) {
      preferredPlacement = bestPlacement(x, y, cornerOffset, event.detail.contentCenterX, event.detail.contentCenterY, false);
      placementLocked = true;
    }
    const anchorX = x + (preferredPlacement.endsWith("right") ? cornerOffset : -cornerOffset);
    const anchorY = y + (preferredPlacement.startsWith("bottom") ? cornerOffset : -cornerOffset);
    popup.dataset.placement = preferredPlacement;
    popup.style.setProperty("--team-anchor-x", `${anchorX}px`);
    popup.style.setProperty("--team-anchor-y", `${anchorY}px`);
    if (requestExistingPopupMove) {
      requestExistingPopupMove = false;
      requestAnimationFrame(() => {
        const profilePopup = document.querySelector(".profile-popup.is-open:not(.popup-outgoing)");
        if (!profilePopup) return;
        const left = popup.getBoundingClientRect();
        const right = profilePopup.getBoundingClientRect();
        if (Math.min(left.right, right.right) > Math.max(left.left, right.left)
            && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top)) {
          dispatchEvent(new CustomEvent("boatboard:reanchor-profile"));
        }
      });
    }
    if (ensureVisibleOnPosition) {
      ensureVisibleOnPosition = false;
      setTimeout(ensureVisible, popupTransitionMs + 16);
    }
  });
  addEventListener("boatboard:reanchor-team", () => {
    if (!selectedTeamId) return;
    placementLocked = false;
    dispatchEvent(new CustomEvent("boatboard:refresh-popup-positions"));
  });
  closeButton.addEventListener("click", closePopup);
  popup.addEventListener("pointerdown", (event) => event.stopPropagation());
  popup.addEventListener("dblclick", (event) => event.stopPropagation());
  popup.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  addEventListener("boatboard:enter-edit-mode", closePopup);
}
