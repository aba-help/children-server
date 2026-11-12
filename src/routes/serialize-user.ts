import { SECTIONS, SectionAccess } from "../sections";
import { User } from "../types";

const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export const isSuperAdminEmail = (email: string) => superAdminEmails.includes(email);

export function serializeUser(user: User) {
  const isSuperAdmin = isSuperAdminEmail(user.email);
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    userName: user.user_name,
    avatar: user.avatar,
    openCategories: user.open_categories,
    purchasedStages: user.purchased_stages,
    // super admins see every section
    sectionAccess: isSuperAdmin
      ? (Object.fromEntries(SECTIONS.map(({ id }) => [id, true])) as SectionAccess)
      : user.section_access,
    createdAt: user.created_at,
    isSuperAdmin
  };
}
