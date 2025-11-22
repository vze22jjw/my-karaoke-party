"use client";

import { useState } from "react";
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
  ListMusic,
  Music,
  Play,
  Settings,
} from "lucide-react";
import { cn } from "~/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const StepContent = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  </div>
);

const Dots = ({ total, current }: { total: number; current: number }) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "h-2 w-2 rounded-full transition-all",
          i + 1 === current ? "bg-primary" : "bg-muted-foreground/50"
        )}
      />
    ))}
  </div>
);

export function HostTourModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(1);
  const totalSteps = 2; 

  const handleClose = () => {
    onClose();
    setTimeout(() => setStep(1), 200);
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      {/* FIX: Increased z-index to 10000 */}
      <DrawerContent className="flex flex-col h-full snap-align-none z-[10000]">
        
        <div className="mx-auto w-full max-w-2xl p-4 pt-8 pb-4 flex-1 overflow-y-auto">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-3xl font-bold">
              Host Controls
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              A quick guide to managing your party.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {step === 1 && (
              <>
                <StepContent icon={<Play className="h-6 w-6" />} title="1. Start & Manage the Party">
                  Your party is currently **&quot;OPEN&quot;**. Guests can join, but the 
                  player is idle. Go to the **Settings** tab and click 
                  **Start Party** when you&apos;re ready to load the first song.
                </StepContent>
                <StepContent icon={<ListMusic className="h-6 w-6" />} title="2. Control the Queue">
                  The **Playlist** tab is your main control center. You can see 
                  the full list of upcoming songs, remove any you don&apos;t want, 
                  and use the playback controls to **Play, Pause, or Skip** the song that is currently on the player screen.
                </StepContent>
              </>
            )}

            {step === 2 && (
              <>
                <StepContent icon={<Settings className="h-6 w-6" />} title="3. Customize Your Vibe">
                  In **Settings**, you can add **Theme Suggestions** for your guests 
                  or create a library of **Idle Messages** (like lyrics or 
                  quotes) to show on the player screen when no music is playing.
                </StepContent>
                <StepContent icon={<Music className="h-6 w-6" />} title="4. Spotify Integration">
                  Also in **Settings**, you can paste in a **Spotify Playlist ID** (or URL). 
                  This will show the top songs from that *specific* playlist to your 
                  guests on their Suggestions tab. If you leave it blank, it defaults 
                  to a global &quot;Karaoke Classics&quot; playlist.
                </StepContent>
              </>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto p-4 border-t border-border bg-background">
          <Dots total={totalSteps} current={step} />
          
          <div className="mt-4 flex gap-4">
            {step > 1 ? (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                className="w-1/3"
              >
                Previous
              </Button>
            ) : (
              <div className="w-1/3" />
            )}

            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                className="w-2/3"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                className="w-2/3 bg-green-600 hover:bg-green-700"
                onClick={handleClose}
              >
                <Check className="mr-2 h-5 w-5" />
                Got it, let&apos;s start!
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
