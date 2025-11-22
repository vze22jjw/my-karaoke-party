/* eslint-disable */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@mantine/hooks";
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
  FormMessage,
} from "~/components/ui/ui/form";
import { Input } from "~/components/ui/ui/input";
import { Button } from "~/components/ui/ui/button";
import { useEffect } from "react";
import { JoinParty } from "~/components/join-party";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

const AVATARS = [
  "🎤", "🎧", "🥁", "🧑‍🎤", "👩‍🎤",
  "🔥", "🍺", "😎", "🕺", "💃",
];

const AvatarPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
    {AVATARS.map((avatar) => (
      <button
        key={avatar}
        type="button"
        onClick={() => onChange(avatar)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full text-3xl transition-all shadow-sm",
          value === avatar
            ? "bg-primary ring-4 ring-primary/50 scale-110 shadow-lg z-10" 
            : "bg-black/40 border border-white/10 hover:bg-white/20 hover:scale-105"
        )}
      >
        {avatar}
      </button>
    ))}
  </div>
);

const joinSchema = z.object({
  partyHash: z.string().min(4, "Party code must be at least 4 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  avatar: z.string().default("🎤"),
});

type Props = {
  partyHash?: string;
  partyName?: string;
};

export function JoinScene({ partyHash, partyName }: Props) {
  // If partyHash is provided (e.g. /join/ABCD), we show the specific form.
  // Otherwise, we show the generic JoinParty component which has the drawer.
  
  if (!partyHash) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl mb-2 text-outline uppercase">
                JOIN PARTY
              </h1>
              <p className="text-white/80">Enter the code to join the fun</p>
            </div>
            <JoinParty />
          </div>
        </div>
      );
  }

  // Specific Party Join Flow (Name & Avatar Selection)
  const router = useRouter();
  const [lsName, setLsName] = useLocalStorage<string>({ key: "name", defaultValue: "" });
  const [lsAvatar, setLsAvatar] = useLocalStorage<string>({ key: "avatar", defaultValue: "🎤" });

  const form = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      partyHash: partyHash,
      name: "",
      avatar: "🎤",
    },
  });

  useEffect(() => {
    if (lsName) form.setValue("name", lsName);
    if (lsAvatar && AVATARS.includes(lsAvatar)) form.setValue("avatar", lsAvatar);
  }, [lsName, lsAvatar, form]);

  async function onSubmit(values: z.infer<typeof joinSchema>) {
    try {
      const res = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyHash: values.partyHash,
          name: values.name,
          avatar: values.avatar,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        form.setError("partyHash", { message: data.error || "Failed to join" });
        return;
      }

      setLsName(values.name);
      setLsAvatar(values.avatar);
      toast.success("Welcome to the party!");
      router.push(`/party/${data.hash}`);

    } catch (error) {
      console.error("Join error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-xl shadow-2xl border-2 border-white/20">
            <Image src={logo} alt="Logo" fill className="object-cover" priority />
          </div>
          <h1 className="text-outline text-3xl font-extrabold tracking-tight text-white lg:text-4xl uppercase">
            {partyName ? `JOIN ${partyName}` : "JOIN PARTY"}
          </h1>
          <p className="text-white/80 mt-2">Pick your icon and stage name!</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-base font-semibold">Choose your Icon</FormLabel>
                    <FormControl>
                      <AvatarPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-base font-semibold">Stage Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your name..."
                        className="h-12 text-lg bg-black/20 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                        autoFocus
                        minLength={2}
                        maxLength={20}
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-white/60 text-xs">
                      Use the same name to keep your history!
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-14 text-xl font-bold shadow-lg border border-primary/20 hover:scale-[1.02] transition-transform"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Joining..." : "Enter Party"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}
