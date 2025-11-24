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
  Monitor,
  Music,
  Plus,
  Lightbulb,
  Users,
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
  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-4">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
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

export function PartyTourModal({ isOpen, onClose, onFireConfetti }: Props) {
  const [step, setStep] = useState(1);
  const totalSteps = 2; 

  const handleClose = () => {
    onFireConfetti();
    onClose();
    setTimeout(() => setStep(1), 200);
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerContent className="flex flex-col h-full snap-align-none z-[10000]">
        
        <div className="mx-auto w-full max-w-2xl p-4 pt-8 pb-4 flex-1 overflow-y-auto">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-3xl font-bold">
              Welcome to the Party!
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              Here&apos;s a quick look at the controls.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            
            {step === 1 && (
              <>
                <StepContent icon={<Monitor className="h-6 w-6" />} title="1. Playing">
                  See what&apos;s currently playing, who is singing, and what&apos;s up next in the queue.
                </StepContent>
                <StepContent 
                    icon={(
                        <div className="flex">
                            <Music className="h-6 w-6" />
                            <Plus className="h-4 w-4" />
                        </div>
                    )} 
                    title="2. Add Song"
                >
                  Search YouTube for any karaoke song and add it to the list. Fairness rules ensure everyone gets a turn!
                </StepContent>
              </>
            )}

            {step === 2 && (
              <>
                <StepContent icon={<Lightbulb className="h-6 w-6 text-yellow-500" />} title="3. Suggestions">
                  Get inspiration from the host&apos;s themes, **Hot on Spotify** trends, and the party&apos;s all-time Top Played songs.
                </StepContent>
                <StepContent icon={<Users className="h-6 w-6" />} title="4. Singers & Applause">
                  See everyone in the party and check their queue. 
                  Tap the 👏 button to send applause and boost the singer&apos;s score!
                </StepContent>
              </>
            )}
          </div>
        </div>

        {/* Added pb-20 to lift buttons above toast messages */}
        <div className="w-full max-w-2xl mx-auto p-4 pb-20 border-t border-border bg-background flex-shrink-0">
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
                Got it, let&apos;s sing!
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
