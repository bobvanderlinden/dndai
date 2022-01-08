import { make, TypeOf } from "./schema.ts";
import { event } from "./event.ts";

const userActionResultMessage = make((schema) =>
  schema.struct({
    type: schema.literal("user-action-result"),
    id: schema.string,
    result: schema.union(
      schema.literal("accepted"),
      schema.literal("rejected")
    ),
  })
);
export type UserActionResultMessage = TypeOf<typeof userActionResultMessage>;

const workingMessage = make((schema) =>
  schema.struct({
    type: schema.literal("working"),
  })
);
export type WorkingMessage = TypeOf<typeof workingMessage>;

export const eventMessage = make((schema) =>
  schema.struct({
    type: schema.literal("event"),
    event: event(schema),
  })
);
export type EventMessage = TypeOf<typeof eventMessage>;

export const serverMessage = make((schema) =>
  schema.union(
    userActionResultMessage(schema),
    workingMessage(schema),
    eventMessage(schema)
  )
);
export type ServerMessage = TypeOf<typeof serverMessage>;
