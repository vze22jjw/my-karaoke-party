"use client";

import Image from "next/image";
import Link from "next/link";
import { CreateParty } from "~/components/create-party";
import logo from "~/assets/my-karaoke-party-logo.png";
import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { PartyPopper } from "lucide-react";
import { OpenPlayersButton } from "~/components/open-players-drawer";

function FlowSelector({ onSelect }: { onSelect: (flow: "create") => void }) {
    return (
        <div className="flex w-full max-w-xs flex-col gap-4 mx-auto">
            <Button
                type="button"
                variant="default"
                className="w-full h-14 text-xl font-bold shadow-sm"
                onClick={() => onSelect("create")}
            >
                Start New Party
                <PartyPopper className="ml-3 h-6 w-6" />
            </Button>
            <OpenPlayersButton />
            
            <Link
                href="/"
                className="text-center text-sm text-white/80 hover:text-white hover:underline pt-4"
            >
                &larr; Back to Home
            </Link>
        </div>
    );
}


export default function StartPartyPage() {
    const [selectedFlow, setSelectedFlow] = useState<"selector" | "create">("selector");

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

                <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
                    <div className="w-full">
                        {selectedFlow === "selector" && (
                            <FlowSelector onSelect={setSelectedFlow} />
                        )}

                        {selectedFlow === "create" && (
                            <div className="space-y-4">
                                <Button variant="ghost" onClick={() => setSelectedFlow("selector")} className="mb-4">
                                    &larr; Back to Options
                                </Button>
                                <CreateParty />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
