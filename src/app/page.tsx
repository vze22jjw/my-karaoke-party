import Image from "next/image";
import { JoinParty } from "../components/join-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import Link from "next/link";

export default async function Home() {
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
          className="h-auto w-full max-w-sm flex-shrink-0 sm:max-w-[666px]"
        />

        {/* Remaining elements centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex w-full max-w-xs flex-col gap-4">
            <JoinParty />

            {/* --- START: Added Link to new page --- */}
            <Link
              href="/start-party"
              className="text-center text-lg text-primary-foreground/80 hover:text-primary-foreground hover:underline"
            >
              or Start a New Party
            </Link>
            {/* --- END: Added Link --- */}
          </div>

          <div className="mt-8">
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
