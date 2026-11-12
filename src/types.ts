import { SectionAccess } from "./sections";

export interface User {
  id: string;
  email: string;
  password: string;
  user_name: string | null;
  avatar: string | null;
  open_categories: number[];
  purchased_stages: number[];
  /** which app sections are open for the user (src/sections.ts) */
  section_access: SectionAccess;
  created_at: string;
}
