import { Request, Response } from "express";
import { UpdateUserFields, updateUserById } from "../models/user";
import { User } from "../types";
import { serializeUser } from "./serialize-user";

export async function updateUser(req: Request, res: Response) {
  const currentUser = (req as any).user as User | undefined;
  if (!currentUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // only the name and the avatar are the user's own; access (sections, purchases) is set by the
  // admin page or the payment callback. openCategories / purchasedStages from older app versions
  // are ignored, so a user can't open paid content for themselves.
  const { userName, avatar } = req.body ?? {};
  const updates: UpdateUserFields = {};

  if (userName !== undefined) {
    if (userName !== null && typeof userName !== "string") {
      return res.status(400).json({ message: "userName must be a string or null" });
    }
    updates.user_name = userName;
  }

  if (avatar !== undefined) {
    if (avatar !== null && typeof avatar !== "string") {
      return res.status(400).json({ message: "avatar must be a string or null" });
    }
    updates.avatar = avatar;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updateable fields provided" });
  }

  try {
    const updated = await updateUserById(currentUser.id, updates);
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    (req as any).user = updated;

    res.json({
      message: "User updated",
      user: serializeUser(updated)
    });
  } catch (error) {
    console.error("Failed to update user", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
