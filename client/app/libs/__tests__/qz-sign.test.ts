import { describe, it, expect, afterEach } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { readQzPrivateKey, signQzRequest } from "../qz-sign.server";

const makeKeyPair = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
};

const verifyQzSignature = (toSign: string, signatureB64: string, publicPem: string): boolean => {
  const verify = createVerify("SHA512");
  verify.update(toSign);
  verify.end();
  return verify.verify(publicPem, signatureB64, "base64");
};

describe("signQzRequest (QZ Tray SHA512 protocol)", () => {
  it("produces a base64 signature that verifies against the keypair", () => {
    const { privatePem, publicPem } = makeKeyPair();
    const toSign = '{"call":"printers.find","params":{},"timestamp":123}';
    const signature = signQzRequest(toSign, privatePem);
    expect(verifyQzSignature(toSign, signature, publicPem)).toBe(true);
  });

  it("fails verification when the payload is tampered", () => {
    const { privatePem, publicPem } = makeKeyPair();
    const signature = signQzRequest("original", privatePem);
    expect(verifyQzSignature("tampered", signature, publicPem)).toBe(false);
  });

  it("rejects empty payloads", () => {
    const { privatePem } = makeKeyPair();
    expect(() => signQzRequest("", privatePem)).toThrow("QZ_SIGNING_BAD_REQUEST");
  });
});

describe("readQzPrivateKey", () => {
  const saved = process.env.QZ_PRIVATE_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.QZ_PRIVATE_KEY;
    else process.env.QZ_PRIVATE_KEY = saved;
  });

  it("un-escapes \\n in env-stored PEM", () => {
    process.env.QZ_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----";
    expect(readQzPrivateKey()).toBe("-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----");
  });

  it("throws a clear error when unconfigured", () => {
    delete process.env.QZ_PRIVATE_KEY;
    expect(() => readQzPrivateKey()).toThrow("QZ_SIGNING_UNCONFIGURED");
  });
});
