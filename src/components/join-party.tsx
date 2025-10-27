"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonHoverGradient } from "./ui/ui/button-hover-gradient";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/ui/drawer";
import { Button } from "./ui/ui/button";
import { Music, Clock } from "lucide-react";
import { Skeleton } from "./ui/ui/skeleton";

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
};

export function JoinParty() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchParties = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/parties/list");
      if (!response.ok) {
        throw new Error("Failed to fetch parties");
      }
      const data = (await response.json()) as Party[];
      setParties(data);
    } catch (err) {
      setError("Error loading parties. Please try again.");
      console.error("Error fetching parties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchParties();
    }
  }, [isOpen]);

  const handleJoinParty = (hash: string) => {
    router.push(`/join/${hash}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "right now";
    if (diffInMinutes < 60) return `created ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `created ${diffInHours}h`;
    return `created ${Math.floor(diffInHours / 24)}d`;
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <div className="w-full">
          <ButtonHoverGradient type="button" className="w-full">
            Join Party 🎤
          </ButtonHoverGradient>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>Open Parties</DrawerTitle>
            <DrawerDescription>
              Choose a party to join
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-center text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && parties.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <Music className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No parties open at the moment</p>
                <p className="mt-1 text-sm">
                  Be the first to create a party!
                </p>
              </div>
            )}

            {!loading && !error && parties.length > 0 && (
              <div className="max-h-[400px] space-y-3 overflow-y-auto">
                {parties.map((party) => (
                  <div
                    key={party.hash}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">{party.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Music className="h-4 w-4" />
                          {party.songCount}{" "}
                          {party.songCount === 1 ? "song" : "songs"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTimeAgo(party.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinParty(party.hash)}
                      variant="default"
                    >
                      Enter
                    </Button>
                  </div>
                ))}
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
