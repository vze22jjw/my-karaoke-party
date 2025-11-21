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

  const allowedOrigins: string[] = [];

  // 1. Allow the configured public URL (e.g., http://localhost:3120)
  if (env.NEXT_PUBLIC_APP_URL) {
      allowedOrigins.push(env.NEXT_PUBLIC_APP_URL);
  }

  // 2. Explicitly allow the host (0.0.0.0) access point using the runtime PORT variable, 
  // which is useful for direct container access/Docker inspection tools.
  const runtimePort = env.PORT ?? '3000';
  allowedOrigins.push(`http://0.0.0.0:${runtimePort}`);


  // Ensure unique origins and filter out duplicates
  const uniqueAllowedOrigins = [...new Set(allowedOrigins.filter(Boolean))];

  debugLog(LOG_TAG, "Allowed CORS origins:", uniqueAllowedOrigins);

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: uniqueAllowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  registerSocketEvents(io);

  res.socket.server.io = io;
  res.end();
};

export default SocketHandler;
