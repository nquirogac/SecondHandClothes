import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "../types";

export type LoginRequest =
  {
    provider: "firebase";
    action: "signIn" | "register" | "google";
    email?: string;
    password?: string;
    displayName?: string;
    turnstileToken?: string;
  };

export function firebaseUserToMarketplaceUser(user: FirebaseUser): User {
  const fallbackName = user.email?.split("@")[0] || "firebase_user";
  const username = (user.displayName || fallbackName).toLowerCase().replace(/\s+/g, "_");

  return {
    id: user.uid,
    username,
    email: user.email || `${fallbackName}@example.com`,
    avatar: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    bio: "Signed in through Firebase Authentication",
    stylePreference: ["Casual"],
    joinedDate: user.metadata.creationTime || new Date().toISOString(),
    rating: 5.0,
    passwordHash: "",
  };
}

export function buildMarketplaceHeaders(user: User | null): HeadersInit {
  if (!user) {
    return {};
  }

  return {
    "x-user-id": user.id,
    "x-user-name": user.username,
    "x-user-email": user.email,
    "x-user-avatar": user.avatar,
    "x-user-bio": user.bio || "",
    "x-user-styles": user.stylePreference.join(","),
    "x-user-rating": String(user.rating),
    "x-user-joined-date": user.joinedDate,
  };
}

export function mergeMarketplaceUser(users: User[], nextUser: User): User[] {
  const existingIndex = users.findIndex((user) => user.id === nextUser.id);

  if (existingIndex === -1) {
    return [...users, nextUser];
  }

  const merged = [...users];
  merged[existingIndex] = { ...merged[existingIndex], ...nextUser };
  return merged;
}
