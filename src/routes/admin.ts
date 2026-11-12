import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import {
  deleteUserById,
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  setSectionAccess,
} from "../models/user";
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

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

/**
 * POST /admin/api/users  { email, password, userName? } - a new account, no section open
 * (same as `npm run create-user`).
 */
export async function adminCreateUser(req: Request, res: Response) {
  const { email, password, userName } = req.body ?? {};
  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return res.status(400).json({ message: "Укажите email" });
  }
  if (typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ message: "Укажите пароль" });
  }
  if (userName !== undefined && userName !== null && typeof userName !== "string") {
    return res.status(400).json({ message: "Имя должно быть строкой" });
  }

  const normalizedEmail = email.trim(); // login matches email exactly
  try {
    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ message: "Такой email уже есть" });
    }
    const id = crypto.randomUUID();
    await insertUser({
      id,
      email: normalizedEmail,
      // the app trims the password on login, so it is stored trimmed too
      password: password.trim(),
      user_name: userName?.trim() || normalizedEmail.split("@")[0],
      avatar: DEFAULT_AVATAR,
      open_categories: [],
      purchased_stages: [],
      created_at: new Date().toISOString(),
    });
    const created = await findUserById(id);
    res.status(201).json({ user: adminUser(created as User) });
  } catch (error) {
    console.error("Failed to create user", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** DELETE /admin/api/users/:id - removes the account (and its payment records). Not super admins. */
export async function adminDeleteUser(req: Request, res: Response) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (isSuperAdminEmail(user.email)) {
      return res.status(400).json({ message: "Суперадмина удалить нельзя" });
    }
    await deleteUserById(user.id);
    res.json({ deleted: user.id });
  } catch (error) {
    console.error("Failed to delete user", error);
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
