"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info } from "lucide-react";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
};

export function SettingsSearch({ maxSearchResults, onSetMaxResults }: Props) {
  const [showSearchInfo, setShowSearchInfo] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Search Settings</h3>
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
          min={5}
          max={25}
          step={1}
          value={maxSearchResults}
          onChange={(e) => {
            const val = Number(e.target.value) ?? 10;
            if (IS_DEBUG) console.log("[SettingsSearch] Setting max results:", val);
            onSetMaxResults(val);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
}
