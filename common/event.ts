import { make, TypeOf } from "./schema.ts";
import { userAction } from "./user-action.ts";

export const storyEvent = make((schema) =>
  schema.struct({
    type: schema.literal("story"),
    text: schema.string,
  })
);
export type StoryEvent = TypeOf<typeof storyEvent>;

export const userJoinedEvent = make((schema) =>
  schema.struct({
    type: schema.literal("joined"),
    user: schema.string,
  })
);
export type UserJoinedEvent = TypeOf<typeof userJoinedEvent>;

export const userLeftEvent = make((schema) =>
  schema.struct({
    type: schema.literal("left"),
    user: schema.string,
  })
);
export type UserLeftEvent = TypeOf<typeof userLeftEvent>;

export const userActionEvent = make((schema) =>
  schema.struct({
    type: schema.literal("user-action"),
    user: schema.string,
    action: userAction(schema),
  })
);
export type UserActionEvent = TypeOf<typeof userActionEvent>;

export const event = make((schema) =>
  schema.union(
    storyEvent(schema),
    userJoinedEvent(schema),
    userLeftEvent(schema),
    userActionEvent(schema)
  )
);
export type Event = TypeOf<typeof event>;
