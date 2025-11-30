"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Lightbulb, Info, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FitText } from "~/components/fit-text";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  themeSuggestions: string[];
  onUpdateThemeSuggestions: (suggestions: string[]) => void;
  isPartyClosed?: boolean;
};

export function SettingsSuggestions({
  themeSuggestions,
  onUpdateThemeSuggestions,
  isPartyClosed,
}: Props) {
  const t = useTranslations('host.settings.suggestions');
  const tCommon = useTranslations('common');
  const [newSuggestion, setNewSuggestion] = useState("");
  const [showSuggestionsInfo, setShowSuggestionsInfo] = useState(false);

  const handleAddSuggestion = () => {
    if (!newSuggestion.trim()) return;
    if (IS_DEBUG) console.log("[SettingsSuggestions] Adding:", newSuggestion);
    const updated = [...themeSuggestions, newSuggestion.trim()];
    onUpdateThemeSuggestions(updated);
    setNewSuggestion("");
  };

  const handleDeleteSuggestion = (index: number) => {
    if (IS_DEBUG) console.log("[SettingsSuggestions] Deleting index:", index);
    const updated = themeSuggestions.filter((_, i) => i !== index);
    onUpdateThemeSuggestions(updated);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between h-9">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 overflow-hidden">
          <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
             <FitText className="justify-start h-full" contentClassName="origin-left">
                <span className="text-lg font-medium flex items-center gap-2">
                    {t('title')}
                    {isPartyClosed && (
                        <span className="text-sm text-muted-foreground font-normal whitespace-nowrap">
                            ({tCommon('readOnly')})
                        </span>
                    )}
                </span>
             </FitText>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground flex-shrink-0"
          onClick={() => setShowSuggestionsInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestionsInfo && (
        <Alert className="mt-2">
          <AlertDescription>{t('info')}</AlertDescription>
        </Alert>
      )}

      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder={isPartyClosed ? "Disabled" : t('placeholder')}
          value={newSuggestion}
          onChange={(e) => setNewSuggestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isPartyClosed && handleAddSuggestion()}
          className="bg-background"
          disabled={isPartyClosed}
        />
        <Button
          type="button"
          onClick={handleAddSuggestion}
          disabled={(isPartyClosed ?? false) || !newSuggestion.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-60 w-full overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-2">
        {themeSuggestions.length > 0 ? (
          themeSuggestions.map((text, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded bg-background p-2"
            >
              <div className="flex gap-2 overflow-hidden">
                <span className="font-bold text-primary min-w-[1.5rem]">{index + 1}.</span>
                <p className="text-sm truncate">{text}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 text-red-500"
                onClick={() => handleDeleteSuggestion(index)}
                disabled={isPartyClosed}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-center text-sm text-muted-foreground p-4">
            {t('empty')}
          </p>
        )}
      </div>
    </div>
  );
}
