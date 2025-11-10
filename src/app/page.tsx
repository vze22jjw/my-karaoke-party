import Image from "next/image";
import { JoinParty } from "../components/join-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import Link from "next/link";
// --- THIS IS THE FIX (Part 1) ---
// Import the environment variables
import { env } from "~/env";
// --- END THE FIX ---

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

            <Link
              href="/start-party"
              className="text-center text-lg text-primary-foreground/80 hover:text-primary-foreground hover:underline"
            >
              or Start a New Party
            </Link>
          </div>

          <div className="mt-8">
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      {/* --- THIS IS THE FIX (Part 2) --- */}
      {/* Add the app version footer */}
      <footer className="fixed bottom-4 right-4 z-50">
        <span className="text-xs text-white/50">
          v{env.NEXT_PUBLIC_MKP_APP_VER}
        </span>
      </footer>
      {/* --- END THE FIX --- */}
    </main>
  );
}
