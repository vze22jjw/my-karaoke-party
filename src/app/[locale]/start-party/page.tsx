import Image from "next/image";
import { Link } from "~/navigation";
import { CreateParty } from "~/components/create-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import { Button } from "~/components/ui/ui/button";
import { PartyPopper } from "lucide-react";
import { OpenPlayersButton } from "~/components/open-players-drawer";
import { ConnectToHostButton } from "~/components/connect-to-host-drawer";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { useState } from "react";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'startParty' });
  return {
    title: t('pageTitle')
  };
}

import StartPartyContent from "./start-party-content";

export default function StartPartyPage() {
  return <StartPartyContent />;
}
