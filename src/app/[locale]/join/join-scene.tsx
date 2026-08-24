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
import { api } from "~/trpc/react";
import emojiMap from "~/config/emoji-map.json";

// AVATAR COMPONENTS ---
const GUEST_AVATAR_MAP: Record<string, string> = {
  [emojiMap.variables.singer_emoji_1]: "mic",
  [emojiMap.variables.singer_emoji_2]: "headphones",
  [emojiMap.variables.singer_emoji_3]: "drum",
  [emojiMap.variables.singer_emoji_4]: "singer-m",
  [emojiMap.variables.singer_emoji_5]: "singer-f",
  [emojiMap.variables.singer_emoji_6]: "fire",
  [emojiMap.variables.singer_emoji_7]: "beer",
  [emojiMap.variables.singer_emoji_8]: "cool",
  [emojiMap.variables.singer_emoji_9]: "dance-m",
  [emojiMap.variables.singer_emoji_10]: "dance-f",
};

const HOST_AVATAR_MAP: Record<string, string> = {
  [emojiMap.variables.host_emoji_1]: "crown",
  [emojiMap.variables.host_emoji_2]: "brain",
  [emojiMap.variables.host_emoji_3]: "astronaut",
  [emojiMap.variables.host_emoji_4]: "tophat",
  [emojiMap.variables.host_emoji_5]: "cork-bottle",
};

const GUEST_AVATARS = Object.keys(GUEST_AVATAR_MAP);
const HOST_AVATARS = Object.keys(HOST_AVATAR_MAP);

const AvatarPicker = ({
  value,
  onChange,
  options,
  avatarMap = GUEST_AVATAR_MAP,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: string[];
  avatarMap?: Record<string, string>;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3">
    {options.map((avatar) => (
      <button
        key={avatar}
        type="button"
        onClick={() => onChange(avatar)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none select-none transition-all duration-200",
          value === avatar
            ? "bg-primary/20 ring-2 ring-primary/60 scale-110 [filter:drop-shadow(0_0_6px_rgba(244,63,94,0.65))]"
            : "sm:hover:bg-muted-foreground/20",
        )}
        data-testid={`avatar-select-${avatarMap[avatar] ?? 'unknown'}`}
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

  const [avatar, setAvatar] = useLocalStorage<string | null>({
    key: "avatar",
    defaultValue: null,
  });

  const [avatarOptions, setAvatarOptions] = useState(GUEST_AVATARS);
  const [showAvatarOverride, setShowAvatarOverride] = useState(false);

  function getRandomHostAvatar() {
    return HOST_AVATARS[Math.floor(Math.random() * HOST_AVATARS.length)]!;
  }

  function getRandomGuestAvatar() {
    return GUEST_AVATARS[Math.floor(Math.random() * GUEST_AVATARS.length)]!;
  }

  function parseStoredAvatar(key: string): string | null {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(key);
    if (!stored || stored === '""' || stored === 'null') return null;
    try {
      const val: unknown = JSON.parse(stored);
      if (typeof val === "string") return val;
    } catch (e) {}
    return null;
  }

  useEffect(() => {
    const guestShuffled = [...GUEST_AVATARS].sort(() => Math.random() - 0.5);
    setAvatarOptions(guestShuffled);

    const guestStored = parseStoredAvatar("avatar");
    if (guestStored && GUEST_AVATARS.includes(guestStored)) {
      setAvatar(guestStored);
    } else {
      setAvatar(getRandomGuestAvatar());
    }
  }, [setAvatar]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyCode: partyHash ?? "",
      name: name,
    },
  });

  const watchedName = form.watch("name") ?? "";
  const watchedPartyCode = form.watch("partyCode") ?? "";
  const currentPartyCode = partyHash || watchedPartyCode;

  const { data: hostName } = api.party.getHostName.useQuery(
    { hash: currentPartyCode },
    { enabled: !!currentPartyCode && currentPartyCode.length >= 4 }
  );

  const isHost = !!hostName && watchedName.trim().toLowerCase() === hostName.trim().toLowerCase();

  useEffect(() => {
    if (isHost) {
      if (!avatar || !HOST_AVATARS.includes(avatar)) {
        const hostStored = parseStoredAvatar("hostAvatar");
        const targetHostAvatar = (hostStored && HOST_AVATARS.includes(hostStored)) ? hostStored : getRandomHostAvatar();
        setAvatar(targetHostAvatar);
        setShowAvatarOverride(false);
      }
    } else if (!avatar || !GUEST_AVATARS.includes(avatar)) {
      const guestStored = parseStoredAvatar("avatar");
      const targetGuestAvatar = (guestStored && GUEST_AVATARS.includes(guestStored)) ? guestStored : getRandomGuestAvatar();
      setAvatar(targetGuestAvatar);
      setShowAvatarOverride(false);
    }
  }, [isHost, avatar, setAvatar]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const finalAvatar = avatar ?? (isHost ? getRandomHostAvatar() : getRandomGuestAvatar());
    if (typeof window !== "undefined") {
      window.localStorage.setItem("name", JSON.stringify(values.name));
      window.localStorage.setItem("avatar", JSON.stringify(finalAvatar));
      if (isHost) {
        window.localStorage.setItem("hostAvatar", JSON.stringify(finalAvatar));
      }
    }
    setName(values.name);
    setAvatar(finalAvatar);

    const codeToJoin = partyHash ?? values.partyCode;
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      router.push(`/party/${codeToJoin}`);
    }, 300);
  }

  useEffect(() => {
    if (partyHash) {
      form.setValue("partyCode", partyHash, { shouldValidate: true });
    } else {
      form.setValue("partyCode", "", { shouldValidate: true });
    }
    if (name) {
      form.setValue("name", name, { shouldValidate: true });
    } else {
      form.setValue("name", "", { shouldValidate: true });
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
                          data-testid="join-party-code-input"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {!isHost || showAvatarOverride ? (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('chooseIcon')}</FormLabel>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => setShowAvatarOverride(false)}
                        className="text-xs text-white/70 hover:text-white underline"
                      >
                        {t('keepIcon')}
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <AvatarPicker
                      value={avatar}
                      onChange={setAvatar}
                      options={isHost ? HOST_AVATARS : avatarOptions}
                      avatarMap={isHost ? HOST_AVATAR_MAP : GUEST_AVATAR_MAP}
                    />
                  </FormControl>
                </FormItem>
              ) : (
                isHost && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-center space-y-2">
                    <p className="text-sm text-white/80">{t('hostIconHidden')}</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl">{avatar}</span>
                      <button
                        type="button"
                        onClick={() => setShowAvatarOverride(true)}
                        className="text-sm text-white/80 hover:text-white underline"
                      >
                        {t('changeIcon')}
                      </button>
                    </div>
                  </div>
                )
              )}

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
                        data-testid="join-name-input"
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
                data-testid="join-submit-button"
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
