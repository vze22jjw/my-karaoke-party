"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Search } from "lucide-react";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

// Define the specific allowed values for the slider
const ALLOWED_VALUES = [5, 9, 12, 15, 20, 25];

type Props = {
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  isPartyClosed?: boolean;
};

export function SettingsSearch({ maxSearchResults, onSetMaxResults, isPartyClosed }: Props) {
  const [showSearchInfo, setShowSearchInfo] = useState(false);

  // Determine the slider index based on the current maxSearchResults
  // This snaps the slider to the nearest allowed value if the current value isn't exact
  const currentSliderIndex = (() => {
    const exactIndex = ALLOWED_VALUES.indexOf(maxSearchResults);
    if (exactIndex !== -1) return exactIndex;

    // Find closest match if value is not in array (e.g. legacy value)
    let minDiff = Infinity;
    let closestIdx = 0;
    ALLOWED_VALUES.forEach((val, idx) => {
      const diff = Math.abs(val - maxSearchResults);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  })();

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-500" />
          Search Settings {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">(Locked)</span>}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowSearchInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex justify-between">
          <Label htmlFor="max-results" className="text-base">
            Max Search Results
          </Label>
          <span className="text-base font-bold">{maxSearchResults}</span>
        </div>
        {showSearchInfo && (
          <Alert className="mt-2">
            <AlertDescription>
              Limit the number of results guests see when they search YouTube.
              Fewer results can speed up loading.
            </AlertDescription>
          </Alert>
        )}
        <Input
          id="max-results"
          type="range"
          min={0}
          max={ALLOWED_VALUES.length - 1}
          step={1}
          value={currentSliderIndex}
          disabled={isPartyClosed}
          onChange={(e) => {
            if (isPartyClosed) return;
            const index = Number(e.target.value);
            const val = ALLOWED_VALUES[index];
            
            if (val !== undefined) {
              if (IS_DEBUG) console.log("[SettingsSearch] Setting max results:", val);
              onSetMaxResults(val);
            }
          }}
          className="w-full"
        />
      </div>
    </div>
  );
}
