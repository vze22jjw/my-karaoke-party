// This function now behaves like the tRPC getBaseUrl
// It determines the URL at RUNTIME.
function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const BASE_URL = getBaseUrl();

const INCLUDES_FORWARD_SLASH_AT_START_REGEX = /^\/(.|\n)*$/;
const INCLUDES_FORWARD_SLASH_AT_START = (str: string) =>
  INCLUDES_FORWARD_SLASH_AT_START_REGEX.test(str);

export function getUrl(path: string) {
  return `${BASE_URL}${!INCLUDES_FORWARD_SLASH_AT_START(path) ? "/" : ""}${path}`;
}
