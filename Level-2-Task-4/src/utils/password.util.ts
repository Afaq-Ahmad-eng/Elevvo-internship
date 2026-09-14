import bcrypt from "bcrypt";

// Number of bcrypt "rounds" — controls how computationally expensive
// hashing is. Higher = slower = harder to brute-force, but slower logins.
// 10-12 is a common production baseline as of 2026.
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Hashes a plain-text password before storing it.
 * NEVER store plain-text passwords, ever, under any circumstance.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain-text password (from a login attempt) against
 * the stored hash. Returns true only if they match.
 * bcrypt handles the salt internally — we never need to store it separately.
 */
export async function comparePassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
