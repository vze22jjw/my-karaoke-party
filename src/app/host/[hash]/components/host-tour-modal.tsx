"use client";

import { Button } from "~/components/ui/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/ui/drawer";
import { Check, MessageSquare, Play, Settings } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function HostTourModal({ isOpen, onClose }: Props) {
  return (
    <Drawer open={isOpen} onClose={onClose}>
      <DrawerContent>
        {/* Increased bottom padding (pb-32) to lift content above toast area */}
        <div className="mx-auto w-full max-w-2xl p-4 pb-32">
          <DrawerHeader>
            <DrawerTitle className="text-3xl font-bold">
              Welcome to Your Party!
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              Here&apos;s a quick guide to get started.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 px-4">
            {/* Step 1: Party is OPEN */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                <Play className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  1. Your Party is &quot;OPEN&quot;
                </h3>
                <p className="text-muted-foreground">
                  Right now, the player screen is idle. Singers can join and add
                  songs. When you&apos;re ready, click the{" "}
                  <strong>Start Party</strong> button in your settings.
                </p>
              </div>
            </div>

            {/* Step 2: Idle Messages */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  2. Set Up Your Idle Screen
                </h3>
                <p className="text-muted-foreground">
                  While you wait, go to the{" "}
                  <strong>&quot;Idle Messages&quot;</strong> section in your
                  settings. Add song lyrics or welcome messages to your personal
                  library and sync them to the player!
                </p>
              </div>
            </div>

            {/* Step 3: Manage Your Show */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-500 text-white">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">3. Control Your Party</h3>
                <p className="text-muted-foreground">
                  Use the <strong>Playlist</strong> tab to manage the queue and
                  the <strong>Settings</strong> tab to change party rules or
                  export your song history later.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <Button
              type="button"
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={onClose}
            >
              <Check className="mr-2 h-5 w-5" />
              Got it, let&apos;s start!
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
