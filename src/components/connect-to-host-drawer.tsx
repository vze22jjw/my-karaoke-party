"use client";

import { useRouter } from "next/navigation";
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
import { KeyRound, Music, Users, Clock } from "lucide-react";
import { Skeleton } from "~/components/ui/ui/skeleton";

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
  singerCount: number;
};

function ConnectToHostDrawerComponent() {
    const router = useRouter();
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
            setError("Error loading parties. Please try again.");
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
        const diffInMinutes = Math.floor(
          (now.getTime() - created.getTime()) / (1000 * 60),
        );
    
        if (diffInMinutes < 1) return "right now";
        if (diffInMinutes < 60) return `created ${diffInMinutes} min`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `created ${diffInHours}h`;
        return `created ${Math.floor(diffInHours / 24)}d`;
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
                    Connect to Host
                    <KeyRound className="ml-3 h-6 w-6 text-cyan-400" />
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-2xl">
                    <DrawerHeader>
                        <DrawerTitle>Reconnect as Host</DrawerTitle>
                        <DrawerDescription>Select your party to log back in.</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 pb-0">
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
                            <div className="max-h-[400px] space-y-3 overflow-y-auto">
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
                                 No active parties found.
                             </div>
                        )}
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

export function ConnectToHostButton() {
    return (
        <Suspense fallback={
            <Button 
                type="button" 
                variant="secondary"
                className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                disabled
            >
                Connect to Host
                <KeyRound className="ml-3 h-6 w-6 text-cyan-400" />
            </Button>
        }>
            <ConnectToHostDrawerComponent />
        </Suspense>
    );
}
