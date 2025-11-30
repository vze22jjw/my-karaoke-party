import { cookies } from "next/headers";
import { AdminLogin } from "~/components/admin-login";
import { api } from "~/trpc/server";
import { Link } from "~/navigation";
import { Button } from "~/components/ui/ui/button";
import { ArrowLeft, Plus, Clock, Music, Users, Activity, Lock } from "lucide-react";
import { cn } from "~/lib/utils";
import { getTranslations } from "next-intl/server";
import { FitText } from "~/components/fit-text";

export const metadata = {
  title: "Host Dashboard - My Karaoke Party",
};

export default async function HostDashboardPage({
  params: { locale }
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'host' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin_token_verified")?.value === "true";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const parties = await api.party.getAll();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border bg-card/90 p-6 backdrop-blur-sm shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('dashboardTitle')}</h1>
                <p className="text-muted-foreground">{t('dashboardDesc')}</p>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tCommon('backToHome')}
                    </Link>
                </Button>
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                    <Link href="/start-party">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('newParty')}
                    </Link>
                </Button>
            </div>
        </div>

        <div className="grid gap-4">
            {parties.length === 0 ? (
                <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
                    <p className="text-lg">{t('noParties')}</p>
                    <p>{t('startFirst')}</p>
                </div>
            ) : (
                parties.map((party) => {
                    const isClosed = party.status === "CLOSED";
                    const isStarted = party.status === "STARTED";
                    
                    const createdDate = new Date(party.createdAt).toLocaleDateString(locale);
                    const createdTime = new Date(party.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                    const closedDate = new Date(party.lastActivityAt).toLocaleDateString(locale);

                    return (
                        <div 
                            key={party.id} 
                            className={cn(
                                "group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-all hover:shadow-md",
                                isClosed && "opacity-75 bg-muted/30"
                            )}
                        >
                            <div className="flex-1 min-w-0 w-full space-y-3">
                                
                                <div className="flex items-center gap-3 w-full overflow-hidden h-8">
                                    <span className={cn(
                                        "flex-shrink-0 flex h-3 w-3 rounded-full",
                                        isClosed ? "bg-gray-400" : isStarted ? "bg-blue-500 animate-pulse" : "bg-green-500"
                                    )} />
                                    
                                    <div className="flex-1 min-w-0 h-full flex items-center">
                                       <FitText className="font-bold text-foreground uppercase leading-none">
                                          {party.name}
                                       </FitText>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded border border-border/50 text-foreground/80">
                                        {party.hash}
                                    </span>

                                    <div className="flex items-center gap-1.5" title="Creation Date">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="text-xs sm:text-sm truncate">
                                            {t('card.createdAt', { date: createdDate, time: createdTime })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-1">
                                    <div className="flex items-center gap-1.5" title="Total Songs">
                                        <Music className="h-4 w-4 text-primary/70" />
                                        <span className="font-medium text-foreground/80">{party._count.playlistItems}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5" title="Total Singers">
                                        <Users className="h-4 w-4 text-primary/70" />
                                        <span className="font-medium text-foreground/80">{party._count.participants}</span>
                                    </div>

                                    {isClosed && (
                                        <div className="flex items-center gap-1.5 text-orange-500/80 ml-auto sm:ml-0" title="Closed Date">
                                            <Lock className="h-3 w-3" />
                                            <span className="text-xs">{t('card.closedAt', { date: closedDate })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 mt-1 sm:mt-0">
                                <Button 
                                    variant={isClosed ? "outline" : "default"} 
                                    className={cn(
                                        "w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-semibold shadow-sm",
                                        !isClosed && "bg-primary hover:bg-primary/90"
                                    )}
                                    asChild
                                >
                                    <Link href={`/host/${party.hash}`}>
                                        {isClosed ? (
                                            <>{t('card.history')}</>
                                        ) : (
                                            <>
                                                <Activity className="mr-2 h-4 w-4" />
                                                {t('card.manage')}
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
