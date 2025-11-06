"use client";

import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { AlertTriangle, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

type Props = {
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean; // <-- ADDED/components/tab-settings.tsx]
  onTogglePlayback: () => void; // <-- ADDED/components/tab-settings.tsx]
  partyHash: string;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
};

export function TabSettings({
  useQueueRules,
  onToggleRules,
  disablePlayback, // <-- ADDED/components/tab-settings.tsx]
  onTogglePlayback, // <-- ADDED/components/tab-settings.tsx]
  partyHash,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
}: Props) {
  return (
    <>
      {/* Queue Rules */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2">Controls</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary-foreground/80">
            Queue Rules
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {useQueueRules ? "ON (Fairness)" : "OFF (Manual)"}
            </span>
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
        
        {/* --- START: ADDED NEW TOGGLE --- */}
        <div className="flex items-center justify-between">/components/tab-settings.tsx]
          <span className="text-sm font-medium text-primary-foreground/80">
            Disable Playback
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {disablePlayback ? "ON (Disabled)" : "OFF (Enabled)"}
            </span>
            <button
              onClick={onTogglePlayback}
              aria-checked={disablePlayback}
              role="switch"
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                disablePlayback ? "bg-red-500" : "bg-green-500",
              )}
            >
              <span className="sr-only">Toggle Playback</span>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  disablePlayback ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
        {/* --- END: ADDED NEW TOGGLE --- */}
        
      </div>

      {/* --- UPDATED: Add Songs Link (points to /party) --- */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2">Add Songs (Guest Page)</h2>
        <a
          href={`/party/${partyHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          Open Guest Page
        </a>
      </div>

      {/* --- UPDATED: Open Player Link (points to /player) --- */}
      <div className="flex-shrink-0">
        <h2 className="font-semibold text-lg mb-2">Player Display</h2>
        <Link
          href={`/player/${partyHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          Open Player in New Window
        </Link>
      </div>

      {/* Search Results Setting */}
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

      {/* Close Party Button */}
      <div className="flex-shrink-0 pt-4 border-t border-destructive/20">
        <h2 className="font-semibold text-lg mb-2 text-destructive">
          Danger Zone
        </h2>
        {isConfirmingClose ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-center font-medium text-destructive">
              Are you sure?
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This will permanently delete the party and its playlist for
              everyone.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelClose}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onConfirmClose}
              >
                Yes, Close Party
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="destructive"
            className="w-full"
            onClick={onCloseParty}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Close Party
          </Button>
        )}
      </div>
    </>
  );
}
