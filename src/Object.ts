/**
 * Drops any optional keys from an object. A key is considered optional if its
 * value may be `undefined` (even if the key is required).
 */
export type TakeRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

/**
 * Produces the type `true` if the object has no keys. Otherwise it produces the
 * type `false`.
 */
export type IsEmpty<T> = keyof T extends never ? true : false;

/**
 * Produces the type `true` if the object has at least one required key. A key
 * is considered optional if its value may be `undefined`. Otherwise it produces
 * the type `false`.
 */
export type HasRequiredKeys<T> =
  IsEmpty<TakeRequired<T>> extends true ? false : true;
