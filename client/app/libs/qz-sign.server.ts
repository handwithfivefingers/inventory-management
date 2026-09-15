import { createSign } from "node:crypto";

/**
 * Server-only QZ Tray request signer (`.server.ts` keeps it out of the
 * browser bundle — the private key must never reach the client).
 *
 * Protocol (per QZ `assets/signing/sign-message.node.js`):
 *   signature = Base64( RSA-SHA512( privateKey, toSign ) )
 * where `toSign` is the hashed request string handed to
 * `qz.security.setSignaturePromise`. QZ Tray verifies it against the
 * trusted certificate (`public/qz-cert.crt`) with `SHA512`.
 */

export const readQzPrivateKey = (): string => {
  const raw = process.env.QZ_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "QZ_SIGNING_UNCONFIGURED: set QZ_PRIVATE_KEY in client/.env (PEM with \\n escapes).",
    );
  }
  return raw.replace(/\\n/g, "\n");
};

export const signQzRequest = (toSign: string, privateKeyPem?: string): string => {
  if (!toSign || typeof toSign !== "string") {
    throw new Error("QZ_SIGNING_BAD_REQUEST: toSign must be a non-empty string.");
  }
  const sign = createSign("SHA512");
  sign.update(toSign);
  sign.end();
  return sign.sign(privateKeyPem ?? readQzPrivateKey(), "base64");
};
