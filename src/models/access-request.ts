import crypto from "crypto";
import { db } from "../db";

/**
 * Access requests from the app's «ПОЛУЧИТЬ ДОСТУП» form (client, 2026-11-16). A separate table:
 * these are not users, the admin contacts them and creates an account if needed.
 */
export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  section: string;
  lang: string;
  status: "new" | "done";
  mail_error: string | null;
  created_at: Date;
};

export async function insertAccessRequest(
  request: Pick<AccessRequest, "name" | "email" | "phone" | "section" | "lang">,
  ip: string
): Promise<AccessRequest> {
  const { rows } = await db.query<AccessRequest>(
    `INSERT INTO access_requests (id, name, email, phone, section, lang, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [crypto.randomUUID(), request.name, request.email, request.phone, request.section, request.lang, ip]
  );
  return rows[0];
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  const { rows } = await db.query<AccessRequest>(
    `SELECT id, name, email, phone, section, lang, status, mail_error, created_at
     FROM access_requests ORDER BY created_at DESC LIMIT 500`
  );
  return rows;
}

export async function setAccessRequestStatus(id: string, status: "new" | "done") {
  const { rowCount } = await db.query(`UPDATE access_requests SET status = $2 WHERE id = $1`, [id, status]);
  return rowCount === 1;
}

export async function setAccessRequestMailError(id: string, error: string | null) {
  await db.query(`UPDATE access_requests SET mail_error = $2 WHERE id = $1`, [id, error]);
}

export async function deleteAccessRequest(id: string) {
  const { rowCount } = await db.query(`DELETE FROM access_requests WHERE id = $1`, [id]);
  return rowCount === 1;
}
