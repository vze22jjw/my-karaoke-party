"use client";

import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
// import { Switch } from "~/components/ui/ui/switch"; // <-- Removed this incorrect import
import { getUrl } from "~/utils/url";
import { QrCode } from "~/components/qr-code";
// import { Slider } from "~/components/ui/slider"; // <-- Removed this incorrect import
import { Input } from "~/components/ui/ui/input"; // <-- Using Input, which you have
import { AlertCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/ui/alert";
// --- THIS IS THE FIX (Part 1) ---
// Removed unused imports
// import { usePartySocket } from "~/hooks/use-party-socket";
// import { type KaraokeParty } from "party";
import { cn } from "~/lib/utils";
// --- END THE FIX ---

type Props = {
  partyHash: string;
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean;
  onTogglePlayback: () => void;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
};

const ToggleButton = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
}) => (
  <div className="flex items-center justify-between rounded-lg border p-4">
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Button
      id={id}
      variant="outline"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </Button>
  </div>
);

export function TabSettings({
  partyHash,
  useQueueRules,
  onToggleRules,
  disablePlayback,
  onTogglePlayback,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
}: Props) {
  const joinUrl = getUrl(`/join/${partyHash}`);
  const playerUrl = getUrl(`/player/${partyHash}`);
  
  const playerUrlWithLabel = `${playerUrl}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Party Links</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Join Link (for singers)</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={joinUrl}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Player Link (for TV/projector)</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={playerUrlWithLabel} // This variable is now fixed
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <QrCode url={joinUrl} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Party Rules</h3>
        <ToggleButton
          id="queue-rules"
          checked={useQueueRules}
          onCheckedChange={onToggleRules}
          label="Queue Ordering"
          description={
            useQueueRules
              ? "ON (Fairness)"
              : "OFF (First Come, First Served)"
          }
        />
        
        <ToggleButton
          id="disable-playback"
          checked={disablePlayback}
          onCheckedChange={onTogglePlayback}
          label="Disable Player"
          description={
            disablePlayback
              ? "ON (Use YouTube button)"
              : "OFF (Player is active)"
          }
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Search Settings</h3>
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between">
            <Label htmlFor="max-results" className="text-base">
              Max Search Results
            </Label>
            <span className="text-base font-bold">{maxSearchResults}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Limit the number of results from YouTube.
          </p>
          <Input
            id="max-results"
            type="range"
            min={5}
            max={25}
            step={1}
            value={maxSearchResults}
            onChange={(e) => onSetMaxResults(Number(e.target.value) ?? 10)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
          <div>
            <Label className="text-base">End Party</Label>
            <p className="text-sm text-muted-foreground">
              This will close the party, delete all songs, and disconnect
              everyone. This cannot be undone.
            </p>
          </div>
          {isConfirmingClose ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Are you sure?</AlertTitle>
              <AlertDescription>
                This action is permanent.
              </AlertDescription>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={onCancelClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={onConfirmClose}
                >
                  Yes, End Party
                </Button>
              </div>
            </Alert>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onCloseParty}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Close Party
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
