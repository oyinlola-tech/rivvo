import "emoji-picker-element";
import React, { useEffect, useRef } from "react";
import { Clock, Smile, User, Hand, PawPrint, Utensils, Gamepad2, Car, Lightbulb, Hash } from "lucide-react";

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  variant?: "light" | "dark";
  storageKey?: string;
};

export default function EmojiPicker({ onSelect, variant = "light", storageKey = "recentEmojis" }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const handleEmojiClick = (event: any) => {
      const emoji = event?.detail?.unicode || event?.detail?.emoji?.unicode;
      if (emoji) {
        onSelect(emoji);
      }
    };

    picker.addEventListener("emoji-click", handleEmojiClick as EventListener);

    const applyShadowStyles = () => {
      const root = (picker as any).shadowRoot as ShadowRoot | null;
      if (!root) return;
      const style = document.createElement("style");
      style.textContent = `
        .search-row {
          position: sticky;
          top: 0;
          z-index: 3;
          background: var(--background);
          padding-bottom: 6px;
        }
        .category-nav {
          position: sticky;
          top: 40px;
          z-index: 2;
          background: var(--background);
          padding: 6px 0;
        }
        .category-nav button {
          border-radius: 999px !important;
          padding: 6px 8px !important;
          margin: 0 2px !important;
          opacity: 0.8;
        }
        .category-nav button[aria-selected="true"] {
          opacity: 1;
          background: color-mix(in srgb, var(--category-font-color) 15%, transparent) !important;
        }
        .category-nav button:hover {
          opacity: 1;
          background: color-mix(in srgb, var(--category-font-color) 10%, transparent) !important;
        }
      `;
      root.appendChild(style);
    };

    // Wait for web component to render its shadow DOM.
    window.setTimeout(applyShadowStyles, 0);

    return () => {
      picker.removeEventListener("emoji-click", handleEmojiClick as EventListener);
    };
  }, [onSelect]);

  const theme = variant === "dark" ? "dark" : "light";
  const bgClass = variant === "dark" ? "bg-[#111b21]" : "bg-white";
  const borderClass = variant === "dark" ? "border-white/20" : "border-gray-200";
  const textClass = variant === "dark" ? "text-white/70" : "text-[#667781]";
  const activeClass = variant === "dark" ? "text-white bg-white/10" : "text-[#111b21] bg-[#f0f2f5]";

  const scrollToCategory = (category: string) => {
    const picker = pickerRef.current as any;
    if (!picker) return;
    if (typeof picker.setCategory === "function") {
      picker.setCategory(category);
      return;
    }
    if (picker?.shadowRoot) {
      const section = picker.shadowRoot.querySelector(`[data-category="${category}"]`);
      if (section?.scrollIntoView) {
        section.scrollIntoView({ block: "start" });
      }
    }
  };

  return (
    <div className={`rounded-2xl border shadow-lg overflow-hidden ${bgClass} ${borderClass}`}>
      <div className={`flex items-center gap-1 px-2 py-2 ${bgClass} border-b ${borderClass}`}>
        <button
          type="button"
          onClick={() => scrollToCategory("recent")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass} hover:opacity-100 ${activeClass}`}
          aria-label="Recent"
          title="Recent"
        >
          <Clock size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("smileys")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Smileys"
          title="Smileys"
        >
          <Smile size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("people")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="People"
          title="People"
        >
          <User size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("gestures")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Gestures"
          title="Gestures"
        >
          <Hand size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("animals")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Animals"
          title="Animals"
        >
          <PawPrint size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("food")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Food"
          title="Food"
        >
          <Utensils size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("activities")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Activities"
          title="Activities"
        >
          <Gamepad2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("travel")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Travel"
          title="Travel"
        >
          <Car size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("objects")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Objects"
          title="Objects"
        >
          <Lightbulb size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory("symbols")}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${textClass}`}
          aria-label="Symbols"
          title="Symbols"
        >
          <Hash size={16} />
        </button>
      </div>
      {React.createElement("emoji-picker", {
        ref: pickerRef as any,
        theme,
        "skin-tone-emoji": "👍",
        "storage-key": storageKey,
        "search-placeholder": "Search",
        style: { width: "18rem", height: "20rem" },
      })}
    </div>
  );
}
