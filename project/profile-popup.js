import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-79";
import { loadBoardState } from "./data/board-state.js?v=boatboard-20260811-108";
import { popupViewportCorrection } from "./popup-visibility.js?v=boatboard-20260822-170";
import { compactPopupLayoutMedia, compactTouchUiMedia } from "./responsive-layout.js?v=boatboard-20260824-1";

const popup = document.querySelector(".profile-popup");
const closeButton = popup?.querySelector(".profile-popup-close");
const content = popup?.querySelector(".profile-popup-content");
let pinnedPersonId = null;
let previewPersonId = null;
let placement = "top-left";
let placementLocked = false;
let ensureVisibleOnPosition = false;
let ensureVisibleTimer = 0;
let selectionSource = "canvas";
let requestExistingPopupMove = false;
let closeActivationTimer = 0;
let pinnedOpenedAt = 0;
const popupTransitionMs = 160;
const popupInEasing = "cubic-bezier(.22, .7, .28, 1)";
const popupOutEasing = "cubic-bezier(.72, 0, .78, .3)";

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
  clearTimeout(closeActivationTimer);
  closeButton.disabled = true;
  popup.classList.add("is-open");
  popup.animate([
    { opacity: 0, transform: "scale(.2)" },
    { opacity: 1, transform: "scale(1)" },
  ], { duration: popupTransitionMs, easing: popupInEasing });
  closeActivationTimer = setTimeout(() => {
    closeActivationTimer = 0;
    closeButton.disabled = false;
  }, popupTransitionMs + 40);
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
  if (compactPopupLayoutMedia.matches) {
    const margin = 8;
    const teamRectangle = document.querySelector(".team-popup.is-open:not(.popup-outgoing)")?.getBoundingClientRect();
    const leftBoundary = margin;
    const rightBoundary = (searchRectangle?.left ?? innerWidth) - margin;
    const bottomBoundary = (teamRectangle?.top ?? innerHeight) - margin;
    const dx = rectangle.left < leftBoundary ? leftBoundary - rectangle.left
      : rectangle.right > rightBoundary ? rightBoundary - rectangle.right : 0;
    let dy = 0;
    if (rectangle.top < margin) dy = margin - rectangle.top;
    else if (rectangle.bottom > bottomBoundary) {
      const alignBottom = bottomBoundary - rectangle.bottom;
      dy = rectangle.top + alignBottom >= margin ? alignBottom : margin - rectangle.top;
    }
    if (dx || dy) dispatchEvent(new CustomEvent("boatboard:ensure-popup-visible", { detail: { dx, dy } }));
    return;
  }
  const { dx, dy } = popupViewportCorrection(rectangle, searchRectangle);
  if (dx || dy) dispatchEvent(new CustomEvent("boatboard:ensure-popup-visible", { detail: { dx, dy } }));
}
const organization = popup ? await loadOrganization() : null;
const savedBoardState = popup ? await loadBoardState() : null;
const peopleById = new Map(organization?.colleagues.map((person) => [person.id, person]) ?? []);
const teamsById = new Map(organization?.teams.map((team) => [team.id, team]) ?? []);

function automaticPlacement(x, y) {
  const horizontal = x < innerWidth / 2 ? "right" : "left";
  const vertical = y < innerHeight / 2 ? "bottom" : "top";
  return `${vertical}-${horizontal}`;
}

function placementCandidates(preferred) {
  const horizontal = preferred.endsWith("right") ? "right" : "left";
  const vertical = preferred.startsWith("bottom") ? "bottom" : "top";
  const oppositeHorizontal = horizontal === "right" ? "left" : "right";
  const oppositeVertical = vertical === "bottom" ? "top" : "bottom";
  return [preferred, `${oppositeVertical}-${horizontal}`, `${vertical}-${oppositeHorizontal}`, `${oppositeVertical}-${oppositeHorizontal}`];
}

function popupRectangle(candidate, x, y, offset) {
  const anchorX = x + (candidate.endsWith("right") ? offset : -offset);
  const anchorY = y + (candidate.startsWith("bottom") ? offset : -offset);
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  return {
    left: candidate.endsWith("left") ? anchorX - width : anchorX,
    right: candidate.endsWith("left") ? anchorX : anchorX + width,
    top: candidate.startsWith("top") ? anchorY - height : anchorY,
    bottom: candidate.startsWith("top") ? anchorY : anchorY + height,
  };
}

