import * as event from "./deps/event.ts";
import { Schema } from "./schema.ts";

export class IoSocket<
  TIncomingMessage,
  TOutgoingMessage
> extends event.EventEmitter<{
  open: [];
  close: [];
  message: [TIncomingMessage];
  error: [Event | ErrorEvent];
}> {
  constructor(
    private socket: WebSocket,
    private parse: (message: string) => TIncomingMessage,
    private stringify: (message: TOutgoingMessage) => string
  ) {
    super();
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("close", this.handleClose);
    this.socket.addEventListener("error", this.handleError);
    this.socket.addEventListener("message", this.handleMessage);
  }

  protected handleOpen(): void {
    this.emit("open");
  }

  protected handleClose() {
    this.emit("close");
  }

  protected handleError(error: Event | ErrorEvent) {
    this.emit("error", error);
  }

  protected handleMessage(event: MessageEvent) {
    const message = this.parse(event.data.toString());
    console.log("<", message);
    this.emit("message", message);
  }

  public send(message: TOutgoingMessage): void {
    console.log(">", message);
    this.socket.send(this.stringify(message));
  }

  public close(): void {
    this.socket.close();
  }

  public detach(): void {
    this.socket.removeEventListener("open", this.handleOpen);
    this.socket.removeEventListener("close", this.handleClose);
    this.socket.removeEventListener("error", this.handleError);
    this.socket.removeEventListener("message", this.handleMessage);
  }
}
