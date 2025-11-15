"use client";

import { Button } from "~/components/ui/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/ui/drawer";
import {
  Check,
  Monitor,
  Music,
  Plus,
  History,
  Users,
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function PartyTourModal({ isOpen, onClose }: Props) {
  return (
    <Drawer open={isOpen} onClose={onClose}>
      {/* DrawerContent now uses flex-col and h-full to take full available height */}
      {/* The 'snap-align-none' is crucial to prevent it from snapping to the center */}
      <DrawerContent className="flex flex-col h-full snap-align-none">
        {/* Inner div contains padding and controls overflow */}
        {/* pt-8 for top padding, pb-32 for bottom safe area, overflow-y-auto for internal scroll */}
        <div className="mx-auto w-full max-w-2xl p-4 pt-8 pb-32 flex-1 overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle className="text-3xl font-bold">
              Welcome to the Party!
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              Here&apos;s a quick look at the controls.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-1 gap-5 px-4 sm:grid-cols-2">
            {/* Step 1: Player */}
            <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Playing</h3>
                <p className="text-sm text-muted-foreground">
                  See what&apos;s currently playing and what&apos;s up next in
                  the queue.
                </p>
              </div>
            </div>

            {/* Step 2: Add Song */}
            <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                <div className="flex">
                  <Music className="h-6 w-6" />
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Add Song</h3>
                <p className="text-sm text-muted-foreground">
                  Search YouTube for any karaoke song and add it to the list.
                </p>
              </div>
            </div>

            {/* Step 3: History & Suggestions */}
            <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-500 text-white">
                <History className="h-6 w-6" />
              </div>
              <div>
                {/* --- UPDATED TEXT --- */}
                <h3 className="text-lg font-semibold">Suggestions</h3>
                <p className="text-sm text-muted-foreground">
                  Get ideas from the host&apos;s list, <strong>Hot on Spotify</strong>, or the party&apos;s all-time Top Played songs.
                </p>
                {/* --- END UPDATED TEXT --- */}
              </div>
            </div>

            {/* Step 4: Singers */}
            <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500 text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Singers</h3>
                <p className="text-sm text-muted-foreground">
                  See who&apos;s here and check out their song lists.
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="px-4 pt-6">
            <Button
              type="button"
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={onClose}
            >
              <Check className="mr-2 h-5 w-5" />
              Got it, let&apos;s sing!
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
