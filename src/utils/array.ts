/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
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

// Interface defining all required fields for sorting AND for the API final mapping
// This must be an EXACT structural match for the Prisma PlaylistItem type.
export interface FairnessPlaylistItem {
  // All fields from Prisma PlaylistItem model:
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
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function orderByAdvancedFairness<T extends FairnessPlaylistItem>(
  allItems: T[],
  itemsToSort: T[],
  singerToDeprioritize: string | null, // Accepts the current playing singer
): T[] {
  // Calculate stats based on the ENTIRE playlist history
  const stats = getSingerStats(allItems);

  // Get the unique singers who have songs in the ENTIRE unplayed queue (including the current one)
  const allUnplayedSingers = new Set(allItems.filter(item => !item.playedAt).map(item => item.singerName));
  const isOnlyOneSingerLeft = allUnplayedSingers.size <= 1;

  // Custom sorting comparator applied to the itemsToSort array
  itemsToSort.sort((a, b) => {
    // Logic: stats guarantees existence of a.singerName and b.singerName
    const aStats = stats[a.singerName]!;
    const bStats = stats[b.singerName]!;
    
    const aIsDeprioritized = a.singerName === singerToDeprioritize;
    const bIsDeprioritized = b.singerName === singerToDeprioritize;

    // --- Rule 1: Anti-Consecutive Rule ---
    if (!isOnlyOneSingerLeft) {
        if (aIsDeprioritized !== bIsDeprioritized) {
            // Deprioritize the singer who sang last (pushed back by 1)
            return aIsDeprioritized ? 1 : -1;
        }
    }

    // --- Rule 2: Least Recently Played (LRP) ---
    const aLastPlayedTime = aStats.lastPlayed?.getTime() ?? 0;
    const bLastPlayedTime = bStats.lastPlayed?.getTime() ?? 0;
    
    if (aLastPlayedTime !== bLastPlayedTime) {
      // Lower time value (older played song or never played) means they get higher priority (-1)
      return aLastPlayedTime - bLastPlayedTime;
    }

    // --- Rule 3: Fewest Unsung Songs (Next in Line) ---
    if (aStats.nextCount !== bStats.nextCount) {
      // Less songs = higher priority (-1)
      return aStats.nextCount - bStats.nextCount; 
    }

    // --- Rule 4: Fewest Total Songs Sung (Total Played Count) ---
    if (aStats.playedCount !== bStats.playedCount) {
        // Less songs sung total = higher priority (-1)
        return aStats.playedCount - bStats.playedCount;
    }

    // --- Rule 5: Random Tie Breaker ---
    const aBreaker = a.randomBreaker ?? Math.random();
    const bBreaker = b.randomBreaker ?? Math.random();
    if (aBreaker !== bBreaker) {
      // Prioritize the lower randomBreaker value
      return aBreaker - bBreaker;
    }

    // Final Fallback: order by time added
    return a.addedAt.getTime() - b.addedAt.getTime();
  });

  return itemsToSort; // Return the now-sorted list
}
/* eslint-enable @typescript-eslint/no-non-null-assertion */
  