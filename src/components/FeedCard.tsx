import React from "react";
import { ClothingItem, User } from "../types";
import { Heart, MessageSquare, Tag, Eye } from "lucide-react";

interface FeedCardProps {
  key?: string | number;
  item: ClothingItem;
  currentUser: User | null;
  onLike: (itemId: string) => void | Promise<void>;
  onSelect: (item: ClothingItem) => void;
}

export default function FeedCard({ item, currentUser, onLike, onSelect }: FeedCardProps) {
  const isLiked = currentUser ? item.likedByUserIds.includes(currentUser.id) : false;
  const isSold = item.status === "sold";

  // Vibrant custom label color styling based on clothing categories
  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case "vintage":
        return "bg-amber-100 text-amber-850 hover:bg-amber-200 border-amber-200";
      case "streetwear":
        return "bg-purple-100 text-purple-850 hover:bg-purple-200 border-purple-200";
      case "formal":
        return "bg-indigo-100 text-indigo-850 hover:bg-indigo-200 border-indigo-200";
      case "casual":
        return "bg-emerald-100 text-emerald-850 hover:bg-emerald-200 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200";
    }
  };

  const getConditionStyle = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "brand new":
        return "text-emerald-700 bg-emerald-50 border border-emerald-100";
      case "like new":
        return "text-cyan-700 bg-cyan-50 border border-cyan-100";
      case "excellent":
        return "text-indigo-700 bg-indigo-50 border border-indigo-100";
      case "good":
        return "text-amber-700 bg-amber-50 border border-amber-100";
      default:
        return "text-slate-650 bg-slate-50 border border-slate-100";
    }
  };

  return (
    <article className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-indigo-150 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      
      {/* Dynamic Overlay for Sold status */}
      {isSold && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-16 w-16 bg-rose-500 rounded-full flex items-center justify-center text-white font-black text-xs uppercase tracking-widest shadow-lg animate-float">
            SOLD OUT
          </div>
          <p className="text-white text-xs font-semibold mt-3">Adopted by another fashion collector</p>
          <button
            onClick={() => onSelect(item)}
            className="mt-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold font-mono transition-all"
          >
            Inspect Piece
          </button>
        </div>
      )}

      {/* Seller Header (Social Aspect) */}
      <div className="p-4 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center space-x-2.5">
          <img
            src={item.sellerAvatar}
            alt={item.sellerName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-150 group-hover:ring-indigo-400 transition-all"
          />
          <div>
            <span className="text-xs font-extrabold text-slate-800 hover:text-indigo-650 block transition-colors leading-tight">
              @{item.sellerName}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block leading-none">
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Quality stamp */}
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold ${getConditionStyle(item.condition)}`}>
          {item.condition}
        </span>
      </div>

      {/* Image Block */}
      <div className="relative pt-[100%] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onSelect(item)}>
        <img
          src={item.imageUrl}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Size tag pill */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white h-7 min-w-7 px-2 font-mono text-xs font-black rounded-lg flex items-center justify-center shadow-md">
          {item.size}
        </div>

        {/* Action icons hover visual */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <div className="text-white text-xs font-bold leading-normal flex items-center space-x-1">
            <Eye size={14} />
            <span>Discover specs & size details</span>
          </div>
        </div>
      </div>

      {/* Item Body details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Tag & Price Header */}
          <div className="flex items-center justify-between mb-2.5">
            <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${getCategoryTheme(item.category)}`}>
              {item.category}
            </span>
            <span className="text-lg font-black font-mono text-indigo-750">
              ${Number(item.price).toFixed(2)}
            </span>
          </div>

          <h4 
            onClick={() => onSelect(item)}
            className="text-sm font-extrabold text-slate-850 hover:text-indigo-600 cursor-pointer line-clamp-1 transition-colors font-display"
          >
            {item.title}
          </h4>

          <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Interaction Footer (Social mechanics) */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
          
          <div className="text-[10px] font-bold text-slate-400">
            Brand: <span className="text-slate-600 font-extrabold">{item.brand}</span>
          </div>

          <div className="flex items-center space-x-3.5">
            
            {/* Social Likes and Action */}
            <button
              onClick={() => onLike(item.id)}
              className={`flex items-center space-x-1 text-xs font-bold transition-all cursor-pointer py-1 px-2 rounded-lg ${
                isLiked 
                  ? "text-rose-600 bg-rose-50 hover:bg-rose-100" 
                  : "text-slate-400 hover:text-rose-500 hover:bg-slate-50"
              }`}
            >
              <Heart size={15} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "scale-110" : "group-hover:scale-110 transition-transform"} />
              <span className="font-mono">{item.likesCount}</span>
            </button>

            {/* Social Comments Indicator */}
            <button
              onClick={() => onSelect(item)}
              className="flex items-center space-x-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50"
            >
              <MessageSquare size={14} />
              <span className="font-mono">{item.comments.length}</span>
            </button>

          </div>

        </div>
      </div>

    </article>
  );
}
