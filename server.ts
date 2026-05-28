import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { User, ClothingItem, Comment, ChatMessage } from "./src/types";
import { validateLogin, validateRegister, validateCreateItem, validateComment, validateChat } from "./src/middleware/inputValidation";
import { sanitizeBody } from "./src/middleware/sanitizer";
import { validatePasswordStrength, hashPassword, verifyPassword } from "./src/services/passwordService";
import { appendAuditLog } from "./src/services/auditLog";
import { getLoginKey, isLoginBlocked, recordLoginFailure, recordLoginSuccess } from "./src/services/bruteForceProtection";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10kb" }));

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

  // ============================================
  // API ENDPOINTS
  // ============================================

  // User Profile Endpoints
  app.get("/api/users", (req, res) => {
    res.json(users);
  });

  app.get("/api/currentUser", (req, res) => {
    res.json(currentUser);
  });

  app.post("/api/login", validateLogin, sanitizeBody(), (req, res) => {
    const { userId, username, email } = req.body;
    const loginKey = getLoginKey(username, email, userId, req.ip);
    const blockStatus = isLoginBlocked(loginKey);

    if (blockStatus.blocked) {
      void appendAuditLog("login.rate-limited", {
        loginKey,
        retryAfter: blockStatus.retryAfter,
      }).catch((err) => console.error("Audit log write failed:", err));
      return res.status(429).json({
        success: false,
        error: "Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.",
        retryAfter: blockStatus.retryAfter,
      });
    }

    const foundUser = users.find(
      (u) => u.id === userId || u.username === username || u.email === email,
    );

    if (foundUser) {
      currentUser = foundUser;
      recordLoginSuccess(loginKey);
      void appendAuditLog("login.success", {
        userId: foundUser.id,
        username: foundUser.username,
        source: "login",
      }).catch((err) => console.error("Audit log write failed:", err));
      return res.json({ success: true, user: currentUser });
    }

    if (username) {
      const newUser: User = {
        id: "u_" + Date.now(),
        username: username.toLowerCase().replace(/\s+/g, "_"),
        email: email || `${username}@example.com`,
        passwordHash: "", // Empty hash for auto-created login users
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        bio: "Bio not set yet - Tap edit profile to customize",
        stylePreference: ["Casual"],
        joinedDate: new Date().toISOString(),
        rating: 5.0,
      };
      users.push(newUser);
      currentUser = newUser;
      recordLoginSuccess(loginKey);
      void appendAuditLog("login.auto-created", {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
      }).catch((err) => console.error("Audit log write failed:", err));
      return res.json({ success: true, user: currentUser });
    }

    const failureStatus = recordLoginFailure(loginKey);
    void appendAuditLog("login.failed", {
      attemptedUsername: username || null,
      attemptedEmail: email || null,
      blocked: failureStatus.blocked,
      attempts: failureStatus.attempts,
      retryAfter: failureStatus.retryAfter,
    }).catch((err) => console.error("Audit log write failed:", err));

    const response = {
      success: false,
      error: "Invalid login credentials",
    } as { success: false; error: string; retryAfter?: number };

    if (failureStatus.blocked) {
      response.error = "Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.";
      response.retryAfter = failureStatus.retryAfter ?? undefined;
      return res.status(429).json(response);
    }

    res.status(400).json(response);
  });

  app.post("/api/register", validateRegister, sanitizeBody(), async (req, res) => {
    const { username, email, password, bio, stylePreference, avatar } = req.body;

    // Validar fortaleza de la contraseña
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: "Contraseña débil",
        passwordErrors: passwordCheck.errors,
      });
    }

    // Hashear la contraseña antes de guardar
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "Error al procesar la contraseña",
      });
    }

    // Verificar que el usuario no exista ya
    const userExists = users.find((u) => u.email === email || u.username === username);
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: "El usuario o email ya está registrado",
      });
    }

    const newUser: User = {
      id: "u_" + Date.now(),
      username: username.toLowerCase().replace(/\s+/g, "_"),
      email,
      passwordHash, // Guardamos el hash, NUNCA la contraseña plana
      avatar: avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
      bio: bio || "Sustainable apparel searcher",
      stylePreference: stylePreference || ["Casual"],
      joinedDate: new Date().toISOString(),
      rating: 5.0,
    };

    users.push(newUser);
    currentUser = newUser;

    void appendAuditLog("register.success", {
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
    }).catch((err) => console.error("Audit log write failed:", err));

    // Devolver el usuario SIN mostrar el hash
    res.json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        bio: newUser.bio,
        stylePreference: newUser.stylePreference,
        joinedDate: newUser.joinedDate,
        rating: newUser.rating,
      },
    });
  });

  // Clothing Item Endpoints
  app.get("/api/items", (req, res) => {
    res.json(clothingItems);
  });

  app.post("/api/items", validateCreateItem, sanitizeBody({ allowRichText: true }), (req, res) => {
    const { title, description, imageUrl, category, size, brand, condition, price } = req.body;

    const newItem: ClothingItem = {
      id: "c_" + Date.now(),
      sellerId: currentUser.id,
      sellerName: currentUser.username,
      sellerAvatar: currentUser.avatar,
      title,
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
    void appendAuditLog("item.created", {
      itemId: newItem.id,
      sellerId: currentUser.id,
      sellerName: currentUser.username,
      title: newItem.title,
    }).catch((err) => console.error("Audit log write failed:", err));
    res.json({ success: true, item: newItem });
  });

  // Like Social Element
  app.post("/api/items/:id/like", (req, res) => {
    const { id } = req.params;
    const item = clothingItems.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const likedIndex = item.likedByUserIds.indexOf(currentUser.id);
    if (likedIndex > -1) {
      // Unlike
      item.likedByUserIds.splice(likedIndex, 1);
      item.likesCount = Math.max(0, item.likesCount - 1);
    } else {
      // Like
      item.likedByUserIds.push(currentUser.id);
      item.likesCount += 1;
    }

    res.json({ success: true, likesCount: item.likesCount, likedByUserIds: item.likedByUserIds });
  });

  // Commments Social Element
  app.post("/api/items/:id/comment", validateComment, sanitizeBody({ allowRichText: false }), (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    const item = clothingItems.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const newComment: Comment = {
      id: "com_" + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      text,
      createdAt: new Date().toISOString(),
    };

    item.comments.push(newComment);
    void appendAuditLog("item.comment", {
      itemId: id,
      commentId: newComment.id,
      userId: currentUser.id,
      username: currentUser.username,
    }).catch((err) => console.error("Audit log write failed:", err));
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
    void appendAuditLog("item.purchased", {
      itemId: item.id,
      buyerId: currentUser.id,
      buyerName: currentUser.username,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
    }).catch((err) => console.error("Audit log write failed:", err));
    res.json({ success: true, item });
  });

  // Direct negotiation chat list
  app.get("/api/chats", (req, res) => {
    // Return chats involving active user
    const chats = chatMessages.filter(
      c => c.senderId === currentUser.id || c.receiverId === currentUser.id
    );
    res.json(chats);
  });

  // Send communication to seller
  app.post("/api/chats", validateChat, sanitizeBody({ allowRichText: false }), (req, res) => {
    const { itemId, receiverId, text } = req.body;

    const newChat: ChatMessage = {
      id: "ch_" + Date.now(),
      itemId,
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      text,
      createdAt: new Date().toISOString(),
    };

    chatMessages.push(newChat);
    void appendAuditLog("chat.sent", {
      chatId: newChat.id,
      itemId: newChat.itemId,
      senderId: newChat.senderId,
      senderName: newChat.senderName,
      receiverId: newChat.receiverId,
    }).catch((err) => console.error("Audit log write failed:", err));
    res.json({ success: true, chat: newChat });
  });

  // ============================================
  // VITE DEVELOPMENT MIDDLEWARE Setup / STATIC
  // ============================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bound target port strictly on 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VibeWear Backend Server] running smoothly on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical: Dev Server failed to boot up correctly:", err);
});
