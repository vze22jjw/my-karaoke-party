/* eslint-disable */
"use client";

import Image from "next/image";
import { useRouter, Link } from "~/navigation";
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
} from "~/components/ui/ui/form";
import { Input } from "~/components/ui/ui/input";
import { Button } from "~/components/ui/ui/button";
import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "~/lib/utils";
import { FitText } from "~/components/fit-text";
import { useTranslations } from "next-intl";

// AVATAR COMPONENTS ---
const AVATARS = [
  "🎤", "🎧", "🥁", "🧑‍🎤", "👩‍🎤",
  "🔥", "🍺", "😎", "🕺", "💃",
];

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
          "flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-all",
          value === avatar
            ? "bg-primary ring-2 ring-primary-foreground"
            : "sm:hover:bg-muted-foreground/20",
        )}
      >
        {avatar}
      </button>
    ))}
  </div>
);

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
  const t = useTranslations('join');
  
  const [name, setName] = useLocalStorage({
    key: "name",
    defaultValue: "",
  });

  const [avatar, setAvatar] = useLocalStorage({
    key: "avatar",
    defaultValue: AVATARS[0]!,
  });

  const [avatarOptions, setAvatarOptions] = useState(AVATARS);

  useEffect(() => {
    const shuffled = [...AVATARS].sort(() => Math.random() - 0.5);
    setAvatarOptions(shuffled);
  }, []);

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
      <div className="container flex flex-1 flex-col items-center justify-center gap-2 px-4 pt-4 pb-12">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-[133px] flex-shrink-0"
        />
        <div className="flex w-full max-w-xs flex-col items-center px-5 mx-auto">
          {partyName && (
            <div className="mb-4 w-full text-center">
              <p className="text-sm text-white/80">{t('joining')}:</p>
              <FitText className="text-outline scroll-m-20 text-xl font-extrabold tracking-tight uppercase sm:text-2xl">
                {partyName}
              </FitText>
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
                      <FormLabel>{t('partyCode')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('enterCode')}
                          className="input input-bordered w-full"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormItem>
                <FormLabel>{t('chooseIcon')}</FormLabel>
                <FormControl>
                  <AvatarPicker 
                    value={avatar} 
                    onChange={setAvatar} 
                    options={avatarOptions} 
                  />
                </FormControl>
              </FormItem>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('enterName')}
                        className="input input-bordered w-full"
                        autoFocus
                        minLength={3}
                        maxLength={20}
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-white/70">
                      {t('nameTip')}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                variant="secondary"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  t('joining')
                ) : (
                  <>
                    {t('title')}
                    <Mic className="ml-3 h-6 w-6 text-cyan-400" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          {partyHash && (
            <Link
              href="/?openParties=true"
              className="mt-4 text-sm text-white/80 sm:hover:text-white sm:hover:underline"
              replace
            >
              &larr; {t('backToList')}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
