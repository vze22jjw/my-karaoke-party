import Link from "next/link";
import Image from "next/image";
import logo from "~/assets/my-karaoke-party-logo.png";
import { Button } from "~/components/ui/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center text-white bg-gradient">
      <div className="container flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
        <Image
          src={logo}
          width={666}
          height={375}
          alt="My Karaoke Party logo"
          priority={true}
          placeholder="blur"
          className="h-auto w-full max-w-sm flex-shrink-0 sm:max-w-[666px]"
        />
        <h1 className="text-outline scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          404 - Page Not Found
        </h1>
        <p className="text-xl text-white/80">
          Oops! The party you&apos;re looking for doesn&apos;t exist or has
          ended.
        </p>
        <div className="w-full max-w-[12rem]">
          <Link href="/" passHref>
            <Button 
                type="button" 
                variant="secondary"
                className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
            >
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
