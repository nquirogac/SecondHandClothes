# PostgreSQL Database Setup Guide

This guide provides the complete set of PostgreSQL commands, table definition schemas, insert statements for initial mock data, and instructions for how to run them locally. It also outlines how to connect the Express backend to your live PostgreSQL database.

---

## 1. PostgreSQL Schema (`schema.sql`)

You can execute this SQL in your local PostgreSQL client (like `psql`, pgAdmin, or DBeaver) to bootstrap your tables manually database-side.

```sql
-- Create Users Table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(1000) NOT NULL,
    bio TEXT,
    style_preferences VARCHAR(255)[] NOT NULL,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating NUMERIC(3, 2) DEFAULT 5.00
);

-- Create Clothing Items Table
CREATE TABLE clothing_items (
    id VARCHAR(255) PRIMARY KEY,
    seller_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    category VARCHAR(50) NOT NULL,
    size VARCHAR(20) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    price DEFAULT 0.00 NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Likes Join Table (for Social functions)
CREATE TABLE item_likes (
    item_id VARCHAR(255) REFERENCES clothing_items(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, user_id)
);

-- Create Comments Table
CREATE TABLE comments (
    id VARCHAR(255) PRIMARY KEY,
    item_id VARCHAR(255) REFERENCES clothing_items(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Chat Messages Table (for the social negotiation feature)
CREATE TABLE chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    item_id VARCHAR(255) REFERENCES clothing_items(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Seed Data Execution (`seed.sql`)

Run this after creating the tables to insert initial users and clothing items:

```sql
-- Insert Seed Users
INSERT INTO users (id, username, email, avatar, bio, style_preferences, rating) VALUES
('u1', 'retro_lucia', 'lucia@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'vintage lover & thrifter', ARRAY['Vintage', 'Casual'], 4.90),
('u2', 'street_felix', 'felix@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'hypebeast, collecting streetwear since 2018', ARRAY['Streetwear', 'Sportswear'], 4.80),
('u3', 'olivia_chic', 'olivia@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', 'minimalist style curator, based in Paris', ARRAY['Formal', 'Casual'], 4.95);

-- Insert Seed Clothing Items
INSERT INTO clothing_items (id, seller_id, title, description, image_url, category, size, brand, condition, price, status) VALUES
('c1', 'u1', '90s Oversized Leather Jacket', 'Beautiful genuine leather jacket from the late 90s. Soft interior, perfectly faded aesthetic, very heavy duty zipper. Fits like a true oversized M.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=1000', 'Vintage', 'M', 'Schott NYC', 'Excellent', 89.00, 'available'),
('c2', 'u2', 'Core Cargo Streetwear Pants', 'Heavy cotton ripstop cargo pants with utility straps and multiple pockets. Slightly baggy drape. Condition is pristine, only worn for a photo shoot.', 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1000', 'Streetwear', 'L', 'Carhartt WIP', 'Like New', 68.00, 'available'),
('c3', 'u3', 'Cashmere Double-Breasted Trench Coat', 'Very elegant trench coat in Camel color. Pure vintage cashmere, keeps you incredibly warm while looking highly fashion-forward. Unbelievably soft lining.', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=1000', 'Formal', 'S', 'Burberry Vintage', 'Excellent', 145.00, 'available');

-- Insert Initial Likes, Comments and Chats
INSERT INTO item_likes (item_id, user_id) VALUES
('c1', 'u2'),
('c1', 'u3'),
('c2', 'u1');

INSERT INTO comments (id, item_id, user_id, text) VALUES
('m1', 'c1', 'u2', 'Is the leather very stiff? Is it comfortable to wear?'),
('m2', 'c1', 'u1', '@street_felix It is super soft and moldable, already broken in beautifully!');
```

---

## 3. Swapping the Backend to Use Real PostgreSQL

To run this on your local environment using the Node PostgreSQL driver, follow these simple steps:

1. **Install PostgreSQL Node Driver**
   ```bash
   npm install pg @types/pg
   ```

2. **Add connection strings to your `.env`**
   ```env
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=used_clothing_db
   PGUSER=postgres
   PGPASSWORD=yoursecurepassword
   ```

3. **Provide database client in your backend (`server.ts`)**
   Replace the in-memory database calls with standard SQL queries:

   ```typescript
   import { Pool } from 'pg';

   const pool = new Pool({
     host: process.env.PGHOST,
     port: parseInt(process.env.PGPORT || '5432'),
     database: process.env.PGDATABASE,
     user: process.env.PGUSER,
     password: process.env.PGPASSWORD,
   });

   // Example: Fetch clothing items from real PostgreSQL with likes & seller data
   export async function getClothingItems() {
     const result = await pool.query(`
       SELECT
         c.id, c.title, c.description, c.image_url, c.category, c.size, c.brand, c.condition, c.price, c.status, c.created_at,
         u.id as seller_id, u.username as seller_name, u.avatar as seller_avatar,
         COALESCE(ARRAY_AGG(l.user_id) FILTER (WHERE l.user_id IS NOT NULL), '{}') as liked_by_user_ids,
         COUNT(l.user_id) as likes_count
       FROM clothing_items c
       JOIN users u ON c.seller_id = u.id
       LEFT JOIN item_likes l ON c.id = l.item_id
       GROUP BY c.id, u.id
       ORDER BY c.created_at DESC
     `);
     return result.rows;
   }
   ```

4. **Security & Validation Layer Expansion**
   This application is architected to make adding authentication middleware (like **JWT** or **Passport.js**) extremely straightforward.
   Simply wrap the publish/messaging api routes in your server with an authentication handler:
   ```typescript
   // Example Route guarding with JWT
   app.post('/api/items', verifyJWT, async (req, res) => {
      // req.user contains the authenticated PostgreSQL user info
   });
   ```
