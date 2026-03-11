/**
 * In-memory store for OTP lockout and resend cooldown (Kabariya spec).
 * Uses Redis key pattern; fallback to Map when Redis not configured.
 */

const OTP_LOCKOUT_MINUTES = 15;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const lockout = new Map();   // phone -> expiry timestamp
const cooldown = new Map();  // phone -> expiry timestamp
const attempts = new Map();  // phone -> number of failed attempts

function getLockout(phone) {
  const exp = lockout.get(phone);
  if (!exp) return null;
  if (Date.now() > exp) {
    lockout.delete(phone);
    attempts.delete(phone);
    return null;
  }
  return new Date(exp);
}

function getCooldown(phone) {
  const exp = cooldown.get(phone);
  if (!exp) return null;
  if (Date.now() > exp) {
    cooldown.delete(phone);
    return null;
  }
  return Math.ceil((exp - Date.now()) / 1000);
}

function setCooldown(phone) {
  cooldown.set(phone, Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

function recordFailedAttempt(phone) {
  const n = (attempts.get(phone) || 0) + 1;
  attempts.set(phone, n);
  if (n >= OTP_MAX_ATTEMPTS) {
    lockout.set(phone, Date.now() + OTP_LOCKOUT_MINUTES * 60 * 1000);
  }
  return n;
}

function clearAttempts(phone) {
  attempts.delete(phone);
}

function clearLockout(phone) {
  lockout.delete(phone);
  attempts.delete(phone);
}

function getAttemptsLeft(phone) {
  const n = attempts.get(phone) || 0;
  return Math.max(0, OTP_MAX_ATTEMPTS - n);
}

module.exports = {
  getLockout,
  getCooldown,
  setCooldown,
  recordFailedAttempt,
  clearAttempts,
  clearLockout,
  getAttemptsLeft,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
};
