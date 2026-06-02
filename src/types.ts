/**
 * Used Clothing Social Marketplace - Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // Argon2 hash - NUNCA guardar contraseña plana
  avatar: string;
  bio?: string;
  stylePreference: string[];
  joinedDate: string;
  rating: number;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface ClothingItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string; // e.g., 'Vintage', 'Streetwear', 'Casual', 'Formal', 'Sportswear', 'Gothic'
  size: string; // e.g., 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'
  brand: string;
  condition: string; // e.g., 'Brand New', 'Like New', 'Excellent', 'Good', 'Fair'
  price: number;
  likesCount: number;
  likedByUserIds: string[];
  comments: Comment[];
  status: 'available' | 'sold';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  itemId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  text: string;
  createdAt: string;
}
