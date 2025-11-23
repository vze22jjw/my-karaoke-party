"use client";

import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { QrCode } from "~/components/qr-code";
import { getUrl } from "~/utils/url";
import { env } from "~/env";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  partyHash: string;
};

export function SettingsLinks({ partyHash }: Props) {
  if (IS_DEBUG) console.log("[SettingsLinks] Rendering for hash:", partyHash);

  const joinUrl = getUrl(`/join/${partyHash}`);
  const playerUrl = getUrl(`/player/${partyHash}`);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
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
              value={playerUrl}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
        </div>
        <div className="flex justify-center">
          <QrCode url={joinUrl} />
        </div>
      </div>
    </div>
  );
}
