import { type Server as HttpServer } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type Socket as NetSocket } from "net";
import { Server } from "socket.io";
import { debugLog } from "~/utils/debug-logger";
import { env } from "~/env";
import { registerSocketEvents } from "~/server/socket/socketHandler";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io: Server;
    };
  };
};

const LOG_TAG = "[SocketServer]";

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    debugLog(LOG_TAG, "Socket is already running");
    res.end();
    return;
  }

  debugLog(LOG_TAG, "Starting Socket.io server...");

  // Build the list of allowed origins from environment variables
  const allowedOrigins = [
    "http://localhost:3000", // Always allow local development
  ];

  // Add the production URL if it's set and different from the local default
  if (env.NEXT_PUBLIC_APP_URL && env.NEXT_PUBLIC_APP_URL !== "http://localhost:3000") {
    allowedOrigins.push(env.NEXT_PUBLIC_APP_URL);
  }

  debugLog(LOG_TAG, "Allowed CORS origins:", allowedOrigins);

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  registerSocketEvents(io);

  res.socket.server.io = io;
  res.end();
};

export default SocketHandler;