function choosePlacement(preferred, x, y, offset, contentCenterX, contentCenterY, ignoreTeam = false) {
  const teamRectangle = ignoreTeam ? null : document.querySelector(".team-popup.is-open:not(.popup-outgoing)")?.getBoundingClientRect();
  const searchRectangle = document.querySelector(".viewer-search.is-open .viewer-search-panel")?.getBoundingClientRect();
  const occupied = [teamRectangle, searchRectangle].filter(Boolean);
  const overlapArea = (rectangle, obstacle) => Math.max(0, Math.min(rectangle.right, obstacle.right) - Math.max(rectangle.left, obstacle.left))
    * Math.max(0, Math.min(rectangle.bottom, obstacle.bottom) - Math.max(rectangle.top, obstacle.top));
  const occupiedOverlap = (rectangle) => occupied.reduce((total, obstacle) => total + overlapArea(rectangle, obstacle), 0);
  const overflow = (rectangle) => Math.max(0, -rectangle.left) + Math.max(0, rectangle.right - innerWidth)
    + Math.max(0, -rectangle.top) + Math.max(0, rectangle.bottom - innerHeight);
  const distanceFromContent = (rectangle) => Math.hypot(
    (rectangle.left + rectangle.right) / 2 - contentCenterX,
    (rectangle.top + rectangle.bottom) / 2 - contentCenterY,
  );
  return placementCandidates(preferred).sort((left, right) => {
    const leftRectangle = popupRectangle(left, x, y, offset);
    const rightRectangle = popupRectangle(right, x, y, offset);
    const score = (rectangle) => occupiedOverlap(rectangle) * 1e9 + overflow(rectangle) * 1e5 - distanceFromContent(rectangle);
    return score(leftRectangle) - score(rightRectangle);
  })[0];
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function openProfileImage(imageUrl, name) {
  let viewer = document.querySelector(".profile-image-viewer");
  if (!viewer) {
    viewer = document.createElement("div");
    viewer.className = "profile-image-viewer";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Profile image viewer");
    viewer.tabIndex = -1;
    const image = document.createElement("img");
    viewer.append(image);
    viewer.addEventListener("pointerdown", (event) => event.stopPropagation());
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) viewer.classList.remove("is-open");
    });
    viewer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") viewer.classList.remove("is-open");
    });
    document.body.append(viewer);
  }
  const image = viewer.querySelector("img");
  image.src = imageUrl;
  image.alt = `${name} profile`;
  viewer.classList.add("is-open");
  viewer.focus({ preventScroll: true });
}

async function copyContactValue(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Local-network HTTP pages may not receive the secure-context Clipboard API.
  }
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.readOnly = true;
  helper.style.cssText = "position:fixed;opacity:0;pointer-events:none;inset:auto auto 0 0";
  document.body.append(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);
  const copied = document.execCommand("copy");
  helper.remove();
  return copied;
}

function sizeDescription(element, defaultLines) {
  requestAnimationFrame(() => {
    const styles = getComputedStyle(element);
    const lineHeight = parseFloat(styles.lineHeight);
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const chrome = padding + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const textLines = Math.max(1, Math.ceil(Math.max(0, element.scrollHeight - padding) / lineHeight));
    const visibleLines = compactTouchUiMedia.matches
      ? defaultLines
      : textLines >= defaultLines ? Math.min(6, Math.max(defaultLines, textLines)) + .5 : defaultLines;
    element.style.height = `${visibleLines * lineHeight + chrome}px`;
    element.style.minHeight = element.style.height;
    element.style.overflowY = textLines > (compactTouchUiMedia.matches ? defaultLines : 6) ? "auto" : "hidden";
  });
}

