"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/ui/alert";
import { Info, AlertCircle, Trash2, Flame } from "lucide-react";
import { useTranslations } from "next-intl";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  isPartyClosed?: boolean;
};

export function SettingsDangerZone({
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
  isPartyClosed
}: Props) {
  const t = useTranslations('host.settings.danger');
  const tCommon = useTranslations('common');
  const [showDangerInfo, setShowDangerInfo] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
          <Flame className="h-5 w-5" />
          {t('title')}
        </h3>
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
            <AlertDescription>{t('confirmDesc')}</AlertDescription>
          </Alert>
        )}
        
        {isPartyClosed ? (
            <Button
                disabled
                variant="secondary"
                className="w-full opacity-50 cursor-not-allowed"
            >
                {t('closeParty')} (Closed)
            </Button>
        ) : isConfirmingClose ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('confirmTitle')}</AlertTitle>
            <AlertDescription>{t('confirmDesc')}</AlertDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancelClose}>
                {tCommon('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (IS_DEBUG) console.log("[SettingsDangerZone] Confirming party close");
                  onConfirmClose();
                }}
              >
                {t('confirmBtn')}
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
            {t('closeParty')}
          </Button>
        )}
      </div>
    </div>
  );
}
