import { Schemable, Codec } from "./schema.ts";

export const URI = "JSON";
export type URI = typeof URI;
declare module "./schema.ts" {
  interface URItoKind<A> {
    readonly [URI]: JsonCodec<A>;
  }
}

type JsonCodec<A> = Codec<A, string>;

function jsonCodec<T>(): JsonCodec<T> {
  return {
    encode: (value) => JSON.stringify(value),
    decode: (value) => JSON.parse(value),
  };
}

export const unsupported: any = () => {
  throw new Error("Unsupported operation");
};

export const schemable: Schemable<URI> = {
  literal: (...literals) => jsonCodec(),
  string: jsonCodec(),
  number: jsonCodec(),
  boolean: jsonCodec(),
  nullable: (_) => jsonCodec(),
  struct: (_) => jsonCodec(),
  partial: (_) => jsonCodec(),
  record: (_) => jsonCodec(),
  array: (_) => jsonCodec(),
  tuple: (...components) => jsonCodec(),
  intersect: (right) => (left) => jsonCodec(),
  sum: (key) => (properties) => jsonCodec(),
  lazy: (_) => jsonCodec(),
  readonly: (_) => jsonCodec(),
  union: (...members) => jsonCodec(),
};
