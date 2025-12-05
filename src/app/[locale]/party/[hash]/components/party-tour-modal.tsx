"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/ui/drawer";
import { Button } from "~/components/ui/ui/button";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Check, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onFireConfetti: () => void;
};

export function PartyTourModal({ isOpen, onClose, onFireConfetti }: Props) {
  const t = useTranslations('tour.party');
  const tTour = useTranslations('tour');
  const [step, setStep] = useState(0);

  const steps = [
    { title: t('step1Title'), desc: t('step1Desc') },
    { title: t('step2Title'), desc: t('step2Desc') },
    { title: t('step3Title'), desc: t('step3Desc') },
    { title: t('step4Title'), desc: t('step4Desc') },
    { title: t('step5Title'), desc: t('step5Desc') },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
      onFireConfetti();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onClose();
    onFireConfetti();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DrawerContent>
        <div className="w-full flex justify-center pt-2 pb-1">
            <button 
                onClick={handleSkip}
                className="p-2 text-muted-foreground hover:text-primary transition-colors animate-bounce focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                aria-label="Skip Tour"
                title="Skip Tour"
            >
                <ChevronDown className="h-6 w-6" />
            </button>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold text-center">
                {step === 0 ? t('welcome') : steps[step]?.title}
            </DrawerTitle>
            <DrawerDescription className="text-center text-lg mt-2">
                {step === 0 ? t('intro') : steps[step]?.desc}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 flex flex-col items-center gap-6">
             <div className="flex gap-1.5">
                {steps.map((_, i) => (
                    <div 
                        key={i}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                        )}
                    />
                ))}
             </div>
          </div>

          <DrawerFooter className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handlePrev} disabled={step === 0}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {tTour('prev')}
            </Button>
            <Button onClick={handleNext}>
              {step === steps.length - 1 ? (
                  <>
                    {t('finish')}
                    <Check className="ml-2 h-4 w-4" />
                  </>
              ) : (
                  <>
                    {tTour('next')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
              )}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
