"use client";

import { useState, useRef } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useRouter } from "~/navigation";

export function SettingsBackup() {
  const t = useTranslations('host.settings.backup');
  const tCommon = useTranslations('common');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const utils = api.useUtils();
  const router = useRouter();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      const response = await fetch(`${baseUrl}/api/admin/backup/export`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const now = new Date();
      const datePart = now.toISOString().split('T')[0];
      const timePart = now.toTimeString().split(' ')[0]!.replace(/:/g, '-');
      
      a.download = `mkp_backup_${datePart}_${timePart}.json`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(tCommon('success'));
    } catch (error) {
      toast.error(tCommon('error'));
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result;
        if (typeof jsonContent !== "string") return;

        const parsed = JSON.parse(jsonContent) as unknown;
        await uploadBackup(parsed);
      } catch (err) {
        toast.error(tCommon('error'));
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const uploadBackup = async (data: unknown) => {
    setIsImporting(true);
    try {
       const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      const res = await fetch(`${baseUrl}/api/admin/backup/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json() as { success: boolean; details?: { success: number; skipped: number; errors: number } };

      if (!res.ok || !result.success) {
        throw new Error("Import failed on server");
      }

      toast.success(tCommon('success'));
      
      await utils.playlist.getGlobalStats.invalidate();
      router.refresh();

    } catch (error) {
      toast.error(tCommon('error'));
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <SaveIcon className="h-5 w-5 text-blue-500" />
          {t('title')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showInfo && (
        <Alert className="mt-2">
          <AlertDescription>{t('info')}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting || isImporting}
        >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t('download')}
        </Button>

        <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
        >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t('upload')}
        </Button>
        
        <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  )
}
