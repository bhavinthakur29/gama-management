import type { NextFunction, Request, Response } from "express";

import { supabase, supabaseAdmin } from "../config/supabase.js";

type UserProfile = {
  branch_id: string;
  role: string;
};

function errorResponse(message: string) {
  return { error: true, message };
}

declare global {
  namespace Express {
    interface Request {
      branch_id?: string;
      role?: string;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json(errorResponse("Missing bearer token."));
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json(errorResponse("Invalid or expired token."));
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("branch_id, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return res.status(403).json(errorResponse("Academy profile was not found."));
    }

    const { branch_id, role } = profile as UserProfile;

    req.user = {
      id: data.user.id,
      email: data.user.email,
      branch_id,
      role,
    };
    req.branch_id = branch_id;
    req.role = role;

    return next();
  } catch (error) {
    console.error("Failed to authenticate request", error);
    return res.status(500).json(errorResponse("Unable to authenticate request."));
  }
}

export default authMiddleware;
