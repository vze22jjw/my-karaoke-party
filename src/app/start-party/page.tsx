import Image from "next/image";
import Link from "next/link";
import { CreateParty } from "~/components/create-party";
import logo from "~/assets/my-karaoke-party-logo.png";

export default async function StartPartyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="container flex flex-1 flex-col items-center gap-8 px-4 py-8">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-[266px] flex-shrink-0"
        />

        {/* Changed max-w-[12rem] to max-w-md to fit the form */}
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
          <div className="w-full">
            <CreateParty />
          </div>
          
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white hover:underline transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
