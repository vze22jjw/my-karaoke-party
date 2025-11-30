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
import { useTranslations } from "next-intl";

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
  const t = useTranslations('tour');
  const tParty = useTranslations('tour.party');

  const [step, setStep] = useState(1);
  const totalSteps = 2; 

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const handleClose = () => {
    onFireConfetti();
    onClose();
    setTimeout(() => setStep(1), 200);
  };

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
              {tParty('welcome')}
            </DrawerTitle>
            <DrawerDescription className="text-lg text-muted-foreground">
              {tParty('intro')}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<Monitor className="h-6 w-6" />} title={tParty('step1Title')}>
                  {tParty.rich('step1Desc', {
                    strong: (chunks) => <strong className="font-bold text-foreground">{chunks}</strong>
                  })}
                </StepContent>
                <StepContent 
                    icon={(
                        <div className="flex">
                            <Music className="h-6 w-6" />
                            <Plus className="h-4 w-4" />
                        </div>
                    )} 
                    title={tParty('step2Title')}
                >
                  {tParty('step2Desc')}
                </StepContent>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent icon={<Lightbulb className="h-6 w-6 text-yellow-500" />} title={tParty('step3Title')}>
                  {tParty.rich('step3Desc', {
                    strong: (chunks) => <strong className="font-bold text-foreground">{chunks}</strong>
                  })}
                </StepContent>
                <StepContent icon={<Users className="h-6 w-6" />} title={tParty('step4Title')}>
                  {tParty('step4Desc')}
                </StepContent>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto p-4 pb-20 border-t border-border bg-background flex-shrink-0">
          <Dots total={totalSteps} current={step} />
          
          <div className="mt-4 flex gap-4">
            {step > 1 ? (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                className="w-1/3"
              >
                {t('prev')}
              </Button>
            ) : (
              <div className="w-1/3" />
            )}

            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                className="w-2/3"
              >
                {t('next')}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-2/3 bg-green-600 hover:bg-green-700"
                onClick={handleClose}
              >
                <Check className="mr-2 h-5 w-5" />
                {tParty('finish')}
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
