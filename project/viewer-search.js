import { loadOrganization } from "./data/organization-source.js?v=boatboard-20260809-63";
import { loadBoardState } from "./data/board-state.js?v=boatboard-20260811-108";
import { compactPopupLayoutMedia } from "./responsive-layout.js?v=boatboard-20260824-1";

const search = document.querySelector(".viewer-search");
const toggle = search?.querySelector(".viewer-search-toggle");
const panel = search?.querySelector(".viewer-search-panel");
const closeButton = search?.querySelector(".viewer-search-close");
const input = search?.querySelector("input");
const results = search?.querySelector(".viewer-search-results");
if (search) {
  const organization = await loadOrganization();
  let boardState = await loadBoardState();
  const teamsById = new Map(organization.teams.map((team) => [team.id, team]));
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const createAvatar = (person) => {
    const avatar = document.createElement("span");
    avatar.className = "viewer-search-avatar";
    avatar.style.setProperty("--avatar-light", person.colors[0]);
    avatar.style.setProperty("--avatar-dark", person.colors[1]);
    if (person.imageUrl) {
      const image = document.createElement("img");
      image.src = person.imageUrl;
      image.alt = "";
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = initials(person.name);
      });
      avatar.append(image);
    } else avatar.textContent = initials(person.name);
    return avatar;
  };

  [...organization.colleagues]
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
    .forEach((person) => {
      const teamName = teamsById.get(person.teamId)?.name ?? "";
      const row = document.createElement("button");
      row.className = "viewer-search-result";
      row.type = "button";
      row.role = "listitem";
      row.dataset.teamId = person.teamId;
      row.dataset.searchTerms = normalize(`${person.name} ${teamName}`);
      const name = document.createElement("span");
      name.className = "viewer-search-name";
      const nameText = document.createElement("span");
      nameText.className = "viewer-search-name-text";
      nameText.textContent = person.name;
      name.append(nameText);
      const team = document.createElement("span");
      team.className = "viewer-search-team";
      team.textContent = teamName;
      row.append(createAvatar(person), name, team);
      row.addEventListener("click", () => {
        dispatchEvent(new CustomEvent("boatboard:select-colleague", {
          detail: { personId: person.id, placement: "top-left", source: "search" },
        }));
        dispatchEvent(new CustomEvent("boatboard:focus-colleague", {
          detail: { personId: person.id, fitPopup: true },
        }));
      });
      results.append(row);
    });

  function filterResults() {
    const query = normalize(input.value.trim());
    results.querySelectorAll(".viewer-search-result").forEach((row) => {
      const teamIsPlaced = boardState?.teams?.[row.dataset.teamId]?.placed === true;
      const hidden = !teamIsPlaced || !row.dataset.searchTerms.includes(query);
      if (hidden) {
        row.classList.remove("is-restoring");
        row.setAttribute("aria-hidden", "true");
        row.tabIndex = -1;
        row.classList.add("is-filtered-out");
        row.classList.add("is-collapsed");
      } else {
        row.removeAttribute("aria-hidden");
        row.tabIndex = 0;
        row.classList.add("is-restoring");
        row.classList.remove("is-collapsed");
        row.classList.remove("is-filtered-out");
        requestAnimationFrame(() => row.classList.remove("is-restoring"));
      }
    });
  }

  filterResults();

  function openSearch() {
    window.boatboardUiLayerSequence = (window.boatboardUiLayerSequence ?? 0) + 1;
    search.dataset.openOrder = String(window.boatboardUiLayerSequence);
    search.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      const margin = 18;
      const panelRectangle = panel.getBoundingClientRect();
      if (compactPopupLayoutMedia.matches) {
        const profileRectangle = document.querySelector(
          ".profile-popup.is-open:not(.popup-outgoing)",
        )?.getBoundingClientRect();
        const profileOverlapsPanel = profileRectangle
          && Math.min(profileRectangle.right, panelRectangle.right) > Math.max(profileRectangle.left, panelRectangle.left)
          && Math.min(profileRectangle.bottom, panelRectangle.bottom) > Math.max(profileRectangle.top, panelRectangle.top);
        if (profileOverlapsPanel) dispatchEvent(new CustomEvent("boatboard:search-opened"));
        return;
      }
      const activePopups = document.querySelectorAll(
        ".profile-popup.is-open:not(.popup-outgoing), .team-popup.is-open:not(.popup-outgoing)",
      );
      let dx = 0;
      activePopups.forEach((popup) => {
        const rectangle = popup.getBoundingClientRect();
        const overlaps = Math.min(rectangle.right, panelRectangle.right) > Math.max(rectangle.left, panelRectangle.left)
          && Math.min(rectangle.bottom, panelRectangle.bottom) > Math.max(rectangle.top, panelRectangle.top);
        if (overlaps) dx = Math.max(dx, panelRectangle.right + margin - rectangle.left);
      });
      if (dx > 0) dispatchEvent(new CustomEvent("boatboard:ensure-popup-visible", { detail: { dx, dy: 0 } }));
    });
  }

  function closeSearch() {
    delete search.dataset.openOrder;
    search.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    input.value = "";
    filterResults();
  }

  toggle.addEventListener("click", () => {
    toggle.classList.remove("is-pressing");
    void toggle.offsetWidth;
    toggle.classList.add("is-pressing");
    setTimeout(() => toggle.classList.remove("is-pressing"), 150);
    search.classList.contains("is-open") ? closeSearch() : openSearch();
  });
  closeButton.addEventListener("click", closeSearch);
  input.addEventListener("input", filterResults);
  addEventListener("boatboard:board-changed", (event) => {
    if (!event.detail?.boardState) return;
    boardState = event.detail.boardState;
    filterResults();
  });
  addEventListener("boatboard:enter-edit-mode", closeSearch);
  search.addEventListener("pointerdown", (event) => event.stopPropagation());
  search.addEventListener("dblclick", (event) => event.stopPropagation());
  search.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
}
