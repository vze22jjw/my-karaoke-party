"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, ThumbsUp, Flower2, Heart,
  type LucideIcon 
} from "lucide-react";
import { formatCompactNumber } from "~/utils/number";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";

type GlobalStatsData = {
    topSingersBySongs: { name: string; count: number }[];
    topSingersByApplause: { name: string; applauseCount: number }[];
    topSongsByApplause: { title: string; applause: number; singer: string }[];
    globalStats: {
        totalSongs: number;
        totalApplause: number;
        bestDressed: { avatar: string | null; count: number } | null;
        oneHitWonder: { name: string; applauseCount: number } | null;
        marathonRunner: { name: string; totalDurationMs: number } | null;
    };
};

type Props = {
    stats?: GlobalStatsData;
};

interface ListItem {
    rank?: number;
    label: string;
    value: string;
    subValue?: string | null;
}

interface GridItem {
    label: string;
    value: string;
    sub?: string | null;
    icon: string | LucideIcon; 
}

interface BaseCard {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
}

interface ListCard extends BaseCard {
    type: 'list';
    data: ListItem[];
    items?: never; 
}

interface GridCard extends BaseCard {
    type: 'grid';
    items: GridItem[];
    data?: never; 
}

type CarouselCard = ListCard | GridCard;

const CARD_DURATION = 10000; 

