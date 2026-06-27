"use client";

import { useLocalStorage } from "@mantine/hooks";
import { useRouter } from "~/navigation";
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
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

const HOST_AVATAR_MAP: Record<string, string> = {
  "👑": "crown",
  "🧠": "brain",
  "🧑‍🚀": "astronaut",
  "🎩": "tophat",
  "🍾": "cork-bottle",
};
const HOST_AVATARS = Object.keys(HOST_AVATAR_MAP);

const AvatarPicker = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3">
    {options.map((avatar) => (
      <button
        key={avatar}
        type="button"
        onClick={() => onChange(avatar)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none select-none transition-all",
          value === avatar
            ? "bg-primary ring-2 ring-primary-foreground"
            : "sm:hover:bg-muted-foreground/20",
        )}
        data-testid={`avatar-select-${HOST_AVATAR_MAP[avatar] ?? 'unknown'}`}
      >
        {avatar}
      </button>
    ))}
  </div>
);

// Note: Zod schema messages are hardcoded here for simplicity, 
// but you can use z.errorMap or pass t function if needed for validation errors.
const formSchema = z.object({
  partyName: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9 -]*$/)
    .refine((s) => s.trim() === s),
  yourName: z.string().min(2),
  adminPassword: z.string().min(1),
});

export function CreateParty() {
  const router = useRouter();
  const t = useTranslations('create');
  const tJoin = useTranslations('join');
  const [name, setName] = useLocalStorage({ key: "name", defaultValue: "" });
  const [, setAvatar] = useLocalStorage({ key: "avatar", defaultValue: "👑" });

  const [yourAvatar, setYourAvatar] = useState("👑");
  const [hostAvatarOptions, setHostAvatarOptions] = useState(HOST_AVATARS);

  useEffect(() => {
    const shuffled = [...HOST_AVATARS].sort(() => Math.random() - 0.5);
    setHostAvatarOptions(shuffled);

    const stored = window.localStorage.getItem("avatar");
    if (!stored || stored === '""' || stored === 'null') {
      const randomHostAvatar = HOST_AVATARS[Math.floor(Math.random() * HOST_AVATARS.length)]!;
      setYourAvatar(randomHostAvatar);
    } else {
      let parsed = stored;
      try {
        const val: unknown = JSON.parse(stored);
        if (typeof val === "string") {
          parsed = val;
        }
      } catch (e) {}
      if (HOST_AVATARS.includes(parsed)) {
        setYourAvatar(parsed);
      } else {
        const randomHostAvatar = HOST_AVATARS[Math.floor(Math.random() * HOST_AVATARS.length)]!;
        setYourAvatar(randomHostAvatar);
      }
    }
  }, []);

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
        setAvatar(yourAvatar);
        
        if (typeof window !== "undefined") {
            window.localStorage.setItem("karaoke-player-active-tab", JSON.stringify("settings"));
        }

        toast.success(t('toastSuccess', { name: data.name }));
        
        const targetUrl = `/host/${data.hash}`;
        router.push(targetUrl);
      }
    },
    onError: (error) => {
      toast.error(t('toastError'), {
        description: error.message,
      });
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.adminPassword }),
      });

      if (!res.ok) {
        form.setError("adminPassword", { 
          type: "manual", 
          message: t('invalidPassword') 
        });
        return;
      }

      createParty.mutate({ name: values.partyName, singerName: values.yourName, avatar: yourAvatar });

    } catch (error) {
      toast.error(t('authFailed'));
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
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
                  <FormLabel>{t('partyName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholderName')}
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
                  <FormLabel>{t('yourName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholderUser')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>{tJoin('chooseIcon')}</FormLabel>
              <FormControl>
                <AvatarPicker 
                  value={yourAvatar} 
                  onChange={setYourAvatar} 
                  options={hostAvatarOptions} 
                />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('adminPassword')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder={t('placeholderPass')} 
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
              {form.formState.isSubmitting ? t('creating') : t('createButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
