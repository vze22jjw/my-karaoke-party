"use client";

import { useState, useRef } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SettingsBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/backup/export");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mkp_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Backup downloaded!");
    } catch (error) {
      toast.error("Failed to download backup.");
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
        toast.error("Invalid JSON file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const uploadBackup = async (data: unknown) => {
    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json() as { success: boolean; details?: { success: number; skipped: number; errors: number } };

      if (!res.ok || !result.success) {
        throw new Error("Import failed on server");
      }

      toast.success(`Restored: ${result.details?.success} parties. Skipped: ${result.details?.skipped}.`);
    } catch (error) {
      toast.error("Failed to restore backup.");
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
          Backup & Restore
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
          <AlertDescription>
            <strong>Backup:</strong> Downloads all party data (songs, history, stats) to a JSON file.<br/>
            <strong>Restore:</strong> Upload a JSON backup to restore parties. Existing parties with the same ID will be skipped.
          </AlertDescription>
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
            Save Backup
        </Button>

        <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
        >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Restore
        </Button>
        
        {/* Hidden File Input */}
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
