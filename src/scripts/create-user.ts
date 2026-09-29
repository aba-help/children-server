// Create an app account (every logged-in user has full access; payments are off).
// Usage: npm run create-user -- <email> <password> [name]
// Uses DATABASE_URL from the environment / .env.
import "dotenv/config";
import crypto from "crypto";
import { db, initDb } from "../db";
import { findUserByEmail, insertUser } from "../models/user";

async function main() {
	const [email, password, ...nameParts] = process.argv.slice(2);
	if (!email || !password) {
		console.error("Usage: npm run create-user -- <email> <password> [name]");
		process.exit(1);
	}

	await initDb();

	const normalizedEmail = email.trim(); // login matches email exactly
	if (await findUserByEmail(normalizedEmail)) {
		console.error(`User ${normalizedEmail} already exists`);
		process.exit(1);
	}

	await insertUser({
		id: crypto.randomUUID(),
		email: normalizedEmail,
		password,
		user_name: nameParts.join(" ") || normalizedEmail.split("@")[0],
		avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
		open_categories: [],
		purchased_stages: [],
		created_at: new Date().toISOString(),
	});

	console.log(`Created ${normalizedEmail}`);
}

main()
	.catch((error) => {
		console.error("Failed to create user:", error);
		process.exitCode = 1;
	})
	.finally(() => db.end());
