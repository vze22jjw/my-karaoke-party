import { type Server as HttpServer } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type Socket as NetSocket } from "net";
import { Server } from "socket.io";
import { registerSocketEvents } from "~/server/socket/socketHandler";

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
  const origin = req.headers.origin;
  console.log(`${LOG_TAG} Init request to /api/socket from origin: '${origin ?? "undefined"}'`);

  if (res.socket.server.io) {
    console.log(`${LOG_TAG} Socket is already running.`);
    res.end();
    return;
  }

  console.log(`${LOG_TAG} Initializing Socket.io server on path: /socket.io ...`);

  const io = new Server(res.socket.server, {
    path: "/socket.io",
    addTrailingSlash: false,
    cors: {
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
