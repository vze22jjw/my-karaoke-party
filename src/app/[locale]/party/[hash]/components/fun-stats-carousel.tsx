"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, Clock, Star, Sparkles, Music, User, Flame, Zap, type LucideIcon
} from "lucide-react";
import { formatCompactNumber } from "~/utils/number";
import { parseISO8601Duration } from "~/utils/string";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";

type PlaylistItem = {
    singerName: string;
    duration: string | null | undefined;
    playedAt: Date | null;
};

type Participant = {
    name: string;
    applauseCount: number;
    avatar: string | null;
    joinedAt: Date;
};

type Props = {
    playlist: PlaylistItem[];
    participants: Participant[];
};

// Define a shape that covers all possible data items
type StatItem = {
    label: string;
    value: string;
    icon: LucideIcon | null;
    // Optional properties for specific cards
    rank?: number;
    songs?: number;
    claps?: number;
};

type StatCard = {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    data: StatItem[];
};

const CARD_DURATION = 8000; 

export function FunStatsCarousel({ playlist, participants }: Props) {
    const t = useTranslations('guest.funStats');
    const [activeIndex, setActiveIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

    // --- 1. PRE-CALCULATE DATA ---
    
    // Calculate song counts for Top Singers enrichment
    const songCountsMap = new Map<string, number>();
    playlist.forEach(item => {
        songCountsMap.set(item.singerName, (songCountsMap.get(item.singerName) ?? 0) + 1);
    });

    // Total Hype
    const totalApplause = participants.reduce((acc, p) => acc + p.applauseCount, 0);

    // Concert Time
    const totalMs = playlist.reduce((acc, item) => {
        return item.playedAt ? acc + (parseISO8601Duration(item.duration) ?? 0) : acc;
    }, 0);
    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const concertTimeStr = `${hours}h ${mins}m`;

    // Early Bird
    const earlyBird = participants.length > 0 
        ? [...participants].sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())[0] 
        : null;

    // Marathon Data
    const durationMap = new Map<string, number>();
    playlist.forEach(item => {
        if (item.playedAt) {
            const ms = parseISO8601Duration(item.duration) ?? 0;
            durationMap.set(item.singerName, (durationMap.get(item.singerName) ?? 0) + ms);
        }
    });
    const marathonRunners = Array.from(durationMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2); // Top 2

    // One Hit Wonder
    const oneHitWonders = participants
        .filter(p => songCountsMap.get(p.name) === 1)
        .sort((a, b) => b.applauseCount - a.applauseCount)
        .slice(0, 1); // Top 1

    // Team Spirit
    const avatarCounts = new Map<string, number>();
    participants.forEach(p => {
        if (p.avatar) avatarCounts.set(p.avatar, (avatarCounts.get(p.avatar) ?? 0) + 1);
    });
    const teams = Array.from(avatarCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    // --- 2. DEFINE CARDS ---
    const stats: StatCard[] = [
        // CARD 1: TOP SINGERS (Rich View)
        {
            id: "top-singers",
            title: t('topSingers'),
            icon: Trophy,
            color: "text-yellow-500",
            data: participants
                .sort((a, b) => b.applauseCount - a.applauseCount)
                .slice(0, 5)
                .map((p, i) => ({ 
                    label: p.name, 
                    value: "", // Ignored in custom render
                    icon: null,
                    // Extra data for custom render
                    rank: i + 1,
                    songs: songCountsMap.get(p.name) ?? 0,
                    claps: p.applauseCount
                }))
        },
        // CARD 2: PARTY HIGHLIGHTS
        {
            id: "party-highlights",
            title: t('partyHighlights'),
            icon: Sparkles,
            color: "text-pink-500",
            data: [
                { label: t('totalApplause'), value: formatCompactNumber(totalApplause), icon: Zap },
                { label: t('nonStopMusic'), value: concertTimeStr, icon: Music },
                ...(earlyBird ? [{ label: t('firstToJoin'), value: earlyBird.name, icon: Star }] : [])
            ]
        },
        // CARD 3: SUPERLATIVES
        {
            id: "superlatives",
            title: t('superlatives'),
            icon: Flame,
            color: "text-orange-500",
            data: [
                ...marathonRunners.map(([name, ms]) => ({ 
                    label: `${t('marathonRunner')}: ${name}`, 
                    value: t('minsSung', { count: Math.floor(ms / 60000) }),
                    icon: Clock
                })),
                ...oneHitWonders.map(p => ({ 
                    label: `${t('oneHitWonder')}: ${p.name}`, 
                    value: t('clapsValue', { count: formatCompactNumber(p.applauseCount) }),
                    icon: Flame 
                }))
            ]
        },
        // CARD 4: TEAM SPIRIT
        {
            id: "party-avatars",
            title: t('teamSpirit'),
            icon: User,
            color: "text-green-400",
            data: teams.map(([avatar, count]) => ({ 
                label: t('teamName', { avatar }), 
                value: t('membersCount', { count }),
                icon: null
            }))
        }
    ];

    const activeStats = stats.filter(s => s.data.length > 0);

    const nextSlide = useCallback(() => {
        setActiveIndex((prev) => (prev + 1) % activeStats.length);
    }, [activeStats.length]);

    const prevSlide = useCallback(() => {
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

    // Fixed Touch Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches[0]) {
            setTouchStart(e.touches[0].clientX);
        }
    };
    
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null || !e.changedTouches[0]) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (Math.abs(diff) > 50) { 
            if (diff > 0) nextSlide();
            else prevSlide();
        }
        setTouchStart(null);
    };

    if (activeStats.length === 0) {
        return (
            <div className="bg-card rounded-lg p-8 border text-center text-muted-foreground h-[340px] flex items-center justify-center">
                {t('waitingData')}
            </div>
        );
    }

    const currentStat = activeStats[activeIndex];
    
    // Fix potential undefined
    if (!currentStat) return null;

    const Icon = currentStat.icon;

    return (
        <div 
            className="bg-card rounded-lg p-4 border h-[340px] flex flex-col relative overflow-hidden select-none transition-all duration-300 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <Icon className={cn("h-5 w-5", currentStat.color)} />
                <h2 className="text-lg font-semibold">{currentStat.title}</h2>
            </div>

            <div className="flex-1 flex flex-col justify-start gap-2 animate-in fade-in duration-500 key={activeIndex} overflow-y-auto no-scrollbar">
                {currentStat.id === 'top-singers' ? (
                    // --- CUSTOM RENDER FOR TOP SINGERS (Restored List View) ---
                    currentStat.data.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-white/5 shrink-0">
                             {/* Left: Rank & Name */}
                             <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs",
                                    item.rank === 1 ? "bg-yellow-500 text-black" : 
                                    item.rank === 2 ? "bg-slate-300 text-black" : 
                                    item.rank === 3 ? "bg-orange-700 text-white" : 
                                    "bg-muted text-muted-foreground"
                                )}>
                                    {item.rank}
                                </div>
                                <span className="font-medium truncate text-sm">{item.label}</span>
                             </div>
                             
                             {/* Right: Stat Pills */}
                             <div className="flex items-center gap-2 shrink-0">
                                {/* Songs Pill */}
                                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5">
                                    <Music className="h-3 w-3 text-cyan-400" />
                                    <span className="text-xs font-mono font-bold">{item.songs}</span>
                                </div>
                                {/* Claps Pill */}
                                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5">
                                    <span className="text-xs">👏</span>
                                    <span className="text-xs font-mono font-bold text-pink-500">
                                        {formatCompactNumber(item.claps ?? 0)}
                                    </span>
                                </div>
                             </div>
                        </div>
                    ))
                ) : (
                    // --- STANDARD RENDER FOR OTHER CARDS ---
                    currentStat.data.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                {item.icon && <item.icon className={cn("h-4 w-4 shrink-0 opacity-70", currentStat.color)} />}
                                <span className="font-medium truncate text-sm">{item.label}</span>
                            </div>
                            <span className={cn("font-bold font-mono text-sm whitespace-nowrap ml-2", currentStat.color)}>
                                {item.value}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="flex justify-center gap-2 mt-4 shrink-0">
                {activeStats.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={cn(
                            "h-2 w-2 rounded-full transition-all",
                            idx === activeIndex ? "bg-primary w-4" : "bg-black/40 hover:bg-black/60"
                        )}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
