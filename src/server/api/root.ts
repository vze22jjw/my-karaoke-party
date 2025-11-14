import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { partyRouter } from "./routers/party";
import { playlistRouter } from "./routers/playlist";
import { youtubeRouter } from "./routers/youtube";
import { idleMessageRouter } from "./routers/idleMessage";
import { spotifyRouter } from "./routers/spotify"; // <-- Import

export const appRouter = createTRPCRouter({
  party: partyRouter,
  playlist: playlistRouter,
  youtube: youtubeRouter,
  idleMessage: idleMessageRouter,
  spotify: spotifyRouter, // <-- Add
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
