import Image from "next/image";
import Link from "next/link";
import { CreateParty } from "~/components/create-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import { ChevronLeft } from "lucide-react";

export default async function StartPartyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* --- Back Button Removed --- */}
      <div className="container flex flex-1 flex-col items-center gap-8 px-4 py-8">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-[666px] flex-shrink-0"
        />

        {/* Remaining elements centered vertically */}
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6">
          {/* --- H1 Title Removed --- */}
          <div className="w-full">
            <CreateParty />
          </div>
        </div>
      </div>
    </main>
  );
}
