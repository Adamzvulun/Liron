const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/** The 11-character video id of a YouTube link (watch, youtu.be, shorts, embed), or null. */
export function videoId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  let id: string | null | undefined;
  if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.split('/')[1];
  else if (HOSTS.has(host)) {
    const [, kind, rest] = url.pathname.split('/');
    id =
      kind === 'watch'
        ? url.searchParams.get('v')
        : kind === 'shorts' || kind === 'embed'
          ? rest
          : null;
  }
  return id && ID.test(id) ? id : null;
}
