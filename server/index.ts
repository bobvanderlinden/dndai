import "https://deno.land/x/dotenv/load.ts";

throw new Error(`Deno.version: ${JSON.stringify(Deno.version)}`);

import { Application, Router } from "./deps/oak.ts";
import { middleware as clientMiddleware } from "./client.ts";
import { IoSocket } from "../common/io-socket.ts";
import * as json from "../common/json.ts";
import {
  clientMessage,
  initMessage,
  ClientMessage,
} from "../common/client-message.ts";
import { StoryEvent, Event } from "../common/event.ts";
import { serverMessage, ServerMessage } from "../common/server-message.ts";
import { complete } from "./openai.ts";
const APP_HOST = "localhost";
const APP_PORT = 3000;

const app = new Application();

const router = new Router();

type RoomId = string;
interface User {
  name: string;
  socket: IoSocket<ClientMessage, ServerMessage>;
}
interface Room {
  events: Event[];
  users: User[];
  working: boolean;
}
const rooms: Record<RoomId, Room> = {};

async function createIntroduction(): Promise<StoryEvent> {
  const result = await complete({
    prompt: "Introduce our fantasy adventure story in around 20 words:\n",
    max_tokens: 100,
  });
  const text = result.choices[0].text;
  return { type: "story", text };
}

async function createRoom(): Promise<Room> {
  const introduction = await createIntroduction();
  const events: Event[] = [introduction];
  return { events, users: [], working: false };
}

function readMessage<TIncomingMessage, TOutgoingMessage>(
  socket: IoSocket<TIncomingMessage, TOutgoingMessage>
): Promise<TIncomingMessage> {
  return new Promise((resolve, reject) => {
    socket.on("message", (initMessage) => {
      resolve(initMessage);
    });
    socket.on("error", (err) => {
      reject(err);
    });
    socket.on("close", () => {
      reject(new Error("Socket closed"));
    });
  });
}

async function initializeWebSocket(webSocket: WebSocket) {
  const initializingSocket = new IoSocket(
    webSocket,
    initMessage(json.schemable).decode,
    () => {
      throw new Error("Cannot send messages to the initializing socket");
    }
  );
  const result = await readMessage(initializingSocket);
  initializingSocket.detach();
  return result;
}

router.get("/ws/room/:roomId", async (ctx) => {
  const webSocket = await ctx.upgrade();

  const userInfo = await initializeWebSocket(webSocket);
  const socket = new IoSocket(
    webSocket,
    clientMessage(json.schemable).decode,
    serverMessage(json.schemable).encode
  );

  const user = {
    socket,
    name: userInfo?.name,
  };

  // Create room if not exists.
  if (!rooms[ctx.params.roomId]) {
    rooms[ctx.params.roomId] = await createRoom();
  }
  const room = rooms[ctx.params.roomId];

  // Add socket to room.
  room.users = [...room.users, user];

  // Send the room state to the user.
  for (const event of room.events) {
    user.socket.send({ type: "event", event });
  }

  pushEvent({ type: "joined", user: userInfo.name });

  // Remove socket from room if closed.
  socket.on("close", () => {
    room.users = room.users.filter((s) => s !== user);
    pushEvent({ type: "left", user: userInfo.name });
  });

  // Broadcast received messages to room.
  socket.on("message", async (clientMessage) => {
    console.log(clientMessage);
    switch (clientMessage.type) {
      case "user-action": {
        if (room.working) {
          socket.send({
            type: "user-action-result",
            result: "rejected",
            id: clientMessage.id,
          });
          return;
        }
        pushEvent({
          type: "user-action",
          user: userInfo.name,
          action: clientMessage.action,
        });
        socket.send({
          type: "user-action-result",
          result: "accepted",
          id: clientMessage.id,
        });

        room.working = true;
        broadcastMessage({ type: "working" });
        const result = await complete({
          prompt:
            room.events
              .slice(-10)
              .map((line) => `* ${line}`)
              .join("\n") +
            `\n\nWhat happened next can be described in around 20 words:`,
          max_tokens: 50,
        });
        pushEvent({ type: "story", text: result.choices[0].text });
        room.working = false;
        break;
      }
    }
  });

  function broadcastMessage(message: ServerMessage) {
    for (const user of room.users) {
      user.socket.send(message);
    }
  }

  function pushEvent(event: Event) {
    room.events = [...room.events, event];
    broadcastMessage({ type: "event", event });
  }
});

app.use(clientMiddleware);
app.use(router.routes());

async function exists(p: string) {
  try {
    const result = await Deno.stat(p);
    return result.isFile;
  } catch {
    return false;
  }
}

app.use(async (context, next) => {
  const root = `${Deno.cwd()}/static`;
  let path = `${context.request.url.pathname}`;
  if (!(await exists(`${root}${path}`))) {
    path = "/";
  }
  try {
    await context.send({
      root,
      path,
      index: "index.html",
    });
  } catch (e) {
    console.log(e);
    next();
  }
});

console.log(`Listening on ${APP_PORT}...`);

app.listen(`${APP_HOST}:${APP_PORT}`);
