/* eslint-disable */
"use client";

import { useLocalStorage, useViewportSize } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "~/trpc/react";
import { Button } from "./ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/ui/card";
import { Input } from "./ui/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/ui/form";
import { toast } from "sonner";
import { Loader2, PartyPopper } from "lucide-react";

const formSchema = z.object({
  partyName: z
    .string()
    .min(2, {
      message: "Party name must be at least 2 characters.",
    })
    .max(30, {
      message: "Party name must be 30 characters or less.",
    })
    .regex(/^[A-Z0-9 -]*$/, {
      message: "Only uppercase letters, numbers, spaces, and dashes allowed.",
    })
    .refine((s) => s.trim() === s, {
      message: "Party name cannot start or end with a space.",
    }),
  yourName: z.string().min(2, {
    message: "Your name must be at least 2 characters.",
  }),
  adminPassword: z.string().min(1, {
    message: "Admin password is required to create a party.",
  }),
});

export function CreateParty() {
  const router = useRouter();
  const [name, setName] = useLocalStorage({ key: "name", defaultValue: "" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyName: "",
      yourName: name,
      adminPassword: "",
    },
  });

  const createParty = api.party.create.useMutation({
    onSuccess: (data) => {
      if (data.hash) {
        setName(form.getValues("yourName"));
        
        if (typeof window !== "undefined") {
            window.localStorage.setItem("karaoke-player-active-tab", JSON.stringify("settings"));
        }

        toast.success(`Party "${data.name}" created!`);
        
        const targetUrl = `/host/${data.hash}`;
        router.push(targetUrl);
      }
    },
    onError: (error) => {
      toast.error("Failed to create party", {
        description: error.message,
      });
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.adminPassword }),
      });

      if (!res.ok) {
        form.setError("adminPassword", { 
          type: "manual", 
          message: "Invalid Admin Password" 
        });
        return;
      }

      createParty.mutate({ name: values.partyName, singerName: values.yourName });

    } catch (error) {
      toast.error("Authentication failed");
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create a New Party</CardTitle>
        <CardDescription>
          Give your party a name and enter the admin password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="partyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MY AWESOME KARAOKE PARTY"
                      {...field}
                      onChange={(e) => {
                        const uppercaseValue = e.target.value.toUpperCase();
                        const filteredValue = uppercaseValue.replace(
                          /[^A-Z0-9 -]/g,
                          "",
                        );
                        field.onChange(filteredValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yourName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter admin token..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createParty.isPending || form.formState.isSubmitting}
            >
              {(createParty.isPending || form.formState.isSubmitting) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PartyPopper className="mr-2 h-4 w-4" />
              )}
              Create Party
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
