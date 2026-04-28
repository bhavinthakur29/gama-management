import type { NextFunction, Request, Response } from "express";

import { supabase, supabaseAdmin } from "../config/supabase.js";

export type ProfileRole = string;

export type Profile = {
  id: string;
  branch_id: string;
  role: ProfileRole;
  is_active: boolean;
};

type AuthenticatedUser = {
  id: string;
  email?: string;
  branch_id: string;
  role: string;
  profile?: Profile;
};

type RefreshedSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email?: string;
      };
      profile?: Profile;
      user?: AuthenticatedUser;
      branch_id?: string;
      role?: string;
      refreshedSession?: RefreshedSession;
    }
  }
}

function errorResponse(message: string) {
  return { error: true, message };
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function getRefreshToken(req: Request): string | null {
  const headerToken = req.header("x-refresh-token");
  const bodyToken = typeof req.body?.refresh_token === "string" ? req.body.refresh_token : null;
  const refreshToken = headerToken ?? bodyToken;

  return refreshToken?.trim() || null;
}

function getJwtExpiry(token: string): number | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsedPayload = JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as {
      exp?: unknown;
    };

    return typeof parsedPayload.exp === "number" ? parsedPayload.exp : null;
  } catch {
    return null;
  }
}

function isTokenNearExpiration(token: string) {
  const expiresAt = getJwtExpiry(token);

  if (!expiresAt) {
    return false;
  }

  const refreshWindowSeconds = 5 * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt - nowSeconds <= refreshWindowSeconds;
}

function getSingleHeader(req: Request, headerName: string): string | null {
  const headerValue = req.header(headerName);

  if (!headerValue) {
    return null;
  }

  const trimmedValue = headerValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isConfiguredSuperAdminEmail(email?: string) {
  const configuredEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (!configuredEmail || !email) {
    return false;
  }

  return email.trim().toLowerCase() === configuredEmail;
}

async function getProfile(profileId: string, email?: string): Promise<Profile | null> {
  const configuredSuperAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const normalizedEmail = email?.trim().toLowerCase();

  if (configuredSuperAdminEmail && normalizedEmail === configuredSuperAdminEmail) {
    return {
      id: profileId,
      branch_id: "0",
      role: "super-admin",
      is_active: true,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("instructors")
    .select("auth_id, branch_id, is_active")
    .eq("auth_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.auth_id,
    branch_id: String(data.branch_id),
    role: "instructor",
    is_active: data.is_active,
  };
}

export async function verifyBranch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let token = getBearerToken(req);

  if (!token) {
    return res.status(401).json(errorResponse("Missing bearer token."));
  }

  try {
    if (isTokenNearExpiration(token)) {
      const refreshToken = getRefreshToken(req);

      if (refreshToken) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshedData.session) {
          token = refreshedData.session.access_token;
          req.refreshedSession = {
            access_token: refreshedData.session.access_token,
            refresh_token: refreshedData.session.refresh_token,
            expires_at: refreshedData.session.expires_at,
          };
          res.setHeader("x-access-token", refreshedData.session.access_token);
          res.setHeader("x-refresh-token", refreshedData.session.refresh_token);
        }
      }
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json(errorResponse("Invalid or expired Supabase token."));
    }

    const authProfile = await getProfile(data.user.id, data.user.email);

    if (!authProfile) {
      return res.status(403).json(errorResponse("Authenticated user profile was not found."));
    }

    req.auth = {
      userId: data.user.id,
      email: data.user.email,
    };
    req.user = {
      id: data.user.id,
      email: data.user.email,
      branch_id: authProfile.branch_id,
      role: authProfile.role,
    };
    req.branch_id = authProfile.branch_id;
    req.role = authProfile.role;

    return next();
  } catch (error) {
    console.error("Failed to authenticate Supabase user", error);
    return res.status(500).json(errorResponse("Unable to authenticate user."));
  }
}

export const authenticate = verifyBranch;

export async function verifySuperAdmin(
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
      return res.status(401).json(errorResponse("Invalid or expired Supabase token."));
    }

    const authProfile = await getProfile(data.user.id, data.user.email);
    const requesterEmail = data.user.email;
    const requesterRole = authProfile?.role;

    if (requesterRole !== "super-admin" && !isConfiguredSuperAdminEmail(requesterEmail)) {
      return res.status(403).json(errorResponse("Super admin access is required."));
    }

    req.auth = {
      userId: data.user.id,
      email: requesterEmail,
    };
    req.user = {
      id: data.user.id,
      email: requesterEmail,
      branch_id: authProfile?.branch_id ?? "",
      role: requesterRole ?? "super-admin",
      ...(authProfile ? { profile: authProfile } : {}),
    };
    req.branch_id = authProfile?.branch_id;
    req.role = requesterRole ?? "super-admin";

    return next();
  } catch (error) {
    console.error("Failed to verify super admin", error);
    return res.status(500).json(errorResponse("Unable to verify super admin access."));
  }
}

export async function requireProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const profileId = getSingleHeader(req, "x-profile-id");

  if (!req.user) {
    return res.status(401).json(errorResponse("Academy session must be authenticated first."));
  }

  if (!profileId) {
    return res.status(400).json(errorResponse("x-profile-id header is required."));
  }

  try {
    const profile = await getProfile(profileId);

    if (!profile) {
      return res.status(404).json(errorResponse("Profile was not found."));
    }

    if (!profile.is_active) {
      return res.status(403).json(errorResponse("Profile is not active."));
    }

    if (profile.branch_id !== req.user.branch_id) {
      return res.status(403).json(errorResponse("Profile belongs to a different branch."));
    }

    req.profile = profile;
    req.user = {
      ...req.user,
      profile,
    };

    return next();
  } catch (error) {
    console.error("Failed to require active profile", error);
    return res.status(500).json(errorResponse("Unable to verify profile."));
  }
}

export const verifyBranchAccountJwt = verifyBranch;
export const verifyProfilePin = () => requireProfile;
