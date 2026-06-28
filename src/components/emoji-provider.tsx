/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { useEffect } from "react";
import Script from "next/script";
import { env } from "~/env";
import emojiMap from "~/config/emoji-map.json";

// Resolve shorthand keys to default CDN URLs
const getCdnUrl = (value: string) => {
  if (value === "twemoji") {
    return "https://cdn.jsdelivr.net/npm/@twemoji/api@14.1.0/dist/twemoji.min.js";
  }
  if (value === "fluent") {
    return "https://cdn.jsdelivr.net/gh/DellZHackintosh/msemoji@1.1.2/src/script/msemoji.min.js";
  }
  if (value === "noto") {
    return "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap";
  }
  return value;
};

// Check if a link is a CSS stylesheet/font link
const isCssLink = (url: string) => {
  return url.includes(".css") || url.includes("fonts.googleapis.com");
};

// Parse Google Fonts style name out of the URL
const getFontFamilyName = (url: string) => {
  const match = url.match(/family=([^&:]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).replace(/\+/g, " ");
  }
  return "Noto Color Emoji"; // Default fallback
};

// Find the style name configured for a specific emoji character
const getStyleForEmoji = (emoji: string, defaultStyle: string) => {
  // Find which variable key maps to this emoji symbol
  const varKey = Object.keys(emojiMap.variables).find(
    (key) => (emojiMap.variables as any)[key] === emoji
  );

  if (varKey) {
    const styleOverride = (emojiMap.styles as any)[varKey];
    if (styleOverride) {
      return styleOverride;
    }
  }

  // Fallback to default
  return defaultStyle;
};

// Walk DOM and replace text emojis with custom emoji CDN images
function walkAndReplace(node: Node, defaultStyle: string) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue || "";
    const regex = /\p{Emoji_Presentation}/gu;
    if (regex.test(text)) {
      const span = document.createElement("span");
      span.innerHTML = text.replace(regex, (match) => {
        const style = getStyleForEmoji(match, defaultStyle);
        if (style === "native") {
          return match;
        }
        return `<img class="emoji" src="https://emoji-cdn.mqrio.dev/${encodeURIComponent(match)}?style=${style}" onerror="this.replaceWith('${match}')" alt="${match}" style="height: 1.15em; width: 1.15em; margin: 0 .07em; vertical-align: -0.2em; display: inline-block;" />`;
      });
      node.parentNode?.replaceChild(span, node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = (node as Element).tagName.toLowerCase();
    if (tagName === "script" || tagName === "style" || tagName === "img" || (node as Element).classList.contains("emoji")) {
      return;
    }
    const children = Array.from(node.childNodes);
    for (const child of children) {
      walkAndReplace(child, defaultStyle);
    }
  }
}

export function EmojiProvider({ children }: { children: React.ReactNode }) {
  const rawSet = env.NEXT_PUBLIC_EMOJI_SET || emojiMap.default_style;
  const isEnabled = rawSet !== "native";

  // Determine if using custom CDN JS script or CSS stylesheet
  const isUrl = rawSet.startsWith("http://") || rawSet.startsWith("https://");
  const cdnUrl = isUrl ? getCdnUrl(rawSet) : "";
  const isStyleSheet = isUrl && isCssLink(cdnUrl);
  const isScript = isUrl && !isStyleSheet;

  // Default style name for emoji-cdn (e.g. "apple")
  const defaultStyle = isEnabled && !isUrl ? rawSet : emojiMap.default_style;

  useEffect(() => {
    if (typeof window === "undefined" || !isEnabled) return;

    const runEmoji = (node: Node = document.body) => {
      if (!isUrl) {
        walkAndReplace(node, defaultStyle);
      } else if (isScript) {
        const tw = (window as any).twemoji;
        const ms = (window as any).msemoji;
        if (tw) {
          tw.parse(node, { folder: "svg", ext: ".svg" });
        } else if (ms) {
          ms.parse(node);
        }
      }
    };

    // Run initial replacement
    runEmoji();

    // Setup mutation observer for dynamically added content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of Array.from(mutation.addedNodes)) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            runEmoji(addedNode);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isEnabled, defaultStyle, isScript, cdnUrl, isUrl]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  if (isStyleSheet) {
    const fontName = getFontFamilyName(cdnUrl);
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={cdnUrl} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{__html: `
          body, input, button, select, textarea {
            font-family: 'Inter', '${fontName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
        `}} />
        {children}
      </>
    );
  }

  return (
    <>
      {isScript && (
        <Script
          src={cdnUrl}
          strategy="afterInteractive"
          onLoad={() => {
            if (typeof window === "undefined") return;
            const tw = (window as any).twemoji;
            const ms = (window as any).msemoji;
            if (tw) {
              tw.parse(document.body, { folder: "svg", ext: ".svg" });
            } else if (ms) {
              ms.parse(document.body);
            }
          }}
        />
      )}
      {children}
    </>
  );
}
