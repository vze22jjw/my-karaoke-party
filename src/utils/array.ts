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

// Helper to calculate required stats per singer for fairness sorting.
function getSingerStats(
  playlist: FairnessPlaylistItem[],
) {
  const stats: Record<
    string,
    {
      playedCount: number; // Total songs sung (Rule 4 - kept for stats/future logic)
      nextCount: number; // Songs currently in queue (Rule 3)
      lastPlayed: Date | null; // Last time a song was played (Rule 2)
    }
  > = {};

  for (const item of playlist) {
    const name = item.singerName;
    if (!stats[name]) {
      stats[name] = { playedCount: 0, nextCount: 0, lastPlayed: null };
    }

    if (item.playedAt) {
      stats[name].playedCount++; // Total songs sung
      // Find the LATEST played song (most recent playedAt)
      if (!stats[name].lastPlayed || item.playedAt > stats[name].lastPlayed!) {
        stats[name].lastPlayed = item.playedAt;
      }
    } else {
      stats[name].nextCount++; // Songs currently in queue
    }
  }

  return stats;
}

/**
 * Implements a strict Round Robin queue sorting logic.
 *
 * @param allItems - The entire playlist history (used for accurate stats calculation)
 * @param itemsToSort - The subset of unplayed items to be sorted (remaining queue)
 * @param singerToDeprioritize - The singer of the currently playing/last finished song (for anti-consecutive rule)
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export function orderByRoundRobin<T extends FairnessPlaylistItem>(
  allItems: T[],
  itemsToSort: T[],
  singerToDeprioritize: string | null, // Accepts the current playing singer
): T[] {
  // Calculate stats based on the ENTIRE playlist history
  const stats = getSingerStats(allItems);

  // 1. Create the initial result/history list of singer names to calculate "distance"
  const playedSingers = allItems
    .filter(item => item.playedAt)
    .sort((a, b) => a.playedAt!.getTime() - b.playedAt!.getTime())
    .map(item => item.singerName);

  // eslint-disable-next-line prefer-const
  let resultByUser = [...playedSingers];
  
  // Add the singer of the current song to history for anti-consecutive rule
  if (singerToDeprioritize) {
    resultByUser.push(singerToDeprioritize);
  }

  // 2. Group all songs to be sorted by singer, maintaining original order (addedAt)
  const singerMap = new Map<string, T[]>(); 
  
  // Sort itemsToSort by addedAt time before grouping to ensure FIFO within a singer's turn
  const sortedItemsToSort = [...itemsToSort].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

  sortedItemsToSort.forEach(item => {
    if (!singerMap.has(item.singerName)) {
      singerMap.set(item.singerName, []);
    }
    singerMap.get(item.singerName)!.push(item);
  });
  
  const upcoming: T[] = [];
  
  // 3. Iteratively build the Round Robin queue
  while (singerMap.size > 0) {
    let maxDistance = -1;
    let maxSingerId: string | null = null;
    
    const allUnplayedSingers = Array.from(singerMap.keys());

    for (const singerId of allUnplayedSingers) {
      // Find the position of the singer's last played/queued song in the history array
      const idx = resultByUser.lastIndexOf(singerId);
      
      // Distance: index of the singer + 1 (position) compared to the end of the history array
      const distance = idx === -1 ? Infinity : resultByUser.length - idx; 

      if (distance > maxDistance) {
        maxDistance = distance;
        maxSingerId = singerId;
      } else if (distance === maxDistance) {
        // Tie-breaker 1: Fewest Unsung Songs
        const statsA = stats[singerId]!;
        const statsB = stats[maxSingerId!]!;

        if (statsA.nextCount !== statsB.nextCount) {
            if (statsA.nextCount < statsB.nextCount) {
                maxSingerId = singerId;
            }
        } else {
            // Tie-breaker 2: Random Breaker
            const nextSongA = singerMap.get(singerId)![0]!;
            const nextSongB = singerMap.get(maxSingerId!)![0]!;

            if (nextSongA.randomBreaker !== nextSongB.randomBreaker) {
                if (nextSongA.randomBreaker! < nextSongB.randomBreaker!) {
                    maxSingerId = singerId;
                }
            } else {
                // Final Tie-breaker: Fallback to earliest added song
                if (nextSongA.addedAt.getTime() < nextSongB.addedAt.getTime()) {
                    maxSingerId = singerId;
                }
            }
        }
      }
    }

    if (maxSingerId === null) break; 

    // Take the next song for the maxSingerId (FIFO order maintained by the initial sort of itemsToSort)
    const userItems = singerMap.get(maxSingerId)!;
    const nextSong = userItems.shift()!;
    upcoming.push(nextSong);

    // Update the distance history for the next iteration
    resultByUser.push(maxSingerId);

    // Remove singer from map if their queue is now empty
    if (userItems.length === 0) {
      singerMap.delete(maxSingerId);
    }
  }

  // FIX: Return the newly constructed 'upcoming' array
  return upcoming; 
}
/* eslint-enable @typescript-eslint/no-unused-vars */