export function FunStatsCarousel({ stats }: Props) {
    const t = useTranslations('guest.funStats');
    
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartRef = useRef<number | null>(null);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

    const topSingersBySongs = stats?.topSingersBySongs ?? [];
    const topSingersByApplause = stats?.topSingersByApplause ?? [];
    const topSongsByApplause = stats?.topSongsByApplause ?? [];
    
    const globalStats = stats?.globalStats ?? { 
        totalSongs: 0, 
        totalApplause: 0, 
        bestDressed: null, 
        oneHitWonder: null,
        marathonRunner: null
    };

    const rawGridItems: (GridItem | null)[] = [
        {
            label: t('loyalFans'),
            value: `${formatCompactNumber(globalStats.totalApplause)} 👏`,
            sub: t('totalClaps'),
            icon: "👏"
        },
        globalStats.marathonRunner ? {
            label: t('marathon'),
            value: `${Math.floor(globalStats.marathonRunner.totalDurationMs / 60000)}m`,
            sub: globalStats.marathonRunner.name,
            icon: "🏃"
        } : null,
        globalStats.oneHitWonder ? {
            label: t('oneHitWonder'),
            value: `${formatCompactNumber(globalStats.oneHitWonder.applauseCount)} 👏`,
            sub: globalStats.oneHitWonder.name,
            icon: "🎯"
        } : null,
        {
            label: t('totalPlayed'),
            value: formatCompactNumber(globalStats.totalSongs),
            sub: t('songsCount', { count: globalStats.totalSongs }).replace(/\d+\s/, ''), 
            icon: "🎵"
        },
        globalStats.bestDressed ? {
            label: t('bestDressed'),
            value: `${formatCompactNumber(globalStats.bestDressed.count)}x`,
            sub: globalStats.bestDressed.avatar,
            icon: "👔"
        } : null,
    ];

    const gridItems: GridItem[] = rawGridItems.filter((item): item is GridItem => item !== null);

    const cards: CarouselCard[] = [
        {
            id: "eager",
            title: t('mostEager'),
            icon: Trophy,
            color: "text-yellow-500",
            type: "list",
            data: topSingersBySongs.map((p, i) => ({
                rank: i + 1,
                label: p.name,
                value: t('songsCount', { count: p.count }),
                subValue: null
            }))
        },
        {
            id: "encore",
            title: t('encore'),
            icon: ThumbsUp,
            color: "text-blue-400",
            type: "list",
            data: topSongsByApplause.map((s, i) => ({
                rank: i + 1,
                label: s.title,
                value: `${formatCompactNumber(s.applause)} 👏`,
                subValue: s.singer 
            }))
        },
        {
            id: "divas",
            title: t('divas'),
            icon: Flower2,
            color: "text-pink-500",
            type: "list",
            data: topSingersByApplause.map((p, i) => ({
                rank: i + 1,
                label: p.name,
                value: `${formatCompactNumber(p.applauseCount)} 👏`,
                subValue: null
            }))
        },
        {
            id: "stats",
            title: t('partyStats'),
            icon: Heart,
            color: "text-red-500",
            type: "grid",
            items: gridItems
        }
    ];

    const activeStats = cards.filter((s) => 
        (s.type === 'list' && s.data.length > 0) || 
        (s.type === 'grid' && s.items.length > 0)
    );

    const nextSlide = useCallback(() => {
        if (activeStats.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % activeStats.length);
    }, [activeStats.length]);

    const prevSlide = useCallback(() => {
        if (activeStats.length === 0) return;
        setActiveIndex((prev) => (prev - 1 + activeStats.length) % activeStats.length);
    }, [activeStats.length]);

    useEffect(() => {
        if (activeStats.length <= 1) return;
        const resetTimer = () => {
            if (autoRotateRef.current) clearInterval(autoRotateRef.current);
            autoRotateRef.current = setInterval(nextSlide, CARD_DURATION);
        };
        resetTimer();
        return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
    }, [nextSlide, activeStats.length]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches[0]) touchStartRef.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartRef.current === null || !e.changedTouches[0]) return;
        const diff = touchStartRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide(); else prevSlide();
        }
        touchStartRef.current = null;
    };

    if (!stats) {
        return (
            <div className="bg-card rounded-lg p-3 border text-center text-muted-foreground h-[300px] flex items-center justify-center">
                {t('waitingData')}
            </div>
        );
    }

    if (activeStats.length === 0) {
        return (
            <div className="bg-card rounded-lg p-3 border text-center text-muted-foreground h-[300px] flex items-center justify-center">
                {t('waitingData')}
            </div>
        );
    }

    const currentCard = activeStats[activeIndex];
    if (!currentCard) return null;
    
    const Icon = currentCard.icon;

    return (
        <div 
            className="w-full touch-pan-y select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="bg-card rounded-lg p-3 border h-[300px] flex flex-col relative overflow-hidden transition-all duration-300">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Icon className={cn("h-5 w-5", currentCard.color)} />
                    <h2 className="text-lg font-semibold">{currentCard.title}</h2>
                </div>

                <div className="flex-1 overflow-y-hidden">
                    {currentCard.type === "list" ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-300 key={activeIndex}">
                            {currentCard.data.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-white/5 h-[42px]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                                            item.rank === 1 ? "bg-yellow-500 text-black" : 
                                            item.rank === 2 ? "bg-slate-300 text-black" : 
                                            item.rank === 3 ? "bg-orange-700 text-white" : 
                                            "bg-muted text-muted-foreground"
                                        )}>
                                            {item.rank}
                                        </div>
                                        <div className="min-w-0 flex flex-col justify-center">
                                            <p className="font-medium truncate text-sm leading-tight">{item.label}</p>
                                            {item.subValue && <p className="text-[10px] text-muted-foreground truncate leading-tight">{item.subValue}</p>}
                                        </div>
                                    </div>
                                    <span className={cn("font-bold font-mono text-xs whitespace-nowrap ml-2", currentCard.color)}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300 key={activeIndex}">
                            {currentCard.items.map((stat, idx) => (
                                <div key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-2 rounded-lg bg-muted/20 border border-white/5 h-[42px]">
                                    <span className="text-lg flex-shrink-0 w-6 text-center">
                                        {typeof stat.icon === 'string' ? stat.icon : <stat.icon className={cn("h-4 w-4", currentCard.color)} />}
                                    </span>
                                    
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-0.5">{stat.label}</p>
                                        <div className="flex items-center gap-1 min-w-0">
                                            <p className="text-sm font-semibold leading-tight">
                                                {stat.sub} 
                                            </p>
                                            {stat.label === t('bestDressed') && <span className="text-base leading-none">{stat.sub}</span>}
                                        </div>
                                    </div>
                                    
                                    <span className="text-sm font-mono font-bold text-primary whitespace-nowrap ml-2">
                                        {stat.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-center gap-3 mt-3 shrink-0 h-5 items-center">
                {activeStats.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300 p-2 focus:outline-none", 
                            activeIndex === idx 
                                ? "bg-primary w-6" 
                                : "bg-black/40 hover:bg-black/60 w-2"
                        )}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
