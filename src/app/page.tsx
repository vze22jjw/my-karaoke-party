import Image from "next/image";
import { CreateParty } from "../components/create-party";
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
          className="h-auto w-full max-w-[666px] flex-shrink-0"
        />

        {/* Remaining elements centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex flex-col gap-2">
            <CreateParty />
            <JoinParty />
          </div>

          <div>
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
