// // import { FairQueue } from "~/utils/fair-queue";

// // type PlaylistItem = {
// //   songName: string;
// //   singerName: string;
// // };

// // const queue = new FairQueue<PlaylistItem>();

// // queue.push("John", { songName: "John1", singerName: "John" }, 1);
// // // console.log(queue.pop());
// // console.log(queue.toArray());

// // queue.push("John", { songName: "John2", singerName: "John" }, 1);
// // queue.push("Ana", { songName: "Ana1", singerName: "Ana" }, 1);
// // console.log(queue.toArray());
// // // console.log(queue.pop());

// // queue.push("Ana", { songName: "Ana2", singerName: "Ana" }, 1);
// // queue.push("Nico", { songName: "Nico1", singerName: "Nico" }, 1);
// // console.log(queue.toArray());
// // // console.log(queue.pop());

// // queue.push("Ana", { songName: "Ana3", singerName: "Ana" }, 1);
// // queue.push("John", { songName: "John3", singerName: "John" }, 1);
// // queue.push("Emi", { songName: "Emi1", singerName: "Emi" }, 1);

// // console.log(queue.toArray());

// type PlaylistItem = {
//   order: number;
//   songName: string;
//   singerName: string;
// };

// function groupBy<T>(
//   array: T[],
//   keySelector: (item: T) => string | number | symbol,
// ) {
//   const result: Record<string, T[]> = {};

//   for (const item of array) {
//     const propertyValue = keySelector(item);

//     if (propertyValue !== undefined) {
//       const stringifiedValue = String(propertyValue);

//       result[stringifiedValue]?.push(item) ??
//         (result[stringifiedValue] = [item]);
//     }
//   }

//   return result;
// }

// function orderByFairness<T>(
//   array: T[],
//   keySelector: (item: T) => string | number | symbol,
//   compareFn?: (a: T, b: T) => number,
// ) {
//   const grouped = groupBy(array, keySelector);
//   const returnArray = Array<T>();

//   while (returnArray.length < array.length) {
//     const round = Array<T>();

//     for (const key in grouped) {
//       const group = grouped[key];
//       const item = group?.shift();

//       if (item) {
//         round.push(item);
//       }
//     }

//     returnArray.push(...round.sort(compareFn));
//   }

//   return returnArray;
// }

// const playlist = Array<PlaylistItem>();

// playlist.push({ order: 1, songName: "John1", singerName: "John" });
// playlist.push({ order: 2, songName: "John2", singerName: "John" });
// playlist.push({ order: 3, songName: "Ana1", singerName: "Ana" });
// playlist.push({ order: 4, songName: "Ana2", singerName: "Ana" });
// playlist.push({ order: 5, songName: "Nico1", singerName: "Nico" });
// playlist.push({ order: 6, songName: "Ana3", singerName: "Ana" });
// playlist.push({ order: 7, songName: "John3", singerName: "John" });

// console.log(
//   orderByFairness(
//     playlist,
//     (item) => item.singerName,
//     (a, b) => a.order - b.order,
//   ),
// );
