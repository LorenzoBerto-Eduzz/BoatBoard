import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-79";
import { loadBoardState } from "./data/board-state.js?v=boatboard-20260811-108";
import { popupViewportCorrection } from "./popup-visibility.js?v=boatboard-20260822-170";
import { compactPopupLayoutMedia, compactTouchUiMedia } from "./responsive-layout.js?v=boatboard-20260824-1";

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
let checkDirectTeamOcclusion = false;
const popupTransitionMs = 160;
const popupInEasing = "cubic-bezier(.22, .7, .28, 1)";
const popupOutEasing = "cubic-bezier(.72, 0, .78, .3)";

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function sizeDescription(element, defaultLines, options = {}) {
  requestAnimationFrame(() => {
    const styles = getComputedStyle(element);
    const lineHeight = parseFloat(styles.lineHeight);
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const chrome = padding + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const textLines = Math.max(1, Math.ceil(Math.max(0, element.scrollHeight - padding) / lineHeight));
    const visibleLines = compactTouchUiMedia.matches
      ? Math.min(6, Math.max(defaultLines, textLines))
      : options.exactLines
        ? Math.min(6, Math.max(defaultLines, textLines))
        : textLines >= defaultLines ? Math.min(6, Math.max(defaultLines, textLines)) + .5 : defaultLines;
    element.style.height = `${visibleLines * lineHeight + chrome}px`;
    element.style.overflowY = textLines > 6 ? "auto" : "hidden";
    options.onSized?.({ lineHeight, textLines, visibleLines });
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

function createMember(person, isLeader = false) {
  const button = document.createElement("button");
  button.className = "team-popup-member";
  button.classList.toggle("is-leader", isLeader);
  button.type = "button";
  const name = document.createElement("span");
  name.className = "team-popup-member-name";
  name.textContent = person.name;
  button.append(createAvatar(person), name);
  if (isLeader) {
    const label = document.createElement("small");
    label.className = "team-popup-leader-label";
    label.textContent = "Líder";
    button.append(label);
  }
  button.addEventListener("click", () => {
    dispatchEvent(new CustomEvent("boatboard:select-colleague", {
      detail: { personId: person.id, placement: "auto", source: "team-popup" },
    }));
    if (compactPopupLayoutMedia.matches) {
      dispatchEvent(new CustomEvent("boatboard:focus-colleague", {
        detail: { personId: person.id, fitPopup: true },
      }));
    }
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
  const leader = peopleById.get(boardState?.teams?.[teamId]?.leaderId);
  const listedPeople = [
    ...teamMembers.filter((person) => person.id !== leader?.id),
    ...(leader ? [leader] : []),
  ];
  listedPeople.forEach((person) => members.append(createMember(person, person.id === leader?.id)));
  const totalRows = Math.ceil(listedPeople.length / 2);
  const compactSheetLayout = compactPopupLayoutMedia.matches;
  const visibleRows = compactSheetLayout
    ? Math.max(2, Math.min(4, totalRows))
    : Math.max(1, Math.min(7, totalRows));
  const partialRow = compactSheetLayout ? .2 : .3;
  const compactTouchLayout = compactTouchUiMedia.matches;
  const memberRowHeight = compactTouchLayout ? 38 : 52;
  const memberRowGap = compactTouchLayout ? 0.96 : compactSheetLayout ? 2.24 : 4.8;
  const viewportHeight = (visibleRows + partialRow) * memberRowHeight + visibleRows * memberRowGap;
  membersViewport.style.setProperty("--team-member-viewport-height", `${viewportHeight}px`);
  membersViewport.append(members);
  content.append(title, membersViewport, description);
  sizeDescription(description, 3, {
    exactLines: !compactSheetLayout,
    onSized: ({ lineHeight, visibleLines }) => {
      if (compactSheetLayout) return;
      const minimumViewportHeight = 1.3 * memberRowHeight + memberRowGap;
      const descriptionGrowth = Math.max(0, visibleLines - 3) * lineHeight;
      const adjustedViewportHeight = Math.max(minimumViewportHeight, viewportHeight - descriptionGrowth);
      membersViewport.style.setProperty("--team-member-viewport-height", `${adjustedViewportHeight}px`);
    },
  });
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
  const rectangle = popup.getBoundingClientRect();
  const searchRectangle = document.querySelector(".viewer-search.is-open .viewer-search-panel")?.getBoundingClientRect();
  const { dx, dy } = popupViewportCorrection(rectangle, searchRectangle);
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
  checkDirectTeamOcclusion = false;
  placementLocked = false;
  delete popup.dataset.openOrder;
  animatePopupOut();
  popup.setAttribute("aria-hidden", "true");
  dispatchEvent(new CustomEvent("boatboard:close-team"));
}

function compactTeamRequiresTopLeftProfile() {
  if (!compactPopupLayoutMedia.matches) return false;
  const profilePopup = document.querySelector(".profile-popup.is-open:not(.popup-outgoing)");
  if (!profilePopup) return false;
  if (document.querySelector(".viewer-search.is-open .viewer-search-panel")) return true;
  if (profilePopup.dataset.placement?.startsWith("bottom")) return true;
  const profileRectangle = profilePopup.getBoundingClientRect();
  const teamTop = popup.offsetTop;
  const teamLeft = popup.offsetLeft;
  const teamRight = teamLeft + popup.offsetWidth;
  return profileRectangle.bottom > teamTop
    && profileRectangle.right > teamLeft
    && profileRectangle.left < teamRight;
}

if (popup) {
  addEventListener("boatboard:select-team", (event) => {
    if (document.body.classList.contains("editor-mode")) return;
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
      popup.style.zIndex = String(20 + window.boatboardUiLayerSequence);
    }
    selectionSource = event.detail?.source ?? "canvas";
    checkDirectTeamOcclusion = compactPopupLayoutMedia.matches && selectionSource === "canvas";
    requestExistingPopupMove = selectionSource === "profile-popup";
    if (teamId) renderTeam(teamId);
    ensureVisibleOnPosition = Boolean(teamId);
    preferredPlacement = event.detail?.placement ?? preferredPlacement;
    placementLocked = Boolean(event.detail?.placement);
    popup.setAttribute("aria-hidden", String(!teamId));
    if (teamId) {
      animatePopupIn();
      if (compactPopupLayoutMedia.matches) {
        requestAnimationFrame(() => {
          if (!popup.classList.contains("is-open")) return;
          if (compactTeamRequiresTopLeftProfile()) {
            dispatchEvent(new CustomEvent("boatboard:reanchor-profile-top-left"));
          }
        });
      }
      if (compactPopupLayoutMedia.matches && selectionSource !== "canvas") {
        requestAnimationFrame(() => {
          if (selectedTeamId !== teamId || !popup.classList.contains("is-open")) return;
          dispatchEvent(new CustomEvent("boatboard:focus-team", {
            detail: { teamId, source: selectionSource },
          }));
        });
      }
    }
  });
  addEventListener("boatboard:team-position", (event) => {
    if (!selectedTeamId || event.detail?.teamId !== selectedTeamId) return;
    if (compactPopupLayoutMedia.matches) {
      ensureVisibleOnPosition = false;
      requestExistingPopupMove = false;
      if (checkDirectTeamOcclusion) {
        checkDirectTeamOcclusion = false;
        const bubbleBottom = event.detail.y + Math.max(0, event.detail.radius);
        requestAnimationFrame(() => {
          if (!popup.classList.contains("is-open") || bubbleBottom <= popup.offsetTop) return;
          dispatchEvent(new CustomEvent("boatboard:focus-team", {
            detail: { teamId: selectedTeamId, source: "covered-canvas" },
          }));
        });
      }
      return;
    }
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
