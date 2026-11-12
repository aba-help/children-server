import { query } from "../db";
import { SECTIONS, SectionAccess, SectionId } from "../sections";
import { User } from "../types";

interface UserRow {
  id: string;
  email: string;
  password: string;
  user_name: string | null;
  avatar: string | null;
  open_categories: (number | string)[] | null;
  purchased_stages: (number | string)[] | null;
  created_at: string;
  // plus one boolean access_<section> column per section (src/sections.ts)
  [column: string]: unknown;
}

function mapUser(row: UserRow): User {
  const toNumberArray = (value: (number | string)[] | null): number[] => {
    if (!value) return [];
    return value.map((item) => (typeof item === "number" ? item : Number(item)));
  };

  return {
    id: row.id,
    email: row.email,
    password: row.password,
    user_name: row.user_name,
    avatar: row.avatar,
    open_categories: toNumberArray(row.open_categories),
    purchased_stages: toNumberArray(row.purchased_stages),
    section_access: Object.fromEntries(
      SECTIONS.map(({ id, column }) => [id, row[column] === true])
    ) as SectionAccess,
    created_at: new Date(row.created_at).toISOString()
  };
}

export interface UpdateUserFields {
  user_name?: string | null;
  avatar?: string | null;
  open_categories?: number[];
  purchased_stages?: number[];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<UserRow>("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  if (result.rowCount === 0) return null;
  return mapUser(result.rows[0]);
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<UserRow>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  if (result.rowCount === 0) return null;
  return mapUser(result.rows[0]);
}

/** All users, newest first (the admin page). */
export async function listUsers(): Promise<User[]> {
  const result = await query<UserRow>("SELECT * FROM users ORDER BY created_at DESC");
  return result.rows.map(mapUser);
}

// new users get the column defaults: no section open
export async function insertUser(user: Omit<User, "section_access">): Promise<void> {
  await query(
    `
      INSERT INTO users (id, email, password, user_name, avatar, open_categories, purchased_stages, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      user.id,
      user.email,
      user.password,
      user.user_name,
      user.avatar,
      user.open_categories,
      user.purchased_stages,
      user.created_at
    ]
  );
}

export async function updateUserById(id: string, updates: UpdateUserFields): Promise<User | null> {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findUserById(id);
  }

  const assignments = entries.map(([field], index) => `${field} = $${index + 2}`);
  const values = entries.map(([, value]) => value);

  const result = await query<UserRow>(
    `UPDATE users SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  if (result.rowCount === 0) return null;
  return mapUser(result.rows[0]);
}

/** Opens / closes sections for a user; only the given sections change. */
export async function setSectionAccess(
  id: string,
  access: Partial<Record<SectionId, boolean>>
): Promise<User | null> {
  // column names come from SECTIONS, never from the request
  const entries = SECTIONS.filter(({ id: sectionId }) => typeof access[sectionId] === "boolean");
  if (entries.length === 0) {
    return findUserById(id);
  }

  const assignments = entries.map(({ column }, index) => `${column} = $${index + 2}`);
  const values = entries.map(({ id: sectionId }) => access[sectionId]);

  const result = await query<UserRow>(
    `UPDATE users SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  if (result.rowCount === 0) return null;
  return mapUser(result.rows[0]);
}

/** Deletes the user; their payment records go first (payments.user_id references users). */
export async function deleteUserById(id: string): Promise<void> {
  await query("DELETE FROM payments WHERE user_id = $1", [id]);
  await query("DELETE FROM users WHERE id = $1", [id]);
}
