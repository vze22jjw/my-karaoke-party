"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Crown } from "lucide-react";
import { cn } from "~/lib/utils";

const HOST_AVATAR_MAP: Record<string, string> = {
  "👑": "crown",
  "🧠": "brain",
  "🧑‍🚀": "astronaut",
  "🎩": "tophat",
  "🍾": "cork-bottle",
};

const HOST_AVATARS = Object.keys(HOST_AVATAR_MAP);

type Props = {
  hostAvatar: string | null;
  onChangeHostAvatar: (avatar: string) => void;
  isPartyClosed?: boolean;
};

export function SettingsHostAvatar({
  hostAvatar,
  onChangeHostAvatar,
  isPartyClosed,
}: Props) {
  const t = useTranslations('host.settings.avatar');
  const [showAvatarInfo, setShowAvatarInfo] = useState(false);
  const [shuffledHostAvatars, setShuffledHostAvatars] = useState(HOST_AVATARS);

  useEffect(() => {
    setShuffledHostAvatars([...HOST_AVATARS].sort(() => Math.random() - 0.5));
  }, []);

  const activeAvatar = hostAvatar ?? "👑";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          {t('title')} {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">(Locked)</span>}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowAvatarInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showAvatarInfo && (
        <Alert className="mt-2">
          <AlertDescription>{t('info')}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3">
        {shuffledHostAvatars.map((avatar) => (
          <button
            key={avatar}
            type="button"
            disabled={isPartyClosed}
            onClick={() => !isPartyClosed && onChangeHostAvatar(avatar)}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-3xl leading-none select-none transition-all",
              activeAvatar === avatar
                ? "bg-primary ring-2 ring-primary-foreground"
                : "sm:hover:bg-muted-foreground/20",
              isPartyClosed && "opacity-50 cursor-not-allowed"
            )}
            data-testid={`avatar-select-${HOST_AVATAR_MAP[avatar] ?? 'unknown'}`}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  );
}
