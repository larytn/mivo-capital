import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/jwt-secret";

export function createToken(payload: object) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}
