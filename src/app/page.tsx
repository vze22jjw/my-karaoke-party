import Image from "next/image";
import { CreateParty } from "../components/create-party";
import { JoinParty } from "../components/join-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
        />

        <div className="flex flex-col gap-4 w-full items-center">
          <CreateParty />
          <JoinParty />
        </div>

        <div>
          <Link href="/terms-of-service" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
