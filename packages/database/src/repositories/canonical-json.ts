import { createHash } from 'node:crypto';

/** A UTF-16 string with no lone surrogate: such a string has no UTF-8 encoding to digest. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
/* ------------------------------------------------------------------------------------------------
 * Canonical JSON and its digest (implement/04 §6.1 step 1-2, implement/08 §4.2)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Serializes a value to its canonical JSON form (RFC 8785 / JCS restricted to I-JSON values).
 *
 * This is the byte contract every durable digest of this platform is computed over: object members
 * are sorted by UTF-16 code unit and emitted without insignificant whitespace, arrays keep their
 * order, strings are escaped minimally and digested as UTF-8, and numbers are rendered by the
 * ECMAScript number-to-string algorithm RFC 8785 specifies. A value JSON cannot represent is
 * refused instead of being converted - an `undefined` member or a `Date` would otherwise change
 * the hashed bytes without the caller noticing, and two writers could then claim to have hashed the
 * same payload while hashing different bytes.
 *
 * The implementation is local because `packages/database` is a leaf of the package DAG
 * (implement/02 §2) and may not import `@agentos/core-engine`; it is byte-compatible with
 * `durability/canonical-json.ts`, which is the same restriction viewed from the other side.
 *
 * @param value Value to canonicalize; only JSON-representable data is accepted.
 * @returns The canonical JSON text; UTF-8 encode it before digesting.
 * @throws Error `CANONICAL_JSON_INVALID` when the value has no canonical form; the message names
 *   the offending path.
 */
export function canonicalizeJson(value: unknown): string {
  return serializeCanonical(value, '$');
}

/**
 * Digests a value with SHA-256 over its canonical JSON form (§04 §6.1 step 1-2, §08 §4.2).
 *
 * This is the digest an approval is bound to: the console shows it, the operator reviews the
 * payload it was computed from, and `claimApprovalAndResume()` recomputes it while the row is
 * locked. It is exported so all three compute one digest rather than three.
 *
 * @param value Value to canonicalize and digest.
 * @returns 64 lower-case hexadecimal characters.
 * @throws Error `CANONICAL_JSON_INVALID` when the value is not canonicalizable.
 */
export function sha256CanonicalJson(value: unknown): string {
  return createHash('sha256').update(canonicalizeJson(value), 'utf8').digest('hex');
}

/**
 * Serializes one node, carrying the path of the current node for diagnostics.
 *
 * @param value Node to serialize.
 * @param path JSON-pointer-like location used in the refusal message.
 * @returns Canonical JSON text for the node.
 * @throws Error `CANONICAL_JSON_INVALID` for any non-representable value.
 */
function serializeCanonical(value: unknown, path: string): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        throw new Error(
          `CANONICAL_JSON_INVALID: ${path} is the non-finite number ${String(value)}, which JSON ` +
            'cannot represent and a digest must not silently convert (NFR-002).',
        );
      }

      return JSON.stringify(value);
    case 'string':
      assertWellFormedUnicode(value, path);

      return JSON.stringify(value);
    case 'object':
      return Array.isArray(value)
        ? serializeCanonicalArray(value, path)
        : serializeCanonicalObject(value, path);
    default:
      throw new Error(
        `CANONICAL_JSON_INVALID: ${path} is a ${typeof value} value, which has no canonical JSON ` +
          'form; dropping the member would change the hashed bytes without the caller noticing ' +
          '(implement/04 §6.1).',
      );
  }
}

/**
 * Serializes an array in source order. A sparse hole is a rejection, not a `null`: the hole has no
 * value to hash, and `JSON.stringify` would silently write one.
 */
function serializeCanonicalArray(items: readonly unknown[], path: string): string {
  const parts: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    parts.push(serializeCanonical(items[index], `${path}[${index}]`));
  }

  return `[${parts.join(',')}]`;
}

/** Serializes a plain object with members sorted by UTF-16 code unit (never by locale). */
function serializeCanonicalObject(record: object, path: string): string {
  const prototype: unknown = Object.getPrototypeOf(record);

  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(
      `CANONICAL_JSON_INVALID: ${path} is a ${describePrototype(prototype as object)}; only plain ` +
        'objects are canonical JSON, because a class instance carries state a digest would have to ' +
        'guess how to render (implement/04 §6.1).',
    );
  }

  const members = record as Record<string, unknown>;
  const parts = Object.keys(members)
    .sort()
    .map((key) => {
      assertWellFormedUnicode(key, `${path}.${key}`);

      return `${JSON.stringify(key)}:${serializeCanonical(members[key], `${path}.${key}`)}`;
    });

  return `{${parts.join(',')}}`;
}

/**
 * Names a non-plain object's prototype for a refusal message.
 *
 * @param prototype Prototype of the rejected object.
 * @returns A readable type name such as `Date instance`, or a generic description.
 */
function describePrototype(prototype: object): string {
  if ('constructor' in prototype) {
    const { constructor } = prototype as { constructor?: unknown };

    if (typeof constructor === 'function' && constructor.name.length > 0) {
      return `${constructor.name} instance`;
    }
  }

  return 'non-plain object';
}

/**
 * Ensures a string is valid Unicode.
 *
 * A lone surrogate has no UTF-8 encoding, so it would otherwise be replaced and hashed as U+FFFD -
 * a silent conversion that hides an upstream encoding bug behind a digest that nobody can
 * reproduce.
 */
function assertWellFormedUnicode(value: string, path: string): void {
  if (LONE_SURROGATE.test(value)) {
    throw new Error(
      `CANONICAL_JSON_INVALID: ${path} contains a lone surrogate, which has no UTF-8 encoding; ` +
        'refusing to hash a replacement character in its place (implement/04 §6.1).',
    );
  }
}
