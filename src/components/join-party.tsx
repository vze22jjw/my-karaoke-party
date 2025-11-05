"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react"; // <-- IMPORT useRef
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
import { io, type Socket } from "socket.io-client"; // <-- IMPORT SOCKET.IO-CLIENT

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
  singerCount: number;
};

function JoinPartyDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const socketRef = useRef<Socket | null>(null); // <-- ADDED

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // --- ADDED: Socket connection useEffect ---
  useEffect(() => {
    // Initialize the socket connection
    const socketInitializer = async () => {
      await fetch("/api/socket"); // Wake up the socket endpoint

      socketRef.current = io({
        path: "/api/socket",
        addTrailingSlash: false,
      });

      socketRef.current.on("connect", () => {
        console.log("[JoinPartySocket] Socket connected");
      });

      // Listen for the list of parties
      socketRef.current.on("open-parties-list", (data: { parties?: Party[], error?: string }) => {
        if (data.error) {
          setError("Error loading parties. Please try again.");
          console.error(data.error);
        } else if (data.parties) {
          setParties(data.parties);
        }
        setLoading(false);
      });
    };

    void socketInitializer();

    // Disconnect socket on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Runs once on component mount
  // --- END: Socket connection useEffect ---

  // --- START: Logic to auto-open drawer ---
  useEffect(() => {
    const openParam = searchParams?.get("openParties");
    if (openParam === "true") {
      setIsOpen(true);
      if (pathname) {
        router.replace(pathname, { scroll: false });
      }
    }
  }, [searchParams, pathname, router]);
  // --- END: Logic to auto-open drawer ---

  // --- UPDATED: fetchParties to use socket ---
  const fetchParties = () => {
    setLoading(true);
    setError(null);
    // Request the list via socket
    socketRef.current?.emit("request-open-parties");
  };
  // --- END: UPDATED fetchParties ---

  useEffect(() => {
    if (isOpen) {
      void fetchParties();
    }
  }, [isOpen]);

  const handleJoinParty = (hash: string) => {
    setIsOpen(false);
    setTimeout(() => {
      router.push(`/join/${hash}`);
    }, 150);
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

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
      shouldScaleBackground={false}
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

export function JoinParty() {
  return (
    <Suspense fallback={<ButtonHoverGradient type="button" className="w-full" disabled>Join Party 🎤</ButtonHoverGradient>}>
      <JoinPartyDrawer />
    </Suspense>
  );
}
