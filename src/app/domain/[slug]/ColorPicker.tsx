"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateDomainColor } from "./actions";

export function ColorPicker({
  domainId,
  currentColor,
}: {
  domainId: string;
  currentColor: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [color, setColor] = useState(currentColor ?? "#67e8f9");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleChange(hex: string) {
    setColor(hex);

    // Debounce DB writes while the user is dragging the picker
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await updateDomainColor(domainId, hex);
        router.refresh();
      });
    }, 400);
  }

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor="planet-color"
        className="text-[11px] uppercase tracking-[0.16em] text-zinc-500"
      >
        Planet color
      </label>

      <div className="relative">
        <input
          id="planet-color"
          type="color"
          value={color}
          onChange={(e) => handleChange(e.target.value)}
          className="w-8 h-8 rounded-full border border-zinc-700 bg-transparent cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
        />
        {isPending && (
          <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
        )}
      </div>

      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        {color}
      </span>
    </div>
  );
}
