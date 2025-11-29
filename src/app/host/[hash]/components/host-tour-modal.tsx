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
  Settings,
  Link,
  Activity,
  MessageSquareQuote,
  Scale,
  Download,
} from "lucide-react";
import { cn } from "~/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onFireConfetti: () => void;
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
  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4 select-none">
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

export function HostTourModal({ isOpen, onClose, onFireConfetti }: Props) {
  const [step, setStep] = useState(1);
  const totalSteps = 4; 

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const handleClose = () => {
    onFireConfetti();
    onClose();
    setTimeout(() => setStep(1), 200);
  };

  // Swipe Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); 
    const touch = e.targetTouches[0];
    if (touch) {
        setTouchStart(touch.clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
        setTouchEnd(touch.clientX);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (step < totalSteps) {
        setStep((s) => s + 1);
      } else {
        handleClose();
      }
    }

    if (isRightSwipe) {
      if (step > 1) {
        setStep((s) => s - 1);
      }
    }
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerContent className="flex flex-col h-full snap-align-none z-[10000]">
        
        <div 
            className="mx-auto w-full max-w-2xl p-4 pt-8 pb-4 flex-1 overflow-y-auto"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
          <DrawerHeader className="pb-4 select-none">
            <DrawerTitle className="text-3xl font-bold">
              Host Controls
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              A quick guide to managing your party.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<Link className="h-6 w-6" />} title="1. Party Links">
                  Share the **Join Link** with singers. Open the **Player Link** on your TV. 
                  *Note: If connecting manually via the Start page, enter the 4-digit code BACKWARDS (e.g. DCBA for ABCD) for security.*
                </StepContent>
                <StepContent icon={<Activity className="h-6 w-6" />} title="2. Manage Status">
                  Use **Start Party** to begin the music. Need a break? 
                  Hit **Intermission** to pause the queue and show a slideshow of messages.
                </StepContent>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<ListMusic className="h-6 w-6" />} title="3. Control the Queue">
                  The **Playlist** tab is your main control center. 
                  Play, pause, skip songs, or enable **Manual Sort** to drag-and-drop the order.
                </StepContent>
                <StepContent icon={<Scale className="h-6 w-6" />} title="4. Party Rules">
                  Toggle **Fairness Mode** to prevent queue hogging, or switch **Playback** modes 
                  if you need to open videos directly on YouTube.
                </StepContent>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<Settings className="h-6 w-6" />} title="5. Engage Guests">
                  Add **Theme Suggestions** to inspire song choices.
                </StepContent>
                <StepContent icon={<MessageSquareQuote className="h-6 w-6" />} title="6. Idle Messages">
                  Create a library of custom messages (like announcements or lyrics) 
                  to display on the TV when no song is playing.
                </StepContent>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<Music className="h-6 w-6" />} title="7. Spotify & Search">
                  Link a **Spotify Playlist** to show trending tracks to your guests. 
                  You can also limit **Search Results** to keep things fast.
                </StepContent>
                <StepContent icon={<Download className="h-6 w-6" />} title="8. Export History">
                  At the end of the night, **Export** the list of played songs 
                  to save your party&apos;s soundtrack to Spotify or a text file.
                </StepContent>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto p-4 pb-20 border-t border-border bg-background">
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
