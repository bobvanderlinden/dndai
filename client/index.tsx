import React, { useReducer, useEffect } from "./deps/react.ts";
import ReactDOM from "./deps/react-dom.ts";
import { useForm } from "./deps/react-hook-form.ts";
import {
  Router,
  RouteComponentProps,
  useParams,
  useLocation,
} from "./deps/@reach/router.ts";
import { useIoSocket, WebSocketReadyState } from "./use-iosocket.ts";
import { ServerMessage, serverMessage } from "../common/server-message.ts";
import { ClientMessage, clientMessage } from "../common/client-message.ts";
import { Event } from "../common/event.ts";
import { IoSocket } from "../common/io-socket.ts";
import * as json from "../common/json.ts";

type State = {
  events: Event[];
  working: boolean;
  actionState: "active" | "sending" | "rejected" | "accepted";
};
type Message =
  | { type: "server-message"; message: ServerMessage }
  | { type: "sent-message" };

function reducer(state: State, message: Message): State {
  switch (message.type) {
    case "server-message":
      return serverMessageReducer(state, message.message);
    case "sent-message":
      return { ...state, actionState: "sending" };
  }
}

function serverMessageReducer(state: State, message: ServerMessage) {
  switch (message.type) {
    case "working":
      return { ...state, working: true };
    case "event":
      return {
        ...state,
        working: false,
        events: [...state.events, message.event],
      };
    case "user-action-result":
      return { ...state, working: false, actionState: message.result };
    default:
      throw new Error("Unknown message type");
  }
}

const App = () => {
  return (
    <Router>
      <Login path="/" />
      <Room path="/room/:roomId" />
    </Router>
  );
};

const Login = (props: RouteComponentProps) => {
  const { register, handleSubmit, reset } = useForm();

  function onSubmit(data: { name: string; room: string }) {
    const query = new URLSearchParams({
      name: data.name,
    }).toString();
    props.navigate?.(`/room/${data.room}?${query}`);
    reset();
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="text" defaultValue="123" {...register("room")} />
      <input type="text" {...register("name")} />
      <input type="submit" />
    </form>
  );
};

const Room = (props: RouteComponentProps) => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const username = new URLSearchParams(location.search).get("name");

  if (username === null) {
    props.navigate?.("/");
    return <></>;
  }

  const url = `ws://localhost:3000/ws/room/${roomId}`;

  const {
    socket,
    state: socketState,
    send,
  } = useIoSocket<ServerMessage, ClientMessage>(
    {
      initialize() {
        const socket = new WebSocket(url);
        const ioSocket = new IoSocket<ServerMessage, ClientMessage>(
          socket,
          serverMessage(json.schemable).decode,
          clientMessage(json.schemable).encode
        );
        ioSocket.once("open", () => {
          ioSocket.send({ type: "init", name: username });
        });

        return ioSocket;
      },
    },
    [roomId, username]
  );

  const [state, dispatch] = useReducer(reducer, {
    events: [],
    working: false,
    actionState: "active",
  });

  useEffect(() => {
    socket?.on("message", (message) => {
      if (
        message.type === "user-action-result" &&
        message.result === "accepted"
      ) {
        reset();
        setFocus("message");
      }
      dispatch({ type: "server-message", message });
    });
  }, [socket]);

  const { register, handleSubmit, reset, setFocus } = useForm();

  function onSubmit(data: { message: string }) {
    dispatch({ type: "sent-message" });
    send({
      type: "user-action",
      id: "1",
      action: { type: "say", text: data.message },
    });
  }

  if (socketState?.readyState !== WebSocketReadyState.OPEN) {
    return (
      <>
        <p>Websocket state: {socketState?.readyState}</p>
      </>
    );
  }

  const eventList = (
    <ul className="event-list">
      {state.events.map((event, index) => {
        switch (event.type) {
          case "story":
            return (
              <li className="story" key={index}>
                {event.text}
              </li>
            );
          case "joined":
            return (
              <li className="user-joined" key={index}>
                {event.user} joined
              </li>
            );
          case "left":
            return (
              <li className="user-left" key={index}>
                {event.user} left
              </li>
            );
          case "user-action":
            switch (event.action.type) {
              case "say":
                return (
                  <li className="user-action user-say" key={index}>
                    {event.user} says {event.action.text}
                  </li>
                );
              case "do":
                return (
                  <li className="user-action user-do" key={index}>
                    {event.user}: {event.action.text}
                  </li>
                );
            }
        }
      })}
    </ul>
  );

  const canType =
    state.actionState === "active" || state.actionState === "accepted";
  const messageForm = (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="text" {...register("message")} disabled={!canType} />
      <input type="submit" disabled={!canType || state.working} />
    </form>
  );

  return (
    <>
      {state.actionState}
      {eventList}
      {messageForm}
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
