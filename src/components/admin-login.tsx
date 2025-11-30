"use client";

import { useState } from "react";
import { useRouter } from "~/navigation";
import { Input } from "~/components/ui/ui/input";
import { Button } from "~/components/ui/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "~/navigation";
import { useTranslations } from "next-intl";

export function AdminLogin() {
  const router = useRouter();
  const t = useTranslations('host.access');
  const tCommon = useTranslations('common');
  const tToasts = useTranslations('toasts.adminLogin');

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ? tToasts('invalid') : tToasts('error'));
        setLoading(false);
        return;
      }      
      router.refresh();

    } catch (error) {
      toast.error(tToasts('error'));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('desc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-center"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? tCommon('loading') : t('unlock')}
          </Button>
        </form>

        <div className="pt-2">
            <Link 
                href="/" 
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
                &larr; {tCommon('backToHome')}
            </Link>
        </div>
      </div>
    </div>
  );
}
