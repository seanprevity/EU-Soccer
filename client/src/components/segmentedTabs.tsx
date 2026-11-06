"use client";

import { KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils";

export type TabOption<K extends string> = {
  key: K;
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
  dot?: boolean;
  dotLabel?: string;
};

export type TabVariant = "segmented" | "underline";

type SegmentedTabsProps<K extends string> = {
  options: readonly TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  variant?: TabVariant;
  className?: string;
};

const SIZES = {
  sm: "px-3 py-1 text-xs sm:text-sm",
  md: "px-4 py-2 text-sm sm:px-5",
};

const VARIANTS: Record<
  TabVariant,
  { list: string; tab: string; selected: string; idle: string }
> = {
  segmented: {
    list: "mx-auto w-fit rounded-lg bg-gray-200 p-1 dark:bg-gray-800",
    tab: "rounded-md",
    selected:
      "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white",
    idle: "text-gray-600 enabled:hover:text-gray-900 dark:text-gray-400 dark:enabled:hover:text-white",
  },
  underline: {
    list: "relative w-full justify-center after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gray-200 dark:after:bg-gray-700",
    tab: "relative z-10 border-b-2",
    selected: "border-gray-900 text-gray-900 dark:border-white dark:text-white",
    idle: "border-transparent text-gray-500 enabled:hover:border-gray-300 enabled:hover:text-gray-800 dark:text-gray-400 dark:enabled:hover:border-gray-600 dark:enabled:hover:text-gray-200",
  },
};

function Dot({ label }: { label?: string }) {
  return (
    <span className="relative flex size-2" title={label}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      {label && <span className="sr-only">({label})</span>}
    </span>
  );
}

// One tab bar for the whole site. Arrow keys, Home and End move between tabs.
export function SegmentedTabs<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  variant = "segmented",
  className,
}: SegmentedTabsProps<K>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const style = VARIANTS[variant];

  // The next tab that isn't disabled, going left (-1) or right (1), wrapping round
  function nextEnabledIndex(from: number, step: 1 | -1): number {
    for (let moved = 1; moved <= options.length; moved++) {
      const index = (from + step * moved + options.length) % options.length;
      if (!options[index].disabled) return index;
    }
    return from;
  }

  function selectAt(index: number) {
    onChange(options[index].key);
    buttonRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = options.findIndex((option) => option.key === value);
    let target: number | null = null;

    if (event.key === "ArrowRight") target = nextEnabledIndex(current, 1);
    else if (event.key === "ArrowLeft") target = nextEnabledIndex(current, -1);
    else if (event.key === "Home") target = nextEnabledIndex(-1, 1);
    else if (event.key === "End") target = nextEnabledIndex(options.length, -1);

    if (target === null) return;
    event.preventDefault();
    selectAt(target);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex max-w-full overflow-x-auto", style.list, className)}
    >
      {options.map((option, index) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            // Only the selected tab is in the Tab order; arrows move within the bar
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            title={option.disabled ? option.disabledTitle : undefined}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500",
              "disabled:cursor-not-allowed disabled:opacity-40",
              SIZES[size],
              style.tab,
              selected ? style.selected : style.idle,
            )}
          >
            {option.label}
            {option.dot && <Dot label={option.dotLabel} />}
          </button>
        );
      })}
    </div>
  );
}
