import { make, TypeOf, Schema } from "./schema.ts";
import { userAction } from "./user-action.ts";

export const initMessage = make((S) =>
  S.struct({
    type: S.literal("init"),
    name: S.string,
  })
);
export type InitMessage = TypeOf<typeof initMessage>;

export const userActionMessage = make((S) =>
  S.struct({
    type: S.literal("user-action"),
    id: S.string,
    action: userAction(S),
  })
);
export type UserActionMessage = TypeOf<typeof userActionMessage>;

export const clientMessage = make((S) =>
  S.union(initMessage(S), userActionMessage(S))
);
export type ClientMessage = TypeOf<typeof clientMessage>;
