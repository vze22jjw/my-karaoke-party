"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, ThumbsUp, Flower2, Heart,
  type LucideIcon 
} from "lucide-react";
import { formatCompactNumber } from "~/utils/number";
import { parseISO8601Duration } from "~/utils/string";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import type { VideoInPlaylist } from "~/types/app-types";

type Participant = {
    name: string;
    applauseCount: number;
    avatar: string | null;
    joinedAt: Date;
};

type Props = {
    playlist: VideoInPlaylist[];
    participants: Participant[];
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

export function FunStatsCarousel({ playlist, participants }: Props) {
    const t = useTranslations('guest.funStats');
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartRef = useRef<number | null>(null);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

    const singerSongCounts = new Map<string, number>();
    playlist.forEach(item => {
        singerSongCounts.set(item.singerName, (singerSongCounts.get(item.singerName) ?? 0) + 1);
    });
    
    const mostEager = participants
        .map(p => ({ ...p, songs: singerSongCounts.get(p.name) ?? 0 }))
        .sort((a, b) => b.songs - a.songs)
        .slice(0, 5)
        .filter(p => p.songs > 0);

    const topSongs = [...playlist]
        .sort((a, b) => b.applauseCount - a.applauseCount)
        .slice(0, 5)
        .filter(s => s.applauseCount > 0);

    const topDivas = participants
        .sort((a, b) => b.applauseCount - a.applauseCount)
        .slice(0, 5)
        .filter(p => p.applauseCount > 0);

    const totalApplause = participants.reduce((acc, p) => acc + p.applauseCount, 0);
    
    const durationMap = new Map<string, number>();
    playlist.forEach(item => {
        if (item.playedAt) {
            const ms = parseISO8601Duration(item.duration) ?? 0;
            durationMap.set(item.singerName, (durationMap.get(item.singerName) ?? 0) + ms);
        }
    });
    const marathonRunner = Array.from(durationMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

    const avatarCounts = new Map<string, number>();
    participants.forEach(p => {
        if (p.avatar) avatarCounts.set(p.avatar, (avatarCounts.get(p.avatar) ?? 0) + 1);
    });
    const bestDressed = Array.from(avatarCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

    const oneHitWonder = participants
        .filter(p => (singerSongCounts.get(p.name) ?? 0) === 1)
        .sort((a, b) => b.applauseCount - a.applauseCount)[0];

    const totalMs = playlist.reduce((acc, item) => {
        return item.playedAt ? acc + (parseISO8601Duration(item.duration) ?? 0) : acc;
    }, 0);
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMins = Math.floor((totalMs % 3600000) / 60000);
    const totalDurationStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

    const rawGridItems: (GridItem | null)[] = [
        {
            label: t('loyalFans'),
            value: `${formatCompactNumber(totalApplause)} 👏`,
            sub: t('totalClaps'),
            icon: "👏"
        },
        marathonRunner ? {
            label: t('marathon'),
            value: `${Math.floor(marathonRunner[1] / 60000)}m`,
            sub: marathonRunner[0],
            icon: "🏃"
        } : null,
        bestDressed ? {
            label: t('bestDressed'),
            value: `${bestDressed[1]}x`,
            sub: bestDressed[0],
            icon: "👔"
        } : null,
        oneHitWonder ? {
            label: t('oneHitWonder'),
            value: `${formatCompactNumber(oneHitWonder.applauseCount)} 👏`,
            sub: oneHitWonder.name,
            icon: "🎯"
        } : null,
        {
            label: t('totalPlayed'),
            value: totalDurationStr,
            sub: t('duration'),
            icon: "🎵"
        }
    ];

    const gridItems: GridItem[] = rawGridItems.filter((item): item is GridItem => item !== null);

    const cards: CarouselCard[] = [
        {
            id: "eager",
            title: t('mostEager'),
            icon: Trophy,
            color: "text-yellow-500",
            type: "list",
            data: mostEager.map((p, i) => ({
                rank: i + 1,
                label: p.name,
                value: t('songsCount', { count: p.songs }),
                subValue: null
            }))
        },
        {
            id: "encore",
            title: t('encore'),
            icon: ThumbsUp,
            color: "text-blue-400",
            type: "list",
            data: topSongs.map((s, i) => ({
                rank: i + 1,
                label: s.title,
                value: `${formatCompactNumber(s.applauseCount)} 👏`,
                subValue: s.singerName 
            }))
        },
        {
            id: "divas",
            title: t('divas'),
            icon: Flower2,
            color: "text-pink-500",
            type: "list",
            data: topDivas.map((p, i) => ({
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

    if (activeStats.length === 0) {
        return (
            <div className="bg-card rounded-lg p-8 border text-center text-muted-foreground h-[340px] flex items-center justify-center">
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
            <div className="bg-card rounded-lg p-4 border h-[340px] flex flex-col relative overflow-hidden transition-all duration-300">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Icon className={cn("h-5 w-5", currentCard.color)} />
                    <h2 className="text-lg font-semibold">{currentCard.title}</h2>
                </div>

                <div className="flex-1 overflow-y-hidden">
                    {currentCard.type === "list" ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-300 key={activeIndex}">
                            {currentCard.data.length > 0 ? (
                                currentCard.data.map((item, idx) => (
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
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground text-sm pt-10">{t('waitingData')}</p>
                            )}
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

            <div className="flex justify-center gap-2 mt-3 shrink-0 h-5 items-center">
                {activeStats.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className="w-8 h-8 flex items-center justify-center focus:outline-none group"
                        aria-label={`Slide ${idx + 1}`}
                    >
                        <div className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            idx === activeIndex 
                                ? "bg-primary w-6"
                                : "bg-muted-foreground w-2 group-hover:bg-primary/70"
                        )} />
                    </button>
                ))}
            </div>
        </div>
    );
}
