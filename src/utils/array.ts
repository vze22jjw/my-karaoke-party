/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion */
export function groupBy<T>(
  array: T[],
  keySelector: (item: T) => string | number | symbol,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of array) {
    const propertyValue = keySelector(item);

    if (propertyValue !== undefined) {
      const stringifiedValue = String(propertyValue);

      result[stringifiedValue]?.push(item) ??
        (result[stringifiedValue] = [item]);
    }
  }

  return result;
}

export function orderByFairness<T>(
  collection: T[],
  keySelector: (item: T) => string | number | symbol,
  compareFn?: (a: T, b: T) => number,
): T[] {
  const grouped = groupBy(collection, keySelector);
  const returnArray = Array<T>();

  while (returnArray.length < collection.length) {
    const round = Array<T>();

    for (const key in grouped) {
      const group = grouped[key];
      const item = group?.shift();

      if (item) {
        round.push(item);
      }
    }

    returnArray.push(...round.sort(compareFn));
  }

  return returnArray;
}

export interface FairnessPlaylistItem {
  id: number;
  partyId: number;
  videoId: string;
  title: string;
  artist: string | null;
  song: string | null;
  coverUrl: string;
  duration: string | null;
  singerName: string;
  addedAt: Date;
  playedAt: Date | null;
  orderIndex: number;
  randomBreaker: number | null;
}

function getSingerStats(
  playlist: FairnessPlaylistItem[],
) {
  const stats: Record<
    string,
    {
      playedCount: number;
      nextCount: number;
      lastPlayed: Date | null;
    }
  > = {};

  for (const item of playlist) {
    const name = item.singerName;
    if (!stats[name]) {
      stats[name] = { playedCount: 0, nextCount: 0, lastPlayed: null };
    }

    if (item.playedAt) {
      stats[name].playedCount++;
      if (!stats[name].lastPlayed || item.playedAt > stats[name].lastPlayed!) {
        stats[name].lastPlayed = item.playedAt;
      }
    } else {
      stats[name].nextCount++;
    }
  }

  return stats;
}

/**
 * Implements a strict Round Robin queue sorting logic.
 *
 * @param allItems - (used for accurate stats calculation)
 * @param itemsToSort - (remaining queue)
 * @param singerToDeprioritize - (for anti-consecutive rule)
 * @param singerEntryTimes - (Map of singerName -> lastQueueEntryAt for persistent ordering)
 **/
/* eslint-disable @typescript-eslint/no-unused-vars */
export function orderByRoundRobin<T extends FairnessPlaylistItem>(
  allItems: T[],
  itemsToSort: T[],
  singerToDeprioritize: string | null,
  singerEntryTimes: Record<string, Date | null> = {},
): T[] {
  const stats = getSingerStats(allItems);

  const playedSingers = allItems
    .filter(item => item.playedAt)
    .sort((a, b) => a.playedAt!.getTime() - b.playedAt!.getTime())
    .map(item => item.singerName);

  // eslint-disable-next-line prefer-const
  let resultByUser = [...playedSingers];
  
  if (singerToDeprioritize) {
    resultByUser.push(singerToDeprioritize);
  }

  const singerMap = new Map<string, T[]>(); 
  
  const sortedItemsToSort = [...itemsToSort].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

  sortedItemsToSort.forEach(item => {
    if (!singerMap.has(item.singerName)) {
      singerMap.set(item.singerName, []);
    }
    singerMap.get(item.singerName)!.push(item);
  });
  
  const upcoming: T[] = [];
  
  while (singerMap.size > 0) {
    let maxDistance = -1;
    let maxSingerId: string | null = null;
    
    const allUnplayedSingers = Array.from(singerMap.keys());

    for (const singerId of allUnplayedSingers) {
      const idx = resultByUser.lastIndexOf(singerId);
      
      // Distance: index of the singer + 1 (position) compared to the end of the history array
      const distance = idx === -1 ? Infinity : resultByUser.length - idx; 

      if (distance > maxDistance) {
        maxDistance = distance;
        maxSingerId = singerId;
      } else if (distance === maxDistance) {
        
        // Priority 1: Queue Entry Time (Turn Persistence)
        const entryTimeA = singerEntryTimes[singerId] ?? singerMap.get(singerId)![0]!.addedAt;
        const entryTimeB = singerEntryTimes[maxSingerId!] ?? singerMap.get(maxSingerId!)![0]!.addedAt;

        if (entryTimeA.getTime() !== entryTimeB.getTime()) {
            if (entryTimeA.getTime() < entryTimeB.getTime()) {
                maxSingerId = singerId;
            }
        } else {
            // Priority 2: Fewest Unplayed Songs
            const statsA = stats[singerId]!;
            const statsB = stats[maxSingerId!]!;

            if (statsA.nextCount !== statsB.nextCount) {
                if (statsA.nextCount < statsB.nextCount) {
                    maxSingerId = singerId;
                }
            } else {
                // Priority 3: Random Breaker (session-based luck fallback)
                const nextSongA = singerMap.get(singerId)![0]!;
                const nextSongB = singerMap.get(maxSingerId!)![0]!;

                if ((nextSongA.randomBreaker ?? 0) < (nextSongB.randomBreaker ?? 0)) {
                    maxSingerId = singerId;
                }
            }
        }
      }
    }

    if (maxSingerId === null) break; 

    const userItems = singerMap.get(maxSingerId)!;
    const nextSong = userItems.shift()!;
    upcoming.push(nextSong);

    resultByUser.push(maxSingerId);

    if (userItems.length === 0) {
      singerMap.delete(maxSingerId);
    }
  }

  return upcoming; 
}
/* eslint-enable @typescript-eslint/no-unused-vars */
