import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { partyRouter } from "./routers/party";
import { playlistRouter } from "./routers/playlist";
import { youtubeRouter } from "./routers/youtube";
import { idleMessageRouter } from "./routers/idleMessage"; 
import { spotifyRouter } from "./routers/spotify";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  party: partyRouter,
  playlist: playlistRouter,
  youtube: youtubeRouter,
  idleMessage: idleMessageRouter,
  spotify: spotifyRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 * ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
