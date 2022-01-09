import { useEffect, useRef, useState, DependencyList } from "./deps/react.ts";
import { IoSocket } from "../common/io-socket.ts";

export enum WebSocketReadyState {
  CLOSED = "CLOSED",
  CLOSING = "CLOSING",
  CONNECTING = "CONNECTING",
  OPEN = "OPEN",
  ERROR = "ERROR",
}

export interface WebSocketStateClosed {
  readyState: WebSocketReadyState.CLOSED;
}
export interface WebSocketStateClosing {
  readyState: WebSocketReadyState.CLOSING;
}
export interface WebSocketStateConnecting {
  readyState: WebSocketReadyState.CONNECTING;
}
export interface WebSocketStateError {
  readyState: WebSocketReadyState.ERROR;
  error: ErrorEvent;
}
export interface WebSocketStateOpen {
  readyState: WebSocketReadyState.OPEN;
}
export type WebSocketState =
  | WebSocketStateError
  | WebSocketStateClosed
  | WebSocketStateClosing
  | WebSocketStateConnecting
  | WebSocketStateOpen;

export type WebSocketOptions<TIncomingMessage, TOutgoingMessage> = {
  initialize: () => IoSocket<TIncomingMessage, TOutgoingMessage>;
};

export function useIoSocket<TIncomingMessage, TOutgoingMessage>(
  { initialize }: WebSocketOptions<TIncomingMessage, TOutgoingMessage>,
  deps?: DependencyList
) {
  const wsRef = useRef<IoSocket<TIncomingMessage, TOutgoingMessage>>();
  const [wsState, setWsState] = useState<WebSocketState>();
  useEffect(() => {
    const socket = initialize();
    wsRef.current = socket;
    let state: WebSocketState = {
      readyState: WebSocketReadyState.CONNECTING,
    };
    setWsState(state);
    function changeState(newState: WebSocketState) {
      state = newState;
      setWsState(state);
    }
    socket.on("open", () => {
      changeState({
        readyState: WebSocketReadyState.OPEN,
      });
    });
    socket.on("close", () => {
      changeState({ readyState: WebSocketReadyState.CLOSED });
    });
    socket.on("error", (err: any) => {
      changeState({
        readyState: WebSocketReadyState.ERROR,
        error: err as ErrorEvent,
      });
    });
    socket.on("message", (message) => {
      if (state.readyState !== WebSocketReadyState.OPEN) {
        return;
      }
    });

    return () => {
      socket?.close();
    };
  }, deps);

  function close() {
    wsRef.current?.close();
  }

  function send(message: TOutgoingMessage) {
    wsRef.current?.send(message);
  }

  return { socket: wsRef.current, state: wsState, close, send };
}