function renderPerson(personId) {
  const person = peopleById.get(personId);
  if (!person || !content) return;
  content.replaceChildren();
  const avatar = document.createElement("div");
  avatar.className = "profile-popup-avatar";
  avatar.style.setProperty("--avatar-light", person.colors[0]);
  avatar.style.setProperty("--avatar-dark", person.colors[1]);
  if (person.imageUrl) {
    const image = document.createElement("img");
    image.src = person.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
      image.remove();
      avatar.classList.remove("is-image-clickable");
      avatar.removeAttribute("role");
      avatar.removeAttribute("tabindex");
      avatar.textContent = initials(person.name);
    });
    avatar.classList.add("is-image-clickable");
    avatar.setAttribute("role", "button");
    avatar.tabIndex = 0;
    avatar.addEventListener("click", () => openProfileImage(person.imageUrl, person.name));
    avatar.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openProfileImage(person.imageUrl, person.name);
    });
    avatar.append(image);
  } else avatar.textContent = initials(person.name);

  const name = document.createElement("div");
  name.className = "profile-popup-name";
  name.textContent = person.name;

  const contact = (labelText, value) => {
    const block = document.createElement("button");
    block.type = "button";
    block.className = "profile-popup-detail";
    const label = document.createElement("small");
    label.textContent = labelText;
    const contentValue = document.createElement("div");
    contentValue.className = "profile-popup-detail-value";
    const valueText = document.createElement("span");
    const fallback = labelText === "WhatsApp" ? "+55 (00) 00000-0000"
      : labelText === "Email" ? "colleague@example.com" : "@example-user";
    const displayedValue = value || fallback;
    valueText.textContent = displayedValue;
    const copiedIndicator = document.createElement("span");
    copiedIndicator.className = "profile-popup-copy-indicator";
    copiedIndicator.setAttribute("aria-hidden", "true");
    copiedIndicator.innerHTML = '<svg viewBox="0 0 20 20"><path d="m4.5 10.25 3.35 3.35 7.65-7.65" /></svg>';
    contentValue.append(valueText, copiedIndicator);
    block.append(label, contentValue);
    block.setAttribute("aria-label", `Copy ${labelText}: ${displayedValue}`);
    let copiedTimer = 0;
    block.addEventListener("click", async () => {
      if (!await copyContactValue(displayedValue)) return;
      clearTimeout(copiedTimer);
      const indicatorSize = copiedIndicator.offsetWidth || 24;
      const textRange = document.createRange();
      textRange.selectNodeContents(valueText);
      const textRectangle = textRange.getBoundingClientRect();
      const valueRectangle = contentValue.getBoundingClientRect();
      const renderedTextWidth = textRectangle.width;
      textRange.detach();
      const availableLeft = Math.max(0, contentValue.clientWidth - indicatorSize);
      contentValue.style.setProperty("--copy-indicator-left", `${Math.min(renderedTextWidth + 5, availableLeft)}px`);
      contentValue.style.setProperty("--copy-indicator-top", `${textRectangle.top - valueRectangle.top + textRectangle.height / 2}px`);
      copiedIndicator.classList.add("is-visible");
      copiedTimer = setTimeout(() => copiedIndicator.classList.remove("is-visible"), 2000);
    });
    return block;
  };

  const description = document.createElement("div");
  description.className = "profile-popup-description";
  description.textContent = person.description || "Example colleague description.\nAdditional information can continue on a new line.";
  const team = document.createElement("section");
  team.className = "profile-popup-team";
  const primaryTeam = teamsById.get(person.teamId);
  const ledTeams = organization.teams.filter((candidate) =>
    candidate.id !== person.teamId && savedBoardState?.teams?.[candidate.id]?.leaderId === person.id);
  [primaryTeam, ...ledTeams].filter(Boolean).forEach((profileTeam, index) => {
    const teamButton = document.createElement("button");
    teamButton.type = "button";
    teamButton.setAttribute("aria-label", profileTeam.name);
    teamButton.addEventListener("click", () => {
      dispatchEvent(new CustomEvent("boatboard:select-team", { detail: { teamId: profileTeam.id, source: "profile-popup" } }));
    });
    if (index === 0) {
      teamButton.classList.add("is-primary");
      const teamLabel = document.createElement("span");
      teamLabel.className = "profile-popup-team-label";
      teamLabel.textContent = "Equipe";
      teamButton.append(teamLabel);
    }
    const teamName = document.createElement("span");
    teamName.className = "profile-popup-team-name";
    teamName.textContent = profileTeam.name;
    teamButton.append(teamName);
    team.append(teamButton);
  });
  content.append(avatar, name, contact("WhatsApp", person.whatsapp), contact("Discord", person.discord), contact("Email", person.email), description, team);
  sizeDescription(description, 4);
}

