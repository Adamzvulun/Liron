// A painting as a still picture for a card (the finales, task 4.2): made once per page load from
// our own painter's SVG (never from user input), like HallBackdrop's, but shown whole and sharp.

const made = new Map<string, string>();

export function pictureUrl(
  id: string,
  stage: { width: number; height: number },
  paint: () => string,
): string {
  let url = made.get(id);
  if (!url) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${stage.width}" height="${stage.height}" viewBox="0 0 ${stage.width} ${stage.height}">${paint()}</svg>`;
    url =
      typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    made.set(id, url);
  }
  return url;
}
