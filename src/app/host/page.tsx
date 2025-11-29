import { cookies } from "next/headers";
import { AdminLogin } from "~/components/admin-login";
import { api } from "~/trpc/server";
import Link from "next/link";
import { Button } from "~/components/ui/ui/button";
import { ArrowLeft, Plus, Clock, Music, Users, Activity, Lock, ExternalLink } from "lucide-react";
import { cn } from "~/lib/utils";

export const metadata = {
  title: "Host Dashboard - My Karaoke Party",
};

export default async function HostDashboardPage() {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin_token_verified")?.value === "true";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Fetch all parties securely
  const parties = await api.party.getAll();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border bg-card/90 p-6 backdrop-blur-sm shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Host Dashboard</h1>
                <p className="text-muted-foreground">Manage all your karaoke parties in one place.</p>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Home
                    </Link>
                </Button>
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                    <Link href="/start-party">
                        <Plus className="mr-2 h-4 w-4" />
                        New Party
                    </Link>
                </Button>
            </div>
        </div>

        <div className="grid gap-4">
            {parties.length === 0 ? (
                <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
                    <p className="text-lg">No parties found.</p>
                    <p>Start your first party to see it here!</p>
                </div>
            ) : (
                parties.map((party) => {
                    const isClosed = party.status === "CLOSED";
                    const isStarted = party.status === "STARTED";
                    
                    return (
                        <div 
                            key={party.id} 
                            className={cn(
                                "group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-all hover:shadow-md",
                                isClosed && "opacity-75 bg-muted/30"
                            )}
                        >
                            <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "flex h-2.5 w-2.5 rounded-full",
                                        isClosed ? "bg-gray-400" : isStarted ? "bg-blue-500 animate-pulse" : "bg-green-500"
                                    )} />
                                    <h2 className="text-xl font-bold truncate leading-none">{party.name}</h2>
                                    <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        {party.hash}
                                    </span>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5" title="Creation Date">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {new Date(party.createdAt).toLocaleDateString()} 
                                            <span className="opacity-50 mx-1">at</span> 
                                            {new Date(party.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5" title="Total Songs">
                                        <Music className="h-4 w-4" />
                                        <span>{party._count.playlistItems} songs</span>
                                    </div>

                                    <div className="flex items-center gap-1.5" title="Total Singers">
                                        <Users className="h-4 w-4" />
                                        <span>{party._count.participants} singers</span>
                                    </div>

                                    {isClosed && (
                                        <div className="flex items-center gap-1.5 text-orange-500/80" title="Closed Date">
                                            <Lock className="h-3 w-3" />
                                            <span>Closed {new Date(party.lastActivityAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 mt-2 sm:mt-0">
                                <Button 
                                    variant={isClosed ? "outline" : "default"} 
                                    className={cn(
                                        "w-full sm:w-auto",
                                        !isClosed && "bg-primary hover:bg-primary/90"
                                    )}
                                    asChild
                                >
                                    <Link href={`/host/${party.hash}`}>
                                        {isClosed ? (
                                            <>View History</>
                                        ) : (
                                            <>
                                                <Activity className="mr-2 h-4 w-4" />
                                                Manage Party
                                            </>
                                        )}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

      </div>
    </main>
  );
}
