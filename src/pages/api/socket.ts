import { type Server as HttpServer } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type Socket as NetSocket } from "net";
import { Server } from "socket.io";
import { registerSocketEvents } from "~/server/socket/socketHandler";

// Disable body parsing so we don't interfere with anything, though less critical now with path separation
export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io: Server;
    };
  };
};

const LOG_TAG = "[SocketServer]";

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  // Debug log for the initialization request
  const origin = req.headers.origin;
  console.log(`${LOG_TAG} Init request to /api/socket from origin: '${origin ?? "undefined"}'`);

  if (res.socket.server.io) {
    console.log(`${LOG_TAG} Socket is already running.`);
    res.end();
    return;
  }

  console.log(`${LOG_TAG} Initializing Socket.io server on path: /socket.io ...`);

  const io = new Server(res.socket.server, {
    // FIX: Change path to "/socket.io" (default) to avoid Next.js API route collision
    path: "/socket.io",
    addTrailingSlash: false,
    cors: {
      // Allow ALL origins dynamically
      origin: (requestOrigin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"], 
  });

  io.engine.on("connection_error", (err) => {
    console.error(`${LOG_TAG} Connection error:`, err);
  });

  registerSocketEvents(io);

  res.socket.server.io = io;
  console.log(`${LOG_TAG} Socket.io initialized successfully.`);
  res.end();
};

export default SocketHandler;