if (popup) {
  function closePopup() {
    clearTimeout(closeActivationTimer);
    closeActivationTimer = 0;
    closeButton.disabled = false;
    clearTimeout(ensureVisibleTimer);
    ensureVisibleTimer = 0;
    pinnedPersonId = null;
    previewPersonId = null;
    placementLocked = false;
    delete popup.dataset.openOrder;
    animatePopupOut();
    popup.setAttribute("aria-hidden", "true");
    dispatchEvent(new CustomEvent("boatboard:close-colleague"));
  }

  addEventListener("boatboard:select-colleague", (event) => {
    if (document.body.classList.contains("editor-mode")) return;
    if (event.detail?.source === "canvas" && pinnedPersonId === event.detail?.personId && popup.classList.contains("is-open")) {
      if (performance.now() - pinnedOpenedAt < popupTransitionMs + 120) return;
      closePopup();
      return;
    }
    const selectedPersonId = event.detail?.personId ?? null;
    const compactSearchOpen = compactPopupLayoutMedia.matches && document.querySelector(".viewer-search.is-open");
    selectionSource = compactSearchOpen ? "search" : event.detail?.source ?? "canvas";
    requestExistingPopupMove = selectionSource === "search" || selectionSource === "team-popup";
    ensureVisibleOnPosition = Boolean(selectedPersonId);
    const promotesPreview = selectedPersonId && previewPersonId === selectedPersonId && popup.classList.contains("is-open");
    const replacesPinned = pinnedPersonId && selectedPersonId !== pinnedPersonId && popup.classList.contains("is-open");
    if (replacesPinned) {
      animateOutgoingPopup();
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
    }
    pinnedPersonId = selectedPersonId;
    if (pinnedPersonId) pinnedOpenedAt = performance.now();
    previewPersonId = null;
    if (pinnedPersonId) {
      window.boatboardUiLayerSequence = (window.boatboardUiLayerSequence ?? 0) + 1;
      popup.dataset.openOrder = String(window.boatboardUiLayerSequence);
      popup.style.zIndex = String(20 + window.boatboardUiLayerSequence);
    }
    if (!promotesPreview) {
      placement = compactPopupLayoutMedia.matches && (compactSearchOpen || selectionSource === "team-popup")
        ? "top-left"
        : event.detail?.placement === "auto"
        ? automaticPlacement(event.detail.x, event.detail.y)
        : event.detail?.placement ?? "top-left";
      placementLocked = false;
      popup.dataset.placement = placement;
      if (pinnedPersonId) renderPerson(pinnedPersonId);
      popup.setAttribute("aria-hidden", String(!pinnedPersonId));
      if (pinnedPersonId) animatePopupIn();
      if (pinnedPersonId && compactSearchOpen && event.detail?.source === "canvas") {
        dispatchEvent(new CustomEvent("boatboard:focus-colleague", {
          detail: { personId: pinnedPersonId, fitPopup: true },
        }));
      }
    }
  });

  addEventListener("boatboard:search-opened", () => {
    if (!compactPopupLayoutMedia.matches || !pinnedPersonId) return;
    clearTimeout(ensureVisibleTimer);
    ensureVisibleTimer = 0;
    selectionSource = "search";
    placement = "top-left";
    placementLocked = true;
    popup.dataset.placement = placement;
    ensureVisibleOnPosition = false;
    dispatchEvent(new CustomEvent("boatboard:focus-colleague", {
      detail: { personId: pinnedPersonId, fitPopup: true },
    }));
    dispatchEvent(new CustomEvent("boatboard:refresh-popup-positions"));
  });

  addEventListener("boatboard:preview-colleague", (event) => {
    if (document.body.classList.contains("editor-mode")) return;
    if (pinnedPersonId) return;
    previewPersonId = event.detail?.personId ?? null;
    if (previewPersonId) {
      window.boatboardUiLayerSequence = (window.boatboardUiLayerSequence ?? 0) + 1;
      popup.dataset.openOrder = String(window.boatboardUiLayerSequence);
    }
    placement = automaticPlacement(event.detail.x, event.detail.y);
    placementLocked = false;
    popup.dataset.placement = placement;
    if (previewPersonId) renderPerson(previewPersonId);
    popup.classList.toggle("is-open", Boolean(previewPersonId));
    popup.setAttribute("aria-hidden", String(!previewPersonId));
  });

  addEventListener("boatboard:preview-colleague-end", (event) => {
    if (pinnedPersonId || event.detail?.personId !== previewPersonId) return;
    previewPersonId = null;
    delete popup.dataset.openOrder;
    animatePopupOut();
    popup.setAttribute("aria-hidden", "true");
  });

  addEventListener("boatboard:profile-position", (event) => {
    const displayedPersonId = pinnedPersonId ?? previewPersonId;
    if (!displayedPersonId || event.detail?.personId !== displayedPersonId) return;
    const offset = Math.max(0, event.detail.radius);
    if (!placementLocked) {
      const usesTarget = selectionSource === "search" || selectionSource === "team-popup";
      const layoutX = usesTarget ? event.detail.targetX : event.detail.x;
      const layoutY = usesTarget ? event.detail.targetY : event.detail.y;
      const contentCenterX = usesTarget ? event.detail.targetContentCenterX : event.detail.contentCenterX;
      const contentCenterY = usesTarget ? event.detail.targetContentCenterY : event.detail.contentCenterY;
      const awayPlacement = `${layoutY < contentCenterY ? "top" : "bottom"}-${layoutX < contentCenterX ? "left" : "right"}`;
      placement = compactPopupLayoutMedia.matches && usesTarget
        ? "top-left"
        : choosePlacement(awayPlacement, layoutX, layoutY, offset, contentCenterX, contentCenterY, false);
      popup.dataset.placement = placement;
      placementLocked = true;
    }
    const right = placement.endsWith("right");
    const bottom = placement.startsWith("bottom");
    popup.style.setProperty("--profile-anchor-x", `${event.detail.x + (right ? offset : -offset)}px`);
    popup.style.setProperty("--profile-anchor-y", `${event.detail.y + (bottom ? offset : -offset)}px`);
    if (requestExistingPopupMove) {
      requestExistingPopupMove = false;
      requestAnimationFrame(() => {
        const teamPopup = document.querySelector(".team-popup.is-open:not(.popup-outgoing)");
        if (!teamPopup) return;
        const left = popup.getBoundingClientRect();
        const right = teamPopup.getBoundingClientRect();
        if (Math.min(left.right, right.right) > Math.max(left.left, right.left)
            && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top)) {
          dispatchEvent(new CustomEvent("boatboard:reanchor-team"));
        }
      });
    }
    if (ensureVisibleOnPosition) {
      ensureVisibleOnPosition = false;
      clearTimeout(ensureVisibleTimer);
      ensureVisibleTimer = setTimeout(() => {
        ensureVisibleTimer = 0;
        ensureVisible();
      }, popupTransitionMs + 16);
    }
  });
  addEventListener("boatboard:reanchor-profile", () => {
    if (!pinnedPersonId && !previewPersonId) return;
    placementLocked = false;
    dispatchEvent(new CustomEvent("boatboard:refresh-popup-positions"));
  });
  addEventListener("boatboard:reanchor-profile-top-left", (event) => {
    if (!compactPopupLayoutMedia.matches || (!pinnedPersonId && !previewPersonId)) return;
    placement = "top-left";
    placementLocked = true;
    popup.dataset.placement = placement;
    ensureVisibleOnPosition = event.detail?.precomputedFocus !== true;
    dispatchEvent(new CustomEvent("boatboard:refresh-popup-positions"));
  });

  closeButton.addEventListener("click", closePopup);
  popup.addEventListener("pointerdown", (event) => event.stopPropagation());
  popup.addEventListener("dblclick", (event) => event.stopPropagation());
  popup.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  closeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  closeButton.addEventListener("dblclick", (event) => event.stopPropagation());
  addEventListener("boatboard:enter-edit-mode", closePopup);
}
