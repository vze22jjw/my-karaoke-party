"use client";

import { useState, useEffect } from "react";
import { Label } from "~/components/ui/ui/label";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Loader2, Scale } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/ui/button";

const ToggleButton = ({
  id,
  checked,
  onCheckedChange,
  label,
  isLoading,
  disabled
}: {
  id: string;
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
  isLoading?: boolean;
  disabled?: boolean;
}) => {
  // Safe boolean derivation to satisfy linter
  const isEffectiveDisabled = (isLoading ?? false) || (disabled ?? false);

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex-1 space-y-0.5 pr-4">
        <Label htmlFor={id} className={cn("text-base", isEffectiveDisabled && "text-muted-foreground")}>
          {label}
        </Label>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={!isEffectiveDisabled ? onCheckedChange : undefined}
        disabled={isEffectiveDisabled}
        className={cn(
          "relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          checked 
            ? (isEffectiveDisabled ? "bg-green-500/50" : "bg-green-500") 
            : (isEffectiveDisabled ? "bg-red-500/50" : "bg-red-500"),
          "shadow-inner",
          isEffectiveDisabled && "cursor-not-allowed opacity-70"
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
            "border border-gray-200",
          )}
        >
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-black/50" />
          )}
        </span>
      </button>
    </div>
  );
};

type Props = {
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean;
  onTogglePlayback: () => void;
  isManualSortActive: boolean;
  onToggleManualSort: () => void;
  isPartyClosed?: boolean;
};

export function SettingsRules({
  useQueueRules,
  onToggleRules,
  disablePlayback,
  onTogglePlayback,
  isManualSortActive,
  onToggleManualSort,
  isPartyClosed
}: Props) {
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  
  const isLoadingSort = false; 

  useEffect(() => { if (isLoadingRules) setIsLoadingRules(false); }, [useQueueRules, isLoadingRules]);
  useEffect(() => { if (isLoadingPlayback) setIsLoadingPlayback(false); }, [disablePlayback, isLoadingPlayback]);

  const handleToggleRules = () => {
    if (isPartyClosed) return;
    setIsLoadingRules(true);
    onToggleRules();
  };

  const handleTogglePlayback = () => {
    if (isPartyClosed) return;
    setIsLoadingPlayback(true);
    onTogglePlayback();
  };

  const handleToggleManualSort = () => {
    if (isPartyClosed) return;
    onToggleManualSort();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Scale className="h-5 w-5 text-cyan-500" />
          Party Rules {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">(Locked)</span>}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowRulesInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      {showRulesInfo && (
        <Alert className="mt-2 space-y-2">
          <AlertDescription>
            <strong>Queue Ordering:</strong> &quot;Fairness&quot; rotates singers. &quot;FIFO&quot; is first-come, first-served.
          </AlertDescription>
          <AlertDescription>
            <strong>Manual Queue Sort:</strong> Enable to unlock drag-and-drop reordering in the Playlist tab. Disabling it saves the new order.
          </AlertDescription>
          <AlertDescription>
            <strong>Playback:</strong> &quot;In-App&quot; plays videos here. &quot;YouTube&quot; forces external links.
          </AlertDescription>
        </Alert>
      )}
      
      <ToggleButton
        id="manual-sort"
        checked={isManualSortActive}
        onCheckedChange={handleToggleManualSort}
        isLoading={isLoadingSort}
        label={isManualSortActive ? "Manual Sort: Active" : "Manual Sort: OFF"}
        disabled={isPartyClosed}
      />

      <ToggleButton
        id="queue-rules"
        checked={useQueueRules}
        onCheckedChange={handleToggleRules}
        isLoading={isLoadingRules}
        label={useQueueRules ? "Queue: Fairness (ON)" : "Queue: FIFO (OFF)"}
        disabled={isPartyClosed}
      />
      
      <ToggleButton
        id="disable-playback"
        checked={!disablePlayback}
        onCheckedChange={handleTogglePlayback}
        isLoading={isLoadingPlayback}
        label={!disablePlayback ? "Playback: In-App (ON)" : "Playback: YouTube (OFF)"}
        disabled={isPartyClosed}
      />
    </div>
  );
}
