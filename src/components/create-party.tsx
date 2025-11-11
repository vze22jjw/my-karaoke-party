/* eslint-disable */
"use client";

import { useLocalStorage } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "~/trpc/react";
import { Button } from "./ui/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/ui/drawer";
import { Input } from "./ui/ui/input";
import { ButtonHoverGradient } from "./ui/ui/button-hover-gradient";
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
import { Loader2 } from "lucide-react";

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
});

export function CreateParty() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useLocalStorage({ key: "name", defaultValue: "" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyName: "",
      yourName: name,
    },
  });

  const createParty = api.party.create.useMutation({
    onSuccess: (data) => {
      if (data.hash) {
        setName(form.getValues("yourName"));
        toast.success(`Party "${data.name}" created!`);
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          router.push(`/host/${data.hash}`);
        }, 300);
      }
    },
    onError: (error) => {
      toast.error("Failed to create party", {
        description: error.message,
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createParty.mutate({ name: values.partyName, singerName: values.yourName });
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <div className="w-full">
          <ButtonHoverGradient type="button" className="w-full">
            Create Party 🎉
          </ButtonHoverGradient>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>Create a New Party</DrawerTitle>
            <DrawerDescription>
              Give your party a name and add your name to the singers list.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createParty.isPending}
                >
                  {createParty.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Let&apos;s Go!
                </Button>
              </form>
            </Form>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
