import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

import pool from "../config/db.js";

type ProfilePinRow = {
  id: string;
  branch_id: string;
  role: string;
  is_active: boolean;
  pin_hash: string | null;
};

function errorResponse(message: string) {
  return { error: true, message };
}

function getStringField(body: unknown, fieldName: string): string | null {
  if (!body || typeof body !== "object" || !(fieldName in body)) {
    return null;
  }

  const value = (body as Record<string, unknown>)[fieldName];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export async function verifyPin(req: Request, res: Response) {
  const profileId = getStringField(req.body, "profileId");
  const pin = getStringField(req.body, "pin");

  if (!profileId || !pin) {
    return res.status(400).json(errorResponse("profileId and pin are required."));
  }

  try {
    const { rows } = await pool.query<ProfilePinRow>(
      `
        SELECT id, branch_id, role, is_active, pin_hash
        FROM public.profiles
        WHERE id = $1
        LIMIT 1
      `,
      [profileId],
    );

    const profile = rows[0];

    if (!profile || !profile.pin_hash) {
      return res.status(401).json(errorResponse("Invalid profile or PIN."));
    }

    if (!profile.is_active) {
      return res.status(403).json(errorResponse("Profile is not active."));
    }

    const isValidPin = await bcrypt.compare(pin, profile.pin_hash);

    if (!isValidPin) {
      return res.status(401).json(errorResponse("Invalid profile or PIN."));
    }

    return res.json({
      message: "Profile PIN verified.",
      profileSession: {
        profileId: profile.id,
        branchId: profile.branch_id,
        role: profile.role,
      },
    });
  } catch (error) {
    console.error("Failed to verify profile PIN", error);
    return res.status(500).json(errorResponse("Unable to verify profile PIN."));
  }
}
