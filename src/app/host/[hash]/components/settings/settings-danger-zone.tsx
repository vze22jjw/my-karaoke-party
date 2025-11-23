"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/ui/alert";
import { Info, AlertCircle, Trash2 } from "lucide-react";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
};

export function SettingsDangerZone({
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
}: Props) {
  const [showDangerInfo, setShowDangerInfo] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowDangerInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
        {showDangerInfo && (
          <Alert className="mt-2" variant="destructive">
            <AlertDescription>
              This will close the party, delete all songs, and disconnect
              everyone. This can&apos;t be undone.
            </AlertDescription>
          </Alert>
        )}
        {isConfirmingClose ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Are you sure?</AlertTitle>
            <AlertDescription>This action is permanent.</AlertDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancelClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (IS_DEBUG) console.log("[SettingsDangerZone] Confirming party close");
                  onConfirmClose();
                }}
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
  );
}
