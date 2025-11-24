"use client";

import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/ui/drawer";
import { Button } from "~/components/ui/ui/button";
import { Music, Users, Tv } from "lucide-react";
import { Skeleton } from "~/components/ui/ui/skeleton";
import { Input } from "./ui/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/ui/form";
import { api } from "~/trpc/react";

type Party = {
  hash: string;
  name: string;
  createdAt: string;
  songCount: number;
  singerCount: number;
};

const hashSchema = z.object({
    hash: z.string().min(4, "Hash must be 4 characters or more").max(10),
});

function ConnectToPlayerForm({ parties }: { parties: Party[] | null }) {
    const router = useRouter();
    const [statusError, setStatusError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof hashSchema>>({
        resolver: zodResolver(hashSchema),
        defaultValues: { hash: "" }, 
    });

    const partyQuery = api.party.getByHash.useQuery(
        { hash: form.watch("hash") },
        { enabled: false, retry: false, refetchOnWindowFocus: false }
    );

    async function onSubmit(_values: z.infer<typeof hashSchema>) {
        setStatusError(null);
        try {
            const result = await partyQuery.refetch();
            const party = result.data;

            if (!party || party.status === 'CLOSED') {
                setStatusError("Party not found or has ended.");
                router.push("/404");
                return;
            }
            router.push(`/player/${party.hash}`);

        } catch (e) {
            setStatusError("An unexpected error occurred.");
            router.push("/404");
            return;
        }
    }

    return (
        <div className="space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="hash"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Enter Party Hash</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., ABC123"
                                        className="w-full text-center font-mono uppercase"
                                        maxLength={10}
                                        {...field}
                                        onChange={(e) => {
                                            const rawValue = e.target.value.toUpperCase();
                                            const filteredValue = rawValue.replace(/[^A-Z0-9]/g, "");
                                            field.onChange(filteredValue);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {statusError && (
                        <div className="text-sm text-red-500 text-center">{statusError}</div>
                    )}
                    <Button
                        type="submit"
                        className="w-full h-12 text-lg font-bold"
                        disabled={form.formState.isSubmitting || partyQuery.isFetching}
                    >
                        {form.formState.isSubmitting || partyQuery.isFetching ? "Connecting..." : "Connect to Player"}
                    </Button>
                </form>
            </Form>

            {parties && parties.length > 0 && (
                <div className="max-h-[300px] space-y-3 overflow-y-auto pt-4 border-t">
                    <h3 className="font-semibold text-sm text-muted-foreground">Open Party Names:</h3>
                    {parties.map((party) => (
                        <div
                            key={party.hash}
                            className="flex items-center rounded-lg border bg-card p-4"
                        >
                            <div className="space-y-1 pr-4 flex-1">
                                <h3 className="font-semibold uppercase">
                                    {party.name} 
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Music className="h-4 w-4" />
                                        {party.songCount} songs
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {party.singerCount} singers
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function OpenPlayersDrawerComponent() {
    const [isOpen, setIsOpen] = useState(false);
    const [parties, setParties] = useState<Party[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOpenParties = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/parties/list");
            if (!response.ok) throw new Error("Failed to fetch parties list");
            const data = await response.json() as Party[];
            setParties(data);
        } catch (e) {
            setError("Error loading parties. Please try again.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (open) {
                    void fetchOpenParties();
                }
            }}
            shouldScaleBackground={false}
        >
            <DrawerTrigger asChild>
                <Button 
                    type="button" 
                    variant="secondary"
                    className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                >
                    Connect to Player
                    <Tv className="ml-3 h-6 w-6 text-cyan-400" />
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-2xl">
                    <DrawerHeader>
                        <DrawerTitle>Open Players</DrawerTitle>
                        <DrawerDescription>Enter the Party Hash.</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 pb-0">
                        {loading && (
                            <div className="space-y-3">
                                <Skeleton className="h-48 w-full" />
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-center text-red-500">
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                             <ConnectToPlayerForm parties={parties} />
                        )}
                       
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

export function OpenPlayersButton() {
    return (
        <Suspense fallback={
            <Button 
                type="button" 
                variant="secondary"
                className="w-full h-14 text-xl font-bold shadow-sm border border-primary/20"
                disabled
            >
                Connect to Player
                <Tv className="ml-3 h-6 w-6 text-cyan-400" />
            </Button>
        }>
            <OpenPlayersDrawerComponent />
        </Suspense>
    );
}
