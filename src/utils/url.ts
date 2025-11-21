// This function now behaves like the tRPC getBaseUrl
// It determines the URL at RUNTIME.
function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Client-side: use the browser's origin
    return window.location.origin;
  }
  
  // Server-side (during SSR or API route):
  // We fall back to the env var. This is now a RUNTIME variable.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback for local development
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const BASE_URL = getBaseUrl();

const INCLUDES_FORWARD_SLASH_AT_START_REGEX = /^\/(.|\n)*$/;
const INCLUDES_FORWARD_SLASH_AT_START = (str: string) =>
  INCLUDES_FORWARD_SLASH_AT_START_REGEX.test(str);

export function getUrl(path: string) {
  return `${BASE_URL}${!INCLUDES_FORWARD_SLASH_AT_START(path) ? "/" : ""}${path}`;
}

export function extractYouTubeVideoId(input: string) {
  // Regular expression for full YouTube URL
  const fullUrlPattern =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/.*(?:v=|\/v\/|\/embed\/|\/watch\?v=|\/watch\?.+&v=)([^#\&\?]*).*/;
  // Regular expression for shortened YouTube URL
  const shortUrlPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^#\&\?]*).*/;
  // Regular expression for a plain video ID
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

  let videoId: string | null | undefined = null;

  if (fullUrlPattern.test(input)) {
    const match = input.match(fullUrlPattern);
    videoId = match ? match[1] : null;
  } else if (shortUrlPattern.test(input)) {
    const match = input.match(shortUrlPattern);
    videoId = match ? match[1] : null;
  } else if (videoIdPattern.test(input)) {
    videoId = input;
  }

  return videoId;
}
