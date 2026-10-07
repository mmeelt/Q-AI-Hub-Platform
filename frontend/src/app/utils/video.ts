// Pitch videos: files uploaded to our server (/uploads/pitch-videos/...), or older links
// (YouTube, Vimeo, Google Drive, direct .mp4/.webm).

export type VideoSource =
  | { kind: 'embed'; provider: 'YouTube' | 'Vimeo' | 'Google Drive'; src: string; url: string }
  | { kind: 'file'; src: string; url: string }
  | { kind: 'link'; url: string };

/** Only absolute http(s) links are accepted (blocks javascript:, data:, blob: ...). */
export function isSafeHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Works out how to show a video link: embedded player, HTML5 video, or a plain link. */
export function parseVideoUrl(value?: string | null): VideoSource | null {
  // Video uploaded to our server
  if (value && /^\/uploads\/[\w-]+\/[\w.-]+$/.test(value.trim())) {
    return { kind: 'file', src: value.trim(), url: value.trim() };
  }
  if (!isSafeHttpUrl(value)) return null;
  const url = value!.trim();
  const u = new URL(url);
  const host = u.hostname.replace(/^www\.|^m\./, '');

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID
  let yt: string | null = null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    yt = u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1] || null;
  } else if (host === 'youtu.be') {
    yt = u.pathname.slice(1).split('/')[0] || null;
  }
  if (yt && /^[\w-]{6,}$/.test(yt)) {
    return { kind: 'embed', provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${yt}`, url };
  }

  // Vimeo: vimeo.com/123456
  const vimeo = host === 'vimeo.com' ? u.pathname.match(/^\/(\d+)/)?.[1] : host === 'player.vimeo.com' ? u.pathname.match(/\/video\/(\d+)/)?.[1] : null;
  if (vimeo) return { kind: 'embed', provider: 'Vimeo', src: `https://player.vimeo.com/video/${vimeo}`, url };

  // Google Drive: /file/d/ID/... or open?id=ID (the file must be shared "anyone with the link")
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || u.searchParams.get('id');
    if (id) return { kind: 'embed', provider: 'Google Drive', src: `https://drive.google.com/file/d/${id}/preview`, url };
  }

  if (/\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) return { kind: 'file', src: url, url };
  return { kind: 'link', url };
}
