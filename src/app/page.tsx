import Image from "next/image";
import { CreateParty } from "../components/create-party";
import logo from "~/assets/my-karaoke-party-logo.png";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
        />

        <CreateParty />
      </div>
    </main>
  );
}
