import crypto from "crypto";
import { Request, Response } from "express";
import { JWT_SECRET } from "../config/jwt";
import { adminRecipients, mailConfigured, sendAdminMail } from "../mail";
import {
  deleteAccessRequest,
  insertAccessRequest,
  listAccessRequests,
  setAccessRequestMailError,
  setAccessRequestStatus,
} from "../models/access-request";
import { SECTIONS, isSectionId } from "../sections";

/**
 * «ПОЛУЧИТЬ ДОСТУП» (client, 2026-11-16): name, e-mail, optional phone -> stored in
 * access_requests and mailed to the admin with the section and the app language.
 *
 * Spam protection without Google: the form asks a small sum (GET /access-requests/challenge);
 * the answer is checked against a signed token that expires in 30 minutes and cannot be sent
 * sooner than 3 s after it was issued (bots post at once). Plus a hidden "website" field that
 * people leave empty and a limit of 5 requests per hour per IP.
 */

const CHALLENGE_TTL_MS = 30 * 60 * 1000;
const MIN_FILL_MS = 3000;
const sign = (value: string) => crypto.createHmac("sha256", JWT_SECRET).update(value).digest("base64url");

export function accessRequestChallenge(_req: Request, res: Response) {
  const a = crypto.randomInt(2, 10);
  const b = crypto.randomInt(1, 10);
  const issued = Date.now();
  const nonce = crypto.randomBytes(8).toString("base64url");
  const payload = `${issued}.${nonce}`;
  res.json({ question: `${a} + ${b}`, token: `${payload}.${sign(`${payload}.${a + b}`)}` });
}

// tokens already used, so one solved sum cannot be replayed (kept until they expire)
const usedTokens = new Map<string, number>();

const checkChallenge = (token: unknown, answer: unknown): string | null => {
  if (typeof token !== "string" || !/^\d+\.[\w-]+\.[\w-]+$/.test(token)) return "challenge";
  const [issued, nonce, signature] = token.split(".");
  const age = Date.now() - Number(issued);
  if (age > CHALLENGE_TTL_MS) return "challenge_expired";
  if (age < MIN_FILL_MS) return "too_fast";
  const expected = Buffer.from(sign(`${issued}.${nonce}.${String(answer ?? "").trim()}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return "wrong_answer";
  if (usedTokens.has(token)) return "challenge_expired";
  usedTokens.set(token, Date.now() + CHALLENGE_TTL_MS);
  return null;
};

const recentByIp = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const rateLimited = (ip: string) => {
  const now = Date.now();
  const times = (recentByIp.get(ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  recentByIp.set(ip, times);
  return times.length >= RATE_LIMIT;
};

const cleanUp = () => {
  const now = Date.now();
  for (const [token, until] of usedTokens) if (until < now) usedTokens.delete(token);
  for (const [ip, times] of recentByIp)
    if (!times.some((time) => now - time < RATE_WINDOW_MS)) recentByIp.delete(ip);
};
setInterval(cleanUp, 10 * 60 * 1000).unref();

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s()-]{5,25}$/;

const clientIp = (req: Request) =>
  String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket.remoteAddress || "";

export async function createAccessRequest(req: Request, res: Response) {
  const body = req.body ?? {};
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const section = String(body.section ?? "");
  const lang = body.lang === "en" ? "en" : "ru";

  // the hidden field: a bot filled it, pretend all is well
  if (body.website) return res.status(201).json({ ok: true });

  if (!name || name.length > 100) return res.status(400).json({ code: "name" });
  if (!EMAIL_RE.test(email) || email.length > 200) return res.status(400).json({ code: "email" });
  if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ code: "phone" });
  if (!isSectionId(section)) return res.status(400).json({ code: "section" });

  const challengeError = checkChallenge(body.token, body.answer);
  if (challengeError) return res.status(400).json({ code: challengeError });

  const ip = clientIp(req);
  if (rateLimited(ip)) return res.status(429).json({ code: "rate_limit" });
  recentByIp.get(ip)!.push(Date.now());

  try {
    const request = await insertAccessRequest({ name, email, phone: phone || null, section, lang }, ip);
    res.status(201).json({ ok: true });

    // the mail does not hold up the answer; a failure is kept and shown on the admin page
    const sectionTitle = SECTIONS.find((item) => item.id === section)?.title ?? section;
    sendAdminMail({
      subject: `АВАша: заявка на доступ - ${sectionTitle}`,
      replyTo: email,
      text: [
        "Новая заявка на доступ из приложения АВАша.",
        "",
        `Имя: ${name}`,
        `E-mail: ${email}`,
        `Телефон: ${phone || "не указан"}`,
        `Раздел: ${sectionTitle}`,
        `Язык приложения: ${lang === "en" ? "английский" : "русский"}`,
        "",
        "Все заявки: https://children-server-767y.onrender.com/admin",
      ].join("\n"),
    })
      .then((sent) => setAccessRequestMailError(request.id, sent ? null : "mail is not set up"))
      .catch((error) => {
        console.error("Failed to mail access request", error);
        return setAccessRequestMailError(request.id, String(error?.message ?? error).slice(0, 300));
      })
      .catch(() => {});
  } catch (error) {
    console.error("Failed to store access request", error);
    res.status(500).json({ code: "server" });
  }
}

export async function adminListAccessRequests(_req: Request, res: Response) {
  try {
    const requests = await listAccessRequests();
    res.json({
      mail: { configured: mailConfigured(), recipients: adminRecipients() },
      requests: requests.map((request) => ({
        id: request.id,
        name: request.name,
        email: request.email,
        phone: request.phone,
        section: request.section,
        lang: request.lang,
        status: request.status,
        mailError: request.mail_error,
        createdAt: request.created_at,
      })),
    });
  } catch (error) {
    console.error("Failed to list access requests", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function adminSetAccessRequestStatus(req: Request, res: Response) {
  const status = req.body?.status;
  if (status !== "new" && status !== "done") return res.status(400).json({ message: "Bad status" });
  if (!(await setAccessRequestStatus(req.params.id, status))) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
}

export async function adminDeleteAccessRequest(req: Request, res: Response) {
  if (!(await deleteAccessRequest(req.params.id))) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
}
