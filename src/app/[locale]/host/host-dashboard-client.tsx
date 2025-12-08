"use client";

import { useState, useMemo } from "react";
import { useRouter, Link } from "~/navigation";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { ArrowLeft, Clock, Music, Users, Activity, Lock, Calendar, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FitText } from "~/components/fit-text";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { toast } from "sonner";

type PartyData = {
  id: number;
  hash: string | null;
  name: string;
  status: string;
  createdAt: Date;
  lastActivityAt: Date;
  _count: {
    participants: number;
    playlistItems: number;
  };
};

type Props = {
  parties: PartyData[];
  locale: string;
};

const ITEMS_PER_PAGE = 5;

export function HostDashboardClient({ parties, locale }: Props) {
  const router = useRouter();
  const t = useTranslations('host');
  const tCommon = useTranslations('common');
  
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState("active");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const deleteMutation = api.party.delete.useMutation({
    onSuccess: () => {
      toast.success(tCommon('success'));
      router.refresh();
      void utils.party.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(`${tCommon('error')}: ${err.message}`);
    }
  });

  const handleDelete = (hash: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        deleteMutation.mutate({ hash });
    }
  };

  const { activeParties, historyParties } = useMemo(() => {
    const active = [];
    const history = [];
    
    for (const party of parties) {
      if (party.status === "CLOSED") {
        history.push(party);
      } else {
        active.push(party);
      }
    }
    return { activeParties: active, historyParties: history };
  }, [parties]);

  const filteredHistory = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return historyParties;
    
    return historyParties.filter(party => {
      const partyDate = new Date(party.createdAt).toISOString().split('T')[0] ?? "";
      
      if (dateRange.start && partyDate < dateRange.start) return false;
      
      if (dateRange.end && partyDate > dateRange.end) return false;
      
      return true;
    });
  }, [historyParties, dateRange]);

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  const PartyCard = ({ party, isHistory }: { party: PartyData, isHistory?: boolean }) => {
    const isStarted = party.status === "STARTED";
    const createdDate = new Date(party.createdAt).toLocaleDateString(locale);
    const createdTime = new Date(party.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const closedDate = new Date(party.lastActivityAt).toLocaleDateString(locale);

    return (
      <div 
        className={cn(
            "group relative flex flex-col items-start gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md",
            isHistory && "opacity-80 hover:opacity-100 bg-muted/20"
        )}
      >
        <div className="w-full space-y-2">
            <div className="flex items-center gap-3 w-full overflow-hidden h-7">
                <span className={cn(
                    "flex-shrink-0 flex h-2.5 w-2.5 rounded-full",
                    isHistory ? "bg-gray-400" : isStarted ? "bg-blue-500 animate-pulse" : "bg-green-500"
                )} />
                
                <div className="flex-1 min-w-0 h-full flex items-center">
                   <FitText className="font-bold text-foreground uppercase leading-none text-lg">
                      {party.name}
                   </FitText>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    {party.hash}
                </span>

                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{t('card.createdAt', { date: createdDate, time: createdTime })}</span>
                </div>
                
                {isHistory && (
                    <div className="flex items-center gap-1 text-orange-500/80">
                        <Lock className="h-3 w-3" />
                        <span>{t('card.closedAt', { date: closedDate })}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 text-sm pt-1">
                <div className="flex items-center gap-1.5" title="Total Songs">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="font-medium">{party._count.playlistItems}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Total Singers">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{party._count.participants}</span>
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        title="Delete Party"
                        onClick={(e) => {
                            e.preventDefault();
                            if (party.hash) handleDelete(party.hash, party.name);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button 
                        variant={isHistory ? "outline" : "default"} 
                        size="sm"
                        className={cn(
                            "h-8 px-4",
                            !isHistory && "bg-primary hover:bg-primary/90"
                        )}
                        asChild
                    >
                        <Link href={`/host/${party.hash}`}>
                            {isHistory ? t('card.history') : t('card.manage')}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-6 pb-24">
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card/90 p-4 backdrop-blur-sm shadow-sm">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pl-2">
                {t('dashboardTitle')}
            </h1>
            <Button 
                variant="secondary" 
                onClick={() => router.back()}
                className="flex-shrink-0"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon('back')}
            </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="active" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>{t('tabsActive')} ({activeParties.length})</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>{t('tabsHistory')} ({historyParties.length})</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
                {activeParties.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center text-muted-foreground">
                        <p>{t('noActiveParties')}</p>
                    </div>
                ) : (
                    activeParties.map(party => (
                        <PartyCard key={party.id} party={party} />
                    ))
                )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 bg-card p-2 rounded-lg border">
                    <div className="flex items-center pl-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                        <Input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9 min-w-[130px]"
                            placeholder="Start Date"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9 min-w-[130px]"
                            placeholder="End Date"
                        />
                    </div>
                    {(dateRange.start || dateRange.end) && (
                        <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-8 w-8 hover:bg-muted shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    {paginatedHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {historyParties.length === 0 ? t('noHistory') : t('noResultsDate')}
                        </div>
                    ) : (
                        paginatedHistory.map(party => (
                            <PartyCard key={party.id} party={party} isHistory />
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                            {t('page')} {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}
