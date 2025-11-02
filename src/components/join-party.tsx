"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ButtonHoverGradient } from "~/components/ui/ui/button-hover-gradient";
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
import { Music, Clock, Users } from "lucide-react";
import { Skeleton } from "~/components/ui/ui/skeleton";

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
  singerCount: number;
};

// --- START: New inner component ---
// We must wrap the component logic in a child component
// so that the main export is not a client component.
// This allows us to use <Suspense> on the page.
function JoinPartyDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // --- START: Logic to auto-open drawer ---
  useEffect(() => {
    const openParam = searchParams.get("openParties");
    if (openParam === "true") {
      setIsOpen(true);
      // Clean up the URL
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);
  // --- END: Logic to auto-open drawer ---

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

  // --- START: FIX ---
  // Updated this function to close the drawer before navigating
  const handleJoinParty = (hash: string) => {
    setIsOpen(false); // 1. Close the drawer
    setTimeout(() => {
      router.push(`/join/${hash}`); // 2. Navigate after a short delay
    }, 150); // 150ms delay to allow the drawer to close
  };
  // --- END: FIX ---

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

  // --- START: Helper function for mobile time format ---
  const formatTimeAgoMobile = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };
  // --- END: Helper function for mobile time format ---

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
      shouldScaleBackground={false} // <-- This prop is correct
    >
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
            <DrawerDescription>Choose a party to join</DrawerDescription>
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
                      <h3 className="font-semibold uppercase">{party.name}</h3>
                      {/* --- START: Updated responsive info row --- */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Music className="h-4 w-4" />
                          {party.songCount}
                          <span className="hidden sm:inline">
                            {party.songCount === 1 ? "song" : "songs"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {party.singerCount}
                          <span className="hidden sm:inline">
                            {party.singerCount === 1 ? "singer" : "singers"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            {formatTimeAgo(party.createdAt)}
                          </span>
                          <span className="sm:hidden">
                            {formatTimeAgoMobile(party.createdAt)}
                          </span>
                        </span>
                      </div>
                      {/* --- END: Updated responsive info row --- */}
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
// --- END: New inner component ---

// --- START: Main export wrapped in Suspense ---
export function JoinParty() {
  return (
    <Suspense fallback={<ButtonHoverGradient type="button" className="w-full" disabled>Join Party 🎤</ButtonHoverGradient>}>
      <JoinPartyDrawer />
    </Suspense>
  );
}
// --- END: Main export wrapped in Suspense ---
