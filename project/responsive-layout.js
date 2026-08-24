export const responsiveLayoutQueries = Object.freeze({
  compact: "(max-width: 900px)",
  mobileTouch: "(max-width: 700px) and (pointer: coarse)",
  compactDesktop: "(max-width: 900px) and (pointer: fine)",
  wideDesktop: "(min-width: 901px)",
});

export const compactPopupLayoutMedia = matchMedia(responsiveLayoutQueries.compact);
export const compactTouchUiMedia = matchMedia(responsiveLayoutQueries.mobileTouch);
