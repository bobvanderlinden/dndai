import { make, TypeOf } from "./schema.ts";

export const doAction = make((S) =>
  S.struct({
    type: S.literal("do"),
    text: S.string,
  })
);
export const sayAction = make((S) =>
  S.struct({
    type: S.literal("say"),
    text: S.string,
  })
);
export const userAction = make((S) => S.union(doAction(S), sayAction(S)));

export type DoAction = TypeOf<typeof doAction>;
export type SayAction = TypeOf<typeof sayAction>;
export type UserAction = TypeOf<typeof userAction>;
