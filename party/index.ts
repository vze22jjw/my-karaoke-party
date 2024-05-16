import { type Video } from "@prisma/client";
import type * as Party from "partykit/server";
import { z } from "zod";

const EXPIRY_PERIOD_MILLISECONDS = 30 * 24 * 60 * 60 * 1000; // 30 days

const AddVideo = z.object({
  type: z.literal("add-video"),
  id: z.string(),
});

const MarkAsPlayed = z.object({
  type: z.literal("mark-as-played"),
  id: z.string(),
});

const RemoveVideo = z.object({
  type: z.literal("remove-video"),
  id: z.string(),
});

export const Message = z.union([AddVideo, RemoveVideo, MarkAsPlayed]);

type VideoInPlaylist = Video & { playedAt: Date | null };

export type KaraokeParty = {
  videos: VideoInPlaylist[];
};

export default class Server implements Party.Server {
  karaokeParty: KaraokeParty | undefined;

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.karaokeParty =
      await this.room.storage.get<KaraokeParty>("karaokeParty");
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
      id: ${conn.id}
      room: ${this.room.id}
      url: ${new URL(ctx.request.url).pathname}`,
    );

    await this.room.storage.setAlarm(Date.now() + EXPIRY_PERIOD_MILLISECONDS);
  }

  async onMessage(message: string, sender: Party.Connection) {
    if (!this.karaokeParty) return;

    const result = Message.safeParse(JSON.parse(message));

    if (result.success === true) {
      const data = result.data;

      await this.room.storage.setAlarm(Date.now() + EXPIRY_PERIOD_MILLISECONDS);

      switch (data.type) {
        case "add-video": {
          this.karaokeParty.videos.push({
            id: data.id,
            title: "Some title",
            artist: "Some artist",
            song: "Song name",
            createdAt: new Date(),
            playedAt: null,
          });

          await this.savekaraokeParty();
          this.room.broadcast(JSON.stringify(this.karaokeParty));

          break;
        }

        case "remove-video": {
          const index = this.karaokeParty.videos.findIndex(
            (video) => video.id === data.id,
          );

          if (index !== -1) {
            this.karaokeParty.videos.splice(index, 1);
            await this.savekaraokeParty();
            this.room.broadcast(JSON.stringify(this.karaokeParty));
          }

          break;
        }

        case "mark-as-played": {
          const video = this.karaokeParty.videos.find(
            (video) => video.id === data.id && !video.playedAt,
          );

          if (video) {
            video.playedAt = new Date();

            await this.savekaraokeParty();
            this.room.broadcast(JSON.stringify(this.karaokeParty));
          }

          break;
        }
      }
    }
  }

  async onRequest(req: Party.Request) {
    if (req.method === "POST" && !this.karaokeParty) {
      console.log("Creating new karaoke party");

      this.karaokeParty = {
        videos: [],
      };

      await this.savekaraokeParty();
    }

    if (this.karaokeParty) {
      return new Response(JSON.stringify(this.karaokeParty), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Party not found =(", { status: 404 });
  }

  async savekaraokeParty() {
    if (this.karaokeParty) {
      await this.room.storage.put<KaraokeParty>(
        "karaokeParty",
        this.karaokeParty,
      );
    }
  }

  async onAlarm() {
    await this.room.storage.deleteAll();
  }
}

Server satisfies Party.Worker;
