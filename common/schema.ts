// export interface URItoKind<A> {}
// export type URIS = keyof URItoKind<any>;
// export type Kind<URI, A> = URI extends URIS ? URItoKind<A>[URI] : any;

export type HKT<URI, A> = Codec<A, string>;

export type Literal = string | number | boolean | null;

export type Key = string | number | symbol;

export interface Schemable<S> {
  readonly literal: <A extends readonly [Literal, ...Array<Literal>]>(
    ...values: A
  ) => HKT<S, A[number]>;
  readonly string: HKT<S, string>;
  readonly number: HKT<S, number>;
  readonly boolean: HKT<S, boolean>;
  readonly nullable: <A>(or: HKT<S, A>) => HKT<S, null | A>;
  readonly struct: <A>(properties: { [K in keyof A]: HKT<S, A[K]> }) => HKT<
    S,
    { [K in keyof A]: A[K] }
  >;
  readonly partial: <A>(properties: { [K in keyof A]: HKT<S, A[K]> }) => HKT<
    S,
    Partial<{ [K in keyof A]: A[K] }>
  >;
  readonly record: <A>(codomain: HKT<S, A>) => HKT<S, Record<string, A>>;
  readonly array: <A>(item: HKT<S, A>) => HKT<S, Array<A>>;
  readonly tuple: <A extends ReadonlyArray<unknown>>(
    ...components: { [K in keyof A]: HKT<S, A[K]> }
  ) => HKT<S, A>;
  readonly intersect: <B>(
    right: HKT<S, B>
  ) => <A>(left: HKT<S, A>) => HKT<S, A & B>;
  readonly sum: <T extends Key>(
    tag: T
  ) => <A>(members: { [K in keyof A]: HKT<S, A[K] & Record<T, K>> }) => HKT<
    S,
    A[keyof A]
  >;
  readonly lazy: <A>(id: string, f: () => HKT<S, A>) => HKT<S, A>;
  readonly readonly: <A>(sa: HKT<S, A>) => HKT<S, Readonly<A>>;

  readonly union: <A extends readonly [unknown, ...Array<unknown>]>(
    ...members: { [K in keyof A]: HKT<S, A[K]> }
  ) => HKT<S, A[number]>;
}

export interface Schema<A> {
  <S>(S: Schemable<S>): HKT<S, A>;
}

export type TypeOf<S> = S extends Schema<infer A> ? A : never;

export function make<A>(schema: Schema<A>): Schema<A> {
  return memoize(schema);
}

export function memoize<A, B>(f: (a: A) => B): (a: A) => B {
  const cache = new Map();
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a);
      cache.set(a, b);
      return b;
    }
    return cache.get(a);
  };
}

export interface Encoder<O, A> {
  readonly encode: (value: A) => O;
}

export interface Decoder<I, A> {
  readonly decode: (i: I) => A;
}

export type Codec<A, O = A, I = O> = Encoder<O, A> & Decoder<I, A>;
