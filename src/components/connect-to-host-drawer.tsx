"use client";

import { useRouter } from "~/navigation";
import { useState, Suspense } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/ui/drawer";
import { Button } from "~/components/ui/ui/button";
import { KeyRound, Music, Users, Clock, LayoutDashboard } from "lucide-react";
import { Skeleton } from "~/components/ui/ui/skeleton";
import { Link } from "~/navigation";
import { useTranslations } from "next-intl";

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
  singerCount: number;
};

function ConnectToHostDrawerComponent() {
    const router = useRouter();
    const t = useTranslations('drawers');
    const [isOpen, setIsOpen] = useState(false);
    const [parties, setParties] = useState<Party[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOpenParties = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/parties/list");
            if (!response.ok) throw new Error("Failed to fetch parties list");
            const data = await response.json() as Party[];
            setParties(data);
        } catch (e) {
            setError(t('loadingError'));
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEnterHost = (hash: string) => {
        setIsOpen(false);
        router.push(`/host/${hash}`);
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const created = new Date(dateString);
        const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
        if (diffInMinutes < 1) return "now";
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        return `${Math.floor(diffInHours / 24)}d`;
    };

    return (
        <Drawer
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (open) {
                    void fetchOpenParties();
                }
            }}
            shouldScaleBackground={false}
        >
            <DrawerTrigger asChild>
                <Button 
                    type="button" 
                    variant="secondary"
                    className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                >
                    {t('connectHostBtn')}
                    <KeyRound className="ml-3 h-6 w-6 text-cyan-400" />
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-2xl flex flex-col h-[80vh]">
                    <DrawerHeader>
                        <DrawerTitle>{t('reconnectHost')}</DrawerTitle>
                        <DrawerDescription>{t('reconnectDesc')}</DrawerDescription>
                    </DrawerHeader>
                    
                    <div className="p-4 pb-0 flex-1 overflow-y-auto">
                        {loading && (
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-center text-red-500">
                                {error}
                            </div>
                        )}

                        {!loading && !error && parties && parties.length > 0 && (
                            <div className="space-y-3">
                                {parties.map((party) => (
                                    <div
                                        key={party.hash}
                                        className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                                    >
                                        <div className="space-y-1">
                                            <h3 className="font-semibold uppercase">{party.name}</h3>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Music className="h-4 w-4" />
                                                    {party.songCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    {party.singerCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {formatTimeAgo(party.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleEnterHost(party.hash)}>
                                            Enter
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && !error && parties && parties.length === 0 && (
                             <div className="text-center py-8 text-muted-foreground">
                                 {t('noActive')}
                             </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-background mt-auto">
                         <Button asChild variant="outline" className="w-full h-12 text-base" onClick={() => setIsOpen(false)}>
                            <Link href="/host">
                                <LayoutDashboard className="mr-2 h-5 w-5" />
                                {t('historyDashboard')}
                            </Link>
                        </Button>
                    </div>

                    <DrawerFooter className="pt-2">
                        <DrawerClose asChild>
                            <Button variant="ghost">{t('cancel')}</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

export function ConnectToHostButton() {
    const t = useTranslations('drawers');
    return (
        <Suspense fallback={
            <Button 
                type="button" 
                variant="secondary"
                className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                disabled
            >
                {t('connectHostBtn')}
                <KeyRound className="ml-3 h-6 w-6 text-cyan-400" />
            </Button>
        }>
            <ConnectToHostDrawerComponent />
        </Suspense>
    );
}
