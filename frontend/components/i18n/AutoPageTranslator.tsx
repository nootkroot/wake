"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { translateUiStrings } from "@/lib/api";
import { useSiteLanguage } from "./SiteLanguageProvider";

type TextNodeRef = { node: Text; text: string };
type AttrRef = { element: Element; attr: "placeholder" | "title" | "aria-label"; text: string };

function collectTextNodes(): { textNodes: TextNodeRef[]; attrNodes: AttrRef[] } {
  const textNodes: TextNodeRef[] = [];
  const attrNodes: AttrRef[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const parent = node.parentElement;
    const value = node.nodeValue?.trim() ?? "";
    if (
      parent &&
      value.length > 1 &&
      /\p{L}/u.test(value) &&
      !parent.closest("[data-no-auto-translate='true']") &&
      !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "OPTION"].includes(parent.tagName)
    ) {
      textNodes.push({ node, text: value });
    }
    current = walker.nextNode();
  }

  const attrSelector = "[placeholder],[title],[aria-label]";
  document.querySelectorAll(attrSelector).forEach((element) => {
    if (element.closest("[data-no-auto-translate='true']")) return;
    (["placeholder", "title", "aria-label"] as const).forEach((attr) => {
      const val = element.getAttribute(attr)?.trim();
      if (val && val.length > 1 && /\p{L}/u.test(val)) {
        attrNodes.push({ element, attr, text: val });
      }
    });
  });

  return { textNodes, attrNodes };
}

export function AutoPageTranslator() {
  const pathname = usePathname();
  const { locale } = useSiteLanguage();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const translatedTextNodesRef = useRef<WeakSet<Text>>(new WeakSet());
  const translatedAttrRef = useRef<WeakMap<Element, Set<string>>>(new WeakMap());
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (locale === "en") return;
    let cancelled = false;
    cacheRef.current.clear();
    translatedTextNodesRef.current = new WeakSet();
    translatedAttrRef.current = new WeakMap();

    async function runPass() {
      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }
      inFlightRef.current = true;
      const { textNodes, attrNodes } = collectTextNodes();
      const textNodesToTranslate = textNodes.filter(
        ({ node }) => !translatedTextNodesRef.current.has(node),
      );
      const attrNodesToTranslate = attrNodes.filter(({ element, attr }) => {
        const translated = translatedAttrRef.current.get(element);
        return !translated?.has(attr);
      });
      const allTexts = [
        ...textNodesToTranslate.map((x) => x.text),
        ...attrNodesToTranslate.map((x) => x.text),
      ];
      const unique = Array.from(new Set(allTexts)).slice(0, 500);
      if (unique.length === 0) {
        inFlightRef.current = false;
        return;
      }
      try {
        const uncached = unique.filter((src) => !cacheRef.current.has(src));
        if (uncached.length > 0) {
          const translated = await translateUiStrings(uncached, locale);
          uncached.forEach((src, idx) => cacheRef.current.set(src, translated[idx] ?? src));
        }
        if (cancelled) return;
        textNodesToTranslate.forEach(({ node, text }) => {
          const next = cacheRef.current.get(text);
          if (next) node.nodeValue = node.nodeValue?.replace(text, next) ?? next;
          translatedTextNodesRef.current.add(node);
        });
        attrNodesToTranslate.forEach(({ element, attr, text }) => {
          const next = cacheRef.current.get(text);
          if (next) element.setAttribute(attr, next);
          const done = translatedAttrRef.current.get(element) ?? new Set<string>();
          done.add(attr);
          translatedAttrRef.current.set(element, done);
        });
      } catch {
        // Best effort translation; keep original text on failures.
      } finally {
        inFlightRef.current = false;
        if (pendingRef.current && !cancelled) {
          pendingRef.current = false;
          window.setTimeout(() => void runPass(), 80);
        }
      }
    }

    let debounce: number | null = null;
    function schedulePass(delay = 120) {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void runPass(), delay);
    }

    const t1 = window.setTimeout(() => void runPass(), 150);
    const t2 = window.setTimeout(() => void runPass(), 1200);
    const observer = new MutationObserver(() => schedulePass(180));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });
    const interval = window.setInterval(() => schedulePass(0), 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (debounce) window.clearTimeout(debounce);
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, [locale, pathname]);

  return null;
}

