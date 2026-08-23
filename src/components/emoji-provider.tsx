"use client";

import { useEffect } from "react";
import { env } from "~/env";
import emojiMap from "~/config/emoji-map.json";

type EmojiMap = {
  default_style: string;
  variables: Record<string, string>;
  styles: Record<string, string>;
};

const emojiMapConfig = emojiMap as EmojiMap;

const EMOJI_REGEX =
  /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:[\u{1F3FB}-\u{1F3FF}])?)*/gu;

const getStyleForEmoji = (emoji: string, defaultStyle: string) => {
  const varKey = Object.keys(emojiMapConfig.variables).find(
    (key) => emojiMapConfig.variables[key] === emoji
  );

  if (varKey) {
    const styleOverride = emojiMapConfig.styles[varKey];
    if (styleOverride) {
      return styleOverride;
    }
  }

  return defaultStyle;
};

function walkAndReplace(node: Node, defaultStyle: string) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? "";
    if (!EMOJI_REGEX.test(text)) {
      return;
    }
    EMOJI_REGEX.lastIndex = 0;
    const span = document.createElement("span");
    span.innerHTML = text.replace(EMOJI_REGEX, (match) => {
      const style = getStyleForEmoji(match, defaultStyle);
      if (style === "native") {
        return match;
      }
      return `<img class="emoji" src="/api/emoji?emoji=${encodeURIComponent(match)}&style=${style}" onerror="this.replaceWith('${match}')" alt="${match}" style="height: 1.15em; width: 1.15em; margin: 0 .07em; vertical-align: -0.2em; display: inline-block;" />`;
    });
    node.parentNode?.replaceChild(span, node);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = (node as Element).tagName.toLowerCase();
    if (
      tagName === "script" ||
      tagName === "style" ||
      tagName === "img" ||
      tagName === "textarea" ||
      (node as Element).classList.contains("emoji")
    ) {
      return;
    }
    const children = Array.from(node.childNodes);
    for (const child of children) {
      walkAndReplace(child, defaultStyle);
    }
  }
}

export function EmojiProvider({ children }: { children: React.ReactNode }) {
  const rawSet = env.NEXT_PUBLIC_EMOJI_SET || emojiMapConfig.default_style;
  const isEnabled = rawSet !== "native";

  useEffect(() => {
    if (typeof window === "undefined" || !isEnabled) return;

    const runEmoji = (node: Node = document.body) => {
      walkAndReplace(node, rawSet);
    };

    runEmoji();

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
  }, [isEnabled, rawSet]);

  return <>{children}</>;
}
