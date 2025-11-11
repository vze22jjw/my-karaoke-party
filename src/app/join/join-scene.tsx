/* eslint-disable */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocalStorage, useViewportSize } from "@mantine/hooks";
import logo from "~/assets/my-karaoke-party-logo.png";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/ui/form";
import { Input } from "~/components/ui/ui/input";
import { ButtonHoverGradient } from "~/components/ui/ui/button-hover-gradient";
import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Confetti from "react-canvas-confetti"; // <-- IMPORT CONFETTI

const formSchema = z.object({
  partyCode: z.string().min(4),
  name: z.string().min(2).max(20),
});

export default function JoinScene({
  partyHash,
  partyName,
}: {
  partyHash?: string;
  partyName?: string;
}) {
  const router = useRouter();
  const [name, setName] = useLocalStorage({
    key: "name",
    defaultValue: "",
  });

  // --- START: CONFETTI LOGIC ---
  const { width, height } = useViewportSize();
  const confettiRef = useRef<confetti.CreateTypes | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const onConfettiInit = useCallback((instance: confetti.CreateTypes | null) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    if (confettiRef.current) {
      setShowConfetti(true);
      confettiRef.current({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, []);
  // --- END: CONFETTI LOGIC ---

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyCode: partyHash ?? "",
      name: name,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    setName(values.name);
    fireConfetti(); // <-- FIRE CONFETTI

    const codeToJoin = partyHash ?? values.partyCode;
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      router.push(`/party/${codeToJoin}`);
    }, 300);
  }

  useEffect(() => {
    form.setValue("name", name);
    if (partyHash) {
      form.setValue("partyCode", partyHash);
    }
  }, [name, partyHash, form]);

  return (
    <main className="flex min-h-screen flex-col items-center text-white">
      {/* --- ADD CONFETTI COMPONENT --- */}
      <Confetti
        refConfetti={onConfettiInit}
        width={width}
        height={height}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 200,
          top: 0,
          left: 0,
          pointerEvents: 'none',
          display: showConfetti ? 'block' : 'none',
        }}
      />
      {/* --- END CONFETTI COMPONENT --- */}

      <div className="container flex flex-1 flex-col items-center gap-4 px-4 py-4">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-sm flex-shrink-0 sm:max-w-[666px]"
        />
        <div className="flex w-full max-w-xs flex-1 flex-col items-center justify-center px-5">
          {partyName && (
            <div className="mb-4 w-full text-center">
              <p className="text-sm text-white/80">Joining:</p>
              <h1 className="text-outline scroll-m-20 text-xl font-extrabold tracking-tight uppercase break-words sm:text-2xl">
                {partyName}
              </h1>
            </div>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex w-full flex-col space-y-4 text-left"
            >
              {!partyHash && (
                <FormField
                  control={form.control}
                  name="partyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the party code..."
                          className="input input-bordered w-full"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your name..."
                        className="input input-bordered w-full"
                        autoFocus
                        minLength={3}
                        maxLength={20}
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-white/70">
                      Tip: Your name is case-sensitive. Use the exact same name
                      (e.g., &apos;Singer&apos; vs &apos;singer&apos;) to keep your
                      song history!
                    </FormDescription>
                  </FormItem>
                )}
              />

              <ButtonHoverGradient
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Joining..." : "Join Party 🎉"}
              </ButtonHoverGradient>
            </form>
          </Form>

          {partyHash && (
            <Link
              href="/?openParties=true"
              className="mt-4 text-sm text-white/80 sm:hover:text-white sm:hover:underline"
              replace
            >
              &larr; Back to parties list
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
