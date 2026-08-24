export function popupViewportCorrection(rectangle, searchRectangle, margin = 18, tolerance = 2) {
  const leftBoundary = searchRectangle ? searchRectangle.right + margin : margin;
  const rightBoundary = innerWidth - margin;
  const bottomBoundary = innerHeight - margin;
  const dx = rectangle.left < leftBoundary - tolerance ? leftBoundary - rectangle.left
    : rectangle.right > rightBoundary + tolerance ? rightBoundary - rectangle.right : 0;

  let dy = 0;
  if (rectangle.top < margin - tolerance) {
    dy = margin - rectangle.top;
  } else if (rectangle.bottom > bottomBoundary + tolerance) {
    const alignBottom = bottomBoundary - rectangle.bottom;
    const fitsAfterBottomAlignment = rectangle.top + alignBottom >= margin - tolerance;
    // If the popup is taller than the available viewport, preserve its top content.
    dy = fitsAfterBottomAlignment ? alignBottom : margin - rectangle.top;
  }
  return { dx, dy };
}
