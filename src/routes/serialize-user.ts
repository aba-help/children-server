import { User } from "../types";

const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export function serializeUser(user: User) {
  const isSuperAdmin = superAdminEmails.includes(user.email);
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    userName: user.user_name,
    avatar: user.avatar,
    openCategories: user.open_categories,
    purchasedStages: user.purchased_stages,
    createdAt: user.created_at,
    isSuperAdmin
  };
}
