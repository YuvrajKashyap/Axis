"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateDomainStatus } from "./actions";

export function StatusToggle({
  domainId,
  currentStatus,
}: {
  domainId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isActive = currentStatus !== "DRIFTING" && currentStatus !== "ARCHIVED";
  const isDrifting = currentStatus === "DRIFTING";
  const isArchived = currentStatus === "ARCHIVED";

  function setStatus(status: "ALIGNED" | "DRIFTING" | "ARCHIVED") {
    startTransition(async () => {
      await updateDomainStatus(domainId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setStatus("ALIGNED")}
        disabled={isPending}
        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono tracking-widest uppercase transition-all border ${
          isActive
            ? "border-cyan-400/40 bg-cyan-400/5 text-cyan-300"
            : "border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
        } ${isPending ? "opacity-50" : ""}`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isActive ? "#67e8f9" : "#3f3f46",
            boxShadow: isActive ? "0 0 6px rgba(103,232,249,0.5)" : "none",
          }}
        />
        Active
      </button>
      <button
        onClick={() => setStatus("DRIFTING")}
        disabled={isPending}
        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono tracking-widest uppercase transition-all border ${
          isDrifting
            ? "border-red-400/40 bg-red-400/5 text-red-300"
            : "border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
        } ${isPending ? "opacity-50" : ""}`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isDrifting ? "#f87171" : "#3f3f46",
            boxShadow: isDrifting ? "0 0 6px rgba(248,113,113,0.5)" : "none",
          }}
        />
        Drifting
      </button>
      <button
        onClick={() => setStatus("ARCHIVED")}
        disabled={isPending}
        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono tracking-widest uppercase transition-all border ${
          isArchived
            ? "border-zinc-500/40 bg-zinc-500/5 text-zinc-400"
            : "border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
        } ${isPending ? "opacity-50" : ""}`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isArchived ? "#71717a" : "#3f3f46",
            boxShadow: isArchived ? "0 0 6px rgba(113,113,122,0.3)" : "none",
          }}
        />
        Archived
      </button>
    </div>
  );
}
