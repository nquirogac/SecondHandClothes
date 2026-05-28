import "dotenv/config";
import express, { type Request } from "express";
import type { AddressInfo } from "net";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { User, ClothingItem, Comment, ChatMessage } from "./src/types";
import { applicationDefault, cert, getApps as getAdminApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

const firebaseAdminApp = (() => {
  if (getAdminApps().length > 0) {
    return getAdminApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const resolvedServiceAccountJson = (() => {
    if (serviceAccountJson) {
      return serviceAccountJson;
    }

    if (!serviceAccountPath) {
      return null;
    }

    try {
      return fs.readFileSync(serviceAccountPath, "utf-8");
    } catch (error) {
      console.warn("Firebase Admin service account file could not be read. Falling back to default credentials.", error);
      return null;
    }
  })();

  if (resolvedServiceAccountJson) {
    try {
      return initializeApp({
        credential: cert(JSON.parse(resolvedServiceAccountJson)),
      });
    } catch (error) {
      console.warn("Firebase Admin service account JSON could not be parsed. Falling back to default credentials.", error);
    }
  }

  return initializeApp({
    credential: applicationDefault(),
  });
})();

const firebaseAdminAuth = getAdminAuth(firebaseAdminApp);
const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

type TurnstileVerificationResult = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function startServer(port = 3000) {
  const app = express();
  const PORT = port;

  app.use(express.json({ limit: "10kb" }));

  // Basic rate limiting to protect public API surface
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter limits for authentication flows
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: "Too many login attempts from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: "Too many accounts created from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const turnstileLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { error: "Too many captcha requests, slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general limiter to all routes first
  app.use(generalLimiter);

  // ============================================
  // SERVER STATE (Simulating PostgreSQL Dataset)
  // ============================================

  let users: User[] = [
    {
      id: "u1",
      username: "retro_lucia",
      email: "lucia@example.com",
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$GX0qhWJXcMMyUqEEIEQmVQ$4QKc4SCOP/Y8T2LZlLmJ3eoaVXFsmVzKmGY0mQ8F7wU", // Demo user
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      bio: "Vintage enthusiast & thrifter. Collecting 80s and 90s original streetwear.",
      stylePreference: ["Vintage", "Casual"],
      joinedDate: "2024-03-12T14:48:00.000Z",
      rating: 4.8,
    },
    {
      id: "u2",
      username: "street_felix",
      email: "felix@example.com",
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$GX0qhWJXcMMyUqEEIEQmVQ$4QKc4SCOP/Y8T2LZlLmJ3eoaVXFsmVzKmGY0mQ8F7wU", // Demo user
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      bio: "Hypebeast since 2018. Buy/Sell/Trade streetwear, cargo, graphic tees, sneakerhead.",
      stylePreference: ["Streetwear", "Sportswear"],
      joinedDate: "2024-01-20T09:15:00.000Z",
      rating: 4.9,
    },
    {
      id: "u3",
      username: "olivia_chic",
      email: "olivia@example.com",
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$GX0qhWJXcMMyUqEEIEQmVQ$4QKc4SCOP/Y8T2LZlLmJ3eoaVXFsmVzKmGY0mQ8F7wU", // Demo user
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      bio: "Curator of upscale Parisian vintage formalwear and classy accessories.",
      stylePreference: ["Formal", "Casual"],
      joinedDate: "2024-02-05T18:30:00.000Z",
      rating: 4.95,
    },
    {
      id: "u4",
      username: "eco_gabriel",
      email: "gabriel@example.com",
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$GX0qhWJXcMMyUqEEIEQmVQ$4QKc4SCOP/Y8T2LZlLmJ3eoaVXFsmVzKmGY0mQ8F7wU", // Demo user
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      bio: "Environmentalist looking to extend life cycle of sustainable garment crafts.",
      stylePreference: ["Casual", "Sportswear"],
      joinedDate: "2024-04-01T11:22:00.000Z",
      rating: 4.7,
    }
  ];

  // Default active user is Camilla
  let currentUser: User = {
    id: "u0",
    username: "vintage_camila",
    email: "camila@example.com",
    passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$GX0qhWJXcMMyUqEEIEQmVQ$4QKc4SCOP/Y8T2LZlLmJ3eoaVXFsmVzKmGY0mQ8F7wU", // Demo user
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    bio: "Love looking for treasures of the past. Sustainable fashion only! 🌱👗",
    stylePreference: ["Vintage", "Casual", "Formal"],
    joinedDate: "2026-05-20T10:00:00.000Z",
    rating: 5.0,
  };

  // Add Camila to our known users
  users.push(currentUser);

  let clothingItems: ClothingItem[] = [
    {
      id: "c1",
      sellerId: "u1",
      sellerName: "retro_lucia",
      sellerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      title: "90s Oversized Leather Jacket",
      description: "Beautiful genuine heavy leather jacket from the late 90s. Soft interior quilted lining, perfectly broken-in distressed edges. Silver zippers are strong and smooth. Fits like a true oversized Medium. Perfect vintage grunge vibe.",
      imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
      category: "Vintage",
      size: "M",
      brand: "Schott NYC",
      condition: "Excellent",
      price: 89.0,
      likesCount: 18,
      likedByUserIds: ["u2", "u3", "u4"],
      comments: [
        {
          id: "m1",
          userId: "u2",
          username: "street_felix",
          userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
          text: "Is the leather stiff or soft? Can I wear it comfortably during long walks?",
          createdAt: "2026-05-20T15:30:00.000Z",
        },
        {
          id: "m2",
          userId: "u1",
          username: "retro_lucia",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
          text: "@street_felix It's super soft! It has been worn and conditioned beautifully over the years, so it falls very comfortably.",
          createdAt: "2026-05-20T16:12:00.000Z",
        }
      ],
      status: "available",
      createdAt: "2026-05-19T10:00:00.000Z",
    },
    {
      id: "c2",
      sellerId: "u2",
      sellerName: "street_felix",
      sellerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      title: "Core Cargo Streetwear Pants",
      description: "Heavyweight premium cotton ripstop cargo pants with industrial utility straps, toggle adjustment at the ankles, and multiple utility pocket stacks. Baggy aesthetic and deep olive green. Worn once for a streetwear photoshoot.",
      imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
      category: "Streetwear",
      size: "L",
      brand: "Carhartt WIP",
      condition: "Like New",
      price: 68.0,
      likesCount: 32,
      likedByUserIds: ["u1", "u0"],
      comments: [
        {
          id: "m3",
          userId: "u0",
          username: "vintage_camila",
          userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
          text: "What is the waist measurement? Does it have ties?",
          createdAt: "2026-05-20T18:45:00.000Z",
        }
      ],
      status: "available",
      createdAt: "2026-05-20T08:00:00.000Z",
    },
    {
      id: "c3",
      sellerId: "u3",
      sellerName: "olivia_chic",
      sellerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      title: "Camel Cashmere Trench Coat",
      description: "Very elegant double-breasted vintage winter trench coat in rare golden camel. Crafted with 100% cashmere, ridiculously soft to touch, fully lined. Features structured shoulders and real horn buttons. Truly high-fashion timeless curation.",
      imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800",
      category: "Formal",
      size: "S",
      brand: "Burberry Vintage",
      condition: "Excellent",
      price: 145.0,
      likesCount: 45,
      likedByUserIds: ["u1", "u2", "u0"],
      comments: [],
      status: "available",
      createdAt: "2026-05-18T14:20:00.000Z",
    },
    {
      id: "c4",
      sellerId: "u1",
      sellerName: "retro_lucia",
      sellerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      title: "1994 Varsity College Sweatshirt",
      description: "True 90s vintage heavy-blend cotton collegiate crewneck. Beautifully sun-faded forest green with red embroidered varsity details. Banded hem and cuffs. Soft fleece inside with classic wear around the collar adding authentic retro character.",
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800",
      category: "Vintage",
      size: "XL",
      brand: "Champion Reverse Weave",
      condition: "Good",
      price: 49.0,
      likesCount: 21,
      likedByUserIds: ["u3"],
      comments: [],
      status: "available",
      createdAt: "2026-05-17T09:15:00.000Z",
    },
    {
      id: "c5",
      sellerId: "u4",
      sellerName: "eco_gabriel",
      sellerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      title: "Vintage Earthy Patterned Cardigan",
      description: "Handcrafted cozy knit chunky cardigan sweater. Features unique wood buttons, deep pockets, and a classic autumn earth-tone geometric block knit pattern. Zero synthetic yarns, 100% soft organic virgin wool.",
      imageUrl: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&q=80&w=800",
      category: "Casual",
      size: "L",
      brand: "Patagonia Vintage",
      condition: "Excellent",
      price: 75.0,
      likesCount: 12,
      likedByUserIds: ["u0"],
      comments: [
        {
          id: "m4",
          userId: "u0",
          username: "vintage_camila",
          userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
          text: "Eco-friendly wool! I love this design, sending a direct chat query now.",
          createdAt: "2026-05-20T21:05:00.000Z",
        }
      ],
      status: "available",
      createdAt: "2026-05-20T20:10:00.000Z",
    }
  ];

  let chatMessages: ChatMessage[] = [
    {
      id: "ch1",
      itemId: "c5",
      senderId: "u0",
      senderName: "vintage_camila",
      receiverId: "u4",
      text: "Hello Gabriel! Is the organic wool itchy or soft on bare skin? I am deeply interested in this cardigan.",
      createdAt: "2026-05-20T21:10:00.000Z",
    },
    {
      id: "ch2",
      itemId: "c5",
      senderId: "u4",
      senderName: "eco_gabriel",
      receiverId: "u0",
      text: "Hi Camila! It's actually incredibly soft. It is high-grade virgin wool so it has no coarse content. Highly recommend for chilly evenings!",
      createdAt: "2026-05-20T21:30:00.000Z",
    },
    {
      id: "ch3",
      itemId: "c1",
      senderId: "u2",
      senderName: "street_felix",
      receiverId: "u1",
      text: "Hey Lucia, would you do $80 shipped for the Schott leather jacket?",
      createdAt: "2026-05-19T22:00:00.000Z",
    }
  ];

  const upsertUserRecord = (nextUser: User) => {
    const existingIndex = users.findIndex(user => user.id === nextUser.id);
    if (existingIndex === -1) {
      users.push(nextUser);
      return nextUser;
    }

    users[existingIndex] = {
      ...users[existingIndex],
      ...nextUser,
    };

    return users[existingIndex];
  };

  const parseStylePreferences = (value: string | undefined) => {
    if (!value) {
      return ["Casual"];
    }

    return value.split(",").map(style => style.trim()).filter(Boolean);
  };

  const verifyTurnstileToken = async (token: string, remoteip?: string) => {
    if (!turnstileSecretKey) {
      return {
        success: false,
        error: "TURNSTILE_SECRET_KEY is not configured on the server.",
      };
    }

    const formData = new URLSearchParams();
    formData.append("secret", turnstileSecretKey);
    formData.append("response", token);

    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const verificationResult = (await response.json()) as TurnstileVerificationResult;

    if (!verificationResult.success) {
      return {
        success: false,
        error: verificationResult["error-codes"]?.join(", ") || "Turnstile verification failed.",
      };
    }

    return { success: true };
  };

  const buildHeaderFallbackUser = (req: Request) => {
    const headerUserId = req.header("x-user-id");
    const headerUsername = req.header("x-user-name");
    const headerEmail = req.header("x-user-email");
    const headerAvatar = req.header("x-user-avatar");

    if (headerUserId && headerUsername && headerEmail && headerAvatar) {
      const resolvedUser: User = {
        id: headerUserId,
        username: headerUsername,
        email: headerEmail,
        avatar: headerAvatar,
        bio: req.header("x-user-bio") || users.find(user => user.id === headerUserId)?.bio || "Signed in user",
        stylePreference: parseStylePreferences(req.header("x-user-styles") || undefined),
        joinedDate: req.header("x-user-joined-date") || users.find(user => user.id === headerUserId)?.joinedDate || new Date().toISOString(),
        rating: Number(req.header("x-user-rating") || 5),
        passwordHash: "",
      };

      return upsertUserRecord(resolvedUser);
    }

    return currentUser;
  };

  const resolveActiveUser = async (req: Request) => {
    const authorizationHeader = req.header("authorization");
    const bearerToken = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice(7) : null;

    if (bearerToken) {
      try {
        const decodedToken = await firebaseAdminAuth.verifyIdToken(bearerToken);
        const resolvedUser: User = {
          id: decodedToken.uid,
          username: (decodedToken.name || decodedToken.email?.split("@")[0] || decodedToken.uid).toLowerCase().replace(/\s+/g, "_"),
          email: decodedToken.email || `${decodedToken.uid}@example.com`,
          avatar: decodedToken.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          bio: "Signed in with Firebase Auth",
          stylePreference: ["Casual"],
          joinedDate: new Date().toISOString(),
          rating: 5.0,
          passwordHash: "",
        };

        return upsertUserRecord(resolvedUser);
      } catch (error) {
        console.warn("Firebase token verification failed. Falling back to header/demo identity.", error);
      }
    }

    return buildHeaderFallbackUser(req);
  };

  // ============================================
  // API ENDPOINTS
  // ============================================

  // User Profile Endpoints
  app.get("/api/users", (req, res) => {
    res.json(users);
  });

  app.get("/api/currentUser", async (req, res) => {
    res.json(await resolveActiveUser(req));
  });

  app.post("/api/security/turnstile/verify", turnstileLimiter, async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: "Turnstile token is required." });
    }

    const result = await verifyTurnstileToken(token, req.ip);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    const { userId, username, email } = req.body;
    const turnstileToken = req.body.turnstileToken;

    if (turnstileSecretKey) {
      if (!turnstileToken) {
        return res.status(400).json({ success: false, error: "Turnstile token is required." });
      }

      const turnstileResult = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!turnstileResult.success) {
        return res.status(400).json(turnstileResult);
      }
    }

    let foundUser = users.find(u => u.id === userId || u.username === username || u.email === email);

    if (foundUser) {
      currentUser = foundUser;
      upsertUserRecord(foundUser);
      return res.json({ success: true, user: currentUser });
    }

    // Fallback: If username doesn't exist, log in as new with random profile setup
    if (username) {
      const newUser: User = {
        id: "u_" + Date.now(),
        username: username,
        email: email || `${username}@example.com`,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        bio: "Bio not set yet - Tap edit profile to customize",
        stylePreference: ["Casual"],
        joinedDate: new Date().toISOString(),
        rating: 5.0,
        passwordHash: "",
      };
      users.push(newUser);
      currentUser = newUser;
      upsertUserRecord(newUser);
      return res.json({ success: true, user: currentUser });
    }

    res.status(400).json({ success: false, error: "Invalid login credentials" });
  });

  app.post("/api/register", registerLimiter, async (req, res) => {
    const { username, email, bio, stylePreference, avatar } = req.body;
    const turnstileToken = req.body.turnstileToken;

    if (turnstileSecretKey) {
      if (!turnstileToken) {
        return res.status(400).json({ error: "Turnstile token is required." });
      }

      const turnstileResult = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!turnstileResult.success) {
        return res.status(400).json(turnstileResult);
      }
    }

    if (!username || !email) {
      return res.status(400).json({ error: "Username and Email are required parameters" });
    }

    const newUser: User = {
      id: "u_" + Date.now(),
      username: username.toLowerCase().replace(/\s+/g, "_"),
      email,
      passwordHash: "", // Guardamos el hash, NUNCA la contraseña plana
      avatar: avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
      bio: bio || "Sustainable apparel searcher",
      stylePreference: stylePreference || ["Casual"],
      joinedDate: new Date().toISOString(),
      rating: 5.0,
    };

    users.push(newUser);
    currentUser = newUser;
    upsertUserRecord(newUser);
    res.json({ success: true, user: currentUser });
  });

  // Clothing Item Endpoints
  app.get("/api/items", (req, res) => {
    res.json(clothingItems);
  });

  app.post("/api/items", async (req, res) => {
    const { title, description, imageUrl, category, size, brand, condition, price } = req.body;

    const activeUser = await resolveActiveUser(req);

    const newItem: ClothingItem = {
      id: "c_" + Date.now(),
      sellerId: activeUser.id,
      sellerName: activeUser.username,
      sellerAvatar: activeUser.avatar,
      title: title,
      description: description || "Gorgeous pre-loved fashion piece.",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
      category,
      size,
      brand: brand || "Unbranded / Vintage",
      condition,
      price: Number(price),
      likesCount: 0,
      likedByUserIds: [],
      comments: [],
      status: "available",
      createdAt: new Date().toISOString(),
    };

    clothingItems.unshift(newItem);
    res.json({ success: true, item: newItem });
  });

  // Like Social Element
  app.post("/api/items/:id/like", async (req, res) => {
    const { id } = req.params;
    const item = clothingItems.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const activeUser = await resolveActiveUser(req);

    const likedIndex = item.likedByUserIds.indexOf(activeUser.id);
    if (likedIndex > -1) {
      // Unlike
      item.likedByUserIds.splice(likedIndex, 1);
      item.likesCount = Math.max(0, item.likesCount - 1);
    } else {
      // Like
      item.likedByUserIds.push(activeUser.id);
      item.likesCount += 1;
    }

    res.json({ success: true, likesCount: item.likesCount, likedByUserIds: item.likedByUserIds });
  });

  // Commments Social Element
  app.post("/api/items/:id/comment", async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    const item = clothingItems.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const activeUser = await resolveActiveUser(req);

    const newComment: Comment = {
      id: "com_" + Date.now(),
      userId: activeUser.id,
      username: activeUser.username,
      userAvatar: activeUser.avatar,
      text: text,
      createdAt: new Date().toISOString()
    };

    item.comments.push(newComment);
    res.json({ success: true, comment: newComment });
  });

  // Buy clothing checkout trigger
  app.post("/api/items/:id/buy", (req, res) => {
    const { id } = req.params;
    const item = clothingItems.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ error: "Garment listing not found" });
    }

    if (item.status === 'sold') {
      return res.status(400).json({ error: "Garment is already purchased" });
    }

    item.status = "sold";
    res.json({ success: true, item });
  });

  // Direct negotiation chat list
  app.get("/api/chats", async (req, res) => {
    // Return chats involving active user
    const activeUser = await resolveActiveUser(req);
    const chats = chatMessages.filter(
      c => c.senderId === activeUser.id || c.receiverId === activeUser.id
    );
    res.json(chats);
  });

  // Send communication to seller
  app.post("/api/chats", async (req, res) => {
    const { itemId, receiverId, text } = req.body;

    const activeUser = await resolveActiveUser(req);

    const newChat: ChatMessage = {
      id: "ch_" + Date.now(),
      itemId: itemId,
      senderId: activeUser.id,
      senderName: activeUser.username,
      receiverId: receiverId,
      text: text,
      createdAt: new Date().toISOString()
    };

    chatMessages.push(newChat);
    res.json({ success: true, chat: newChat });
  });

  // ============================================
  // VITE DEVELOPMENT MIDDLEWARE Setup / STATIC
  // ============================================
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else if (process.env.NODE_ENV === "test") {
    // In test mode we skip Vite middleware to avoid ESM/CJS interop issues.
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Bound target port
  const server = app.listen(PORT, "0.0.0.0", () => {
    const addr = server.address() as AddressInfo | null;
    const used = addr ? addr.port : PORT;
    console.log(`[VibeWear Backend Server] running smoothly on port ${used}`);
  });

  return { app, server };
}

// Start server only when not running under Jest (tests will call startServer)
if (!process.env.JEST_WORKER_ID) {
  startServer().catch(err => {
    console.error("Critical: Dev Server failed to boot up correctly:", err);
  });
}
