"use client";

import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { AlertTriangle, Search } from "lucide-react";

type Props = {
  useQueueRules: boolean;
  onToggleRules: () => void;
  partyHash: string;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
};

export function TabSettings({
  useQueueRules,
  onToggleRules,
  partyHash,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
}: Props) {
  return (
    <>
      {/* Queue Rules (Moved) */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2">Controls</h2>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-primary-foreground/80">
            Queue Rules
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {useQueueRules ? "ON (Fairness)" : "OFF (Manual)"}
            </span>

            {/* Slide Toggle Switch */}
            <button
              onClick={onToggleRules}
              aria-checked={useQueueRules}
              role="switch"
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                useQueueRules ? "bg-green-500" : "bg-red-500",
              )}
            >
              <span className="sr-only">Toggle Queue Rules</span>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  useQueueRules ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Add Songs Link (Moved) */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2">Add Songs</h2>
        <a
          href={`/party/${partyHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-primary hover:text-primary/80 font-medium text-sm"
        >
          👉 Open Page to Add Songs
        </a>
      </div>

      {/* --- START: New Search Results Setting --- */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Settings
        </h2>
        <div className="flex items-center justify-between">
          <label
            htmlFor="max-results"
            className="text-sm font-medium text-primary-foreground/80"
          >
            Results per search
          </label>
          <select
            id="max-results"
            value={maxSearchResults}
            onChange={(e) => onSetMaxResults(Number(e.target.value))}
            className="rounded-md border-input bg-background p-2 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>
      {/* --- END: New Search Results Setting --- */}

      {/* Close Party Button (New) */}
      <div className="flex-shrink-0 pt-4 border-t border-destructive/20">
        <h2 className="font-semibold text-lg mb-2 text-destructive">
          Danger Zone
        </h2>
        <Button
          variant="destructive"
          className="w-full"
          onClick={onCloseParty}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Close Party
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This will permanently delete the party and its playlist for everyone.
        </p>
      </div>
    </>
  );
}
