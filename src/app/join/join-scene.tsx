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
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/ui/form";
import { Input } from "~/components/ui/ui/input";
import { ButtonHoverGradient } from "~/components/ui/ui/button-hover-gradient";
import { useEffect } from "react";

const formSchema = z.object({
  partyCode: z.string().min(4), // <-- FIX: Changed from min(8) to min(4)
  name: z.string().min(2).max(20),
});

export default function JoinScene({
  partyHash,
  partyName,
}: {
  partyHash?: string;
  partyName?: string; // <-- Added prop
}) {
  const router = useRouter();

  const [name, setName] = useLocalStorage({
    key: "name",
    defaultValue: "",
  });

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyCode: partyHash ?? "",
      name: name,
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);

    setName(values.name);

    // --- Use partyHash from prop if available, otherwise from form ---
    const codeToJoin = partyHash ?? values.partyCode;
    router.push(`/party/${codeToJoin}`);
  }

  // --- START: FIX ---
  // This useEffect updates the form fields when props change (e.g., navigating
  // from one join link to another) or when name loads from local storage.
  useEffect(() => {
    form.setValue("name", name);
    if (partyHash) {
      form.setValue("partyCode", partyHash);
    }
  }, [name, partyHash, form]);
  // --- END: FIX ---

  return (
    <main className="flex min-h-screen flex-col items-center text-white">
      <div className="container flex flex-1 flex-col items-center gap-4 px-4 py-4">
        {" "}
        {/* <-- Reduced gap and vertical padding */}
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-sm flex-shrink-0 sm:max-w-[666px]"
        />
        {/* Wrapper for remaining content, set to center */}
        <div className="flex w-full max-w-xs flex-1 flex-col items-center justify-center px-5">
          {" "}
          {/* <-- Reduced max-width and removed vertical padding */}
          {/* --- START: Conditionally render party name --- */}
          {partyName && (
            <div className="mb-4 w-full text-center">
              <p className="text-sm text-muted-foreground">Joining:</p>
              <h1 className="text-outline scroll-m-20 truncate text-2xl font-extrabold tracking-tight uppercase">
                {partyName}
              </h1>
            </div>
          )}
          {/* --- END: Conditionally render party name --- */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex w-full flex-col space-y-4 text-left"
            >
              {/* --- START: Conditional Party Code Field --- */}
              {!partyHash && (
                <FormField
                  control={form.control}
                  name="partyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Code</FormLabel>
                      {/* <-- Updated Label */}
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
              {/* --- END: Conditional Party Code Field --- */}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name - Case Sensitive</FormLabel>
                    {/* <-- Updated Label */}
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
        </div>
      </div>
    </main>
  );
}
