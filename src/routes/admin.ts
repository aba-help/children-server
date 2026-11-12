import { NextFunction, Request, Response } from "express";
import { listUsers, setSectionAccess } from "../models/user";
import { SECTIONS, SectionId, isSectionId } from "../sections";
import { User } from "../types";
import { ADMIN_PAGE } from "./admin-page";
import { isSuperAdminEmail } from "./serialize-user";

/**
 * Admin page (client, 2026-11-12): the admin opens / closes app sections for each user.
 * GET /admin is the page; it signs in with POST /login and calls the /admin/api routes, which
 * are for super admins only (SUPER_ADMIN_EMAILS).
 */

/** After `auth`: lets only super admins through. */
export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  if (!user || !isSuperAdminEmail(user.email)) {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
}

export function adminPage(_req: Request, res: Response) {
  res.type("html").send(ADMIN_PAGE);
}

export async function adminSections(_req: Request, res: Response) {
  res.json({ sections: SECTIONS.map(({ id, title }) => ({ id, title })) });
}

const adminUser = (user: User) => ({
  id: user.id,
  email: user.email,
  userName: user.user_name,
  createdAt: user.created_at,
  isSuperAdmin: isSuperAdminEmail(user.email),
  sectionAccess: user.section_access,
});

export async function adminListUsers(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    res.json({ users: users.map(adminUser) });
  } catch (error) {
    console.error("Failed to list users", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** PATCH /admin/api/users/:id/access  { sectionAccess: { hearing: true, makatop: false } } */
export async function adminSetAccess(req: Request, res: Response) {
  const access = req.body?.sectionAccess;
  if (!access || typeof access !== "object" || Array.isArray(access)) {
    return res.status(400).json({ message: "sectionAccess object required" });
  }
  const changes: Partial<Record<SectionId, boolean>> = {};
  for (const [key, value] of Object.entries(access)) {
    if (!isSectionId(key) || typeof value !== "boolean") {
      return res.status(400).json({ message: `Bad section or value: ${key}` });
    }
    changes[key] = value;
  }

  try {
    const updated = await setSectionAccess(req.params.id, changes);
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: adminUser(updated) });
  } catch (error) {
    console.error("Failed to set section access", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
