import React, { useState } from "react";
import { X, Heart, MessageSquare, Send, Tag, ShoppingCart, MessageCircle, ShieldCheck, Scale, Award } from "lucide-react";
import { ClothingItem, User, Comment } from "../types";

interface DetailsDrawerProps {
  item: ClothingItem;
  currentUser: User | null;
  onClose: () => void;
  onLike: (itemId: string) => void;
  onComment: (itemId: string, text: string) => void;
  onStartChat: (itemId: string, receiverId: string, text: string) => void;
  onBuy: (itemId: string) => void;
}

export default function DetailsDrawer({
  item,
  currentUser,
  onClose,
  onLike,
  onComment,
  onStartChat,
  onBuy
}: DetailsDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [negotiateText, setNegotiateText] = useState("");
  const [showNegotiateTab, setShowNegotiateTab] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const isLiked = currentUser ? item.likedByUserIds.includes(currentUser.id) : false;
  const isOwnItem = currentUser ? item.sellerId === currentUser.id : false;
  const isSold = item.status === "sold";

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(item.id, commentText);
    setCommentText("");
  };

  const handleSendChatInitial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiateText.trim()) return;
    onStartChat(item.id, item.sellerId, negotiateText);
    setNegotiateText("");
    setShowNegotiateTab(false);
    alert(`Success! Message dispatched to @${item.sellerName}. Open chat box to negotiate.`);
  };

  const handleBuyTrigger = () => {
    if (isSold) return;
    onBuy(item.id);
    setOrderComplete(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end">
      {/* Click outside to close container */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Main Drawer view - Desktop scale is elegant right-hand bar */}
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden relative border-l border-slate-100">
        
        {/* Drawer Header Navbar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <Tag size={18} className="text-indigo-600" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#475569]">
              Social Wardrobe Spec
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Scrollable specs sheet */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
          
          {/* Main Visual element */}
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 group border border-slate-100 shadow-inner">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            
            {/* Status chip */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-xs font-mono font-bold rounded-full">
                Size {item.size}
              </span>
              <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                item.status === "available" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              }`}>
                {item.status === "available" ? "★ Live Feed" : "Purchased"}
              </span>
            </div>
          </div>

          {/* Core pricing information header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-850 font-display leading-tight">{item.title}</h2>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-xs text-[#a0a0a0] font-semibold">Listed brand:</span>
                  <span className="text-xs bg-slate-100 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-md">
                    {item.brand}
                  </span>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-indigo-750 bg-indigo-50/50 border border-indigo-100 px-4 py-1.5 rounded-2xl">
                ${Number(item.price).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 text-xs font-bold bg-[#f1f5f9] text-[#334155] rounded-full">
                Vibe: <span className="font-extrabold text-indigo-650">{item.category}</span>
              </span>
              <span className="px-3 py-1 text-xs font-bold bg-[#f1f5f9] text-[#334155] rounded-full">
                Condition: <span className="font-extrabold text-emerald-650">{item.condition}</span>
              </span>
            </div>

            <p className="text-sm text-slate-650 leading-relaxed pt-2 font-medium">
              {item.description}
            </p>
          </div>

          {/* Social Interactions Bar */}
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <button
              onClick={() => onLike(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isLiked 
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200" 
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              <span>{isLiked ? "Loved" : "Approve Style"} ({item.likesCount})</span>
            </button>

            <span className="text-xs text-slate-400 font-mono font-medium">
              ✨ <b>{item.comments.length}</b> Community Responses
            </span>
          </div>

          {/* Seller Profile overview card */}
          <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/20 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={item.sellerAvatar}
                  alt={item.sellerName}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-100"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">@{item.sellerName}</h4>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Garment Seller Owner</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 bg-yellow-100 text-yellow-850 px-2.5 py-1 rounded-full text-xs font-bold">
                <Award size={14} />
                <span>4.8 Rating</span>
              </div>
            </div>

            {/* If not selling your own item, display transaction/negotiation layout */}
            {!isOwnItem ? (
              <div className="space-y-3 pt-2">
                {orderComplete || isSold ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-xl text-center font-bold text-xs">
                    🎉 This garment package was successfully adopted! Seller notified to execute secure shipping.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Chat negotiating link */}
                    <button
                      onClick={() => setShowNegotiateTab(!showNegotiateTab)}
                      className="px-4 py-2.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-705 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <MessageCircle size={15} />
                      <span>Negotiate price / size</span>
                    </button>

                    {/* Standard Immediate secure Checkout */}
                    <button
                      onClick={handleBuyTrigger}
                      className="px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart size={15} />
                      <span>Buy Immediately</span>
                    </button>

                  </div>
                )}
                
                {/* Collapsible Chat formulation block */}
                {showNegotiateTab && (
                  <form onSubmit={handleSendChatInitial} className="p-4 bg-white rounded-xl border border-indigo-100 space-y-3 shadow-inner">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#4f46e5] block">
                      Send Direct negotiation Message
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Could you accept $75 and ship tomorrow morning?"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        value={negotiateText}
                        onChange={(e) => setNegotiateText(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                )}

              </div>
            ) : (
              <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-extrabold mt-2">
                🏷️ You own this garment listing. Inspect style responses below!
              </div>
            )}
          </div>

          {/* Escrow and Trust standards warning block */}
          <div className="grid grid-cols-2 gap-4 text-[11px] font-medium text-slate-500 border-t border-slate-100 pt-6">
            <div className="flex items-start space-x-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Buyer Escrow Guard:</strong> Cash only released to seller after catalog delivery confirm.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <Scale size={16} className="text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Circular Refund Standard:</strong> Returns acceptable on sizing misalignments within 3 days.
              </span>
            </div>
          </div>

          {/* Social Feed: Commentary Segment */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <h4 className="text-sm font-extrabold text-slate-850">
              Community Comments ({item.comments.length})
            </h4>

            {/* Comment block list */}
            {item.comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No styling discussion on this garment yet. Start the buzz below!</p>
            ) : (
              <div className="space-y-4">
                {item.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <img
                      src={comment.userAvatar}
                      alt={comment.username}
                      className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-100"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">@{comment.username}</span>
                        <span className="text-[9px] text-[#8e8e8e] font-sans">
                          {new Date(comment.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Post comment form */}
            <form onSubmit={handlePostComment} className="flex space-x-2 pt-2">
              <input
                type="text"
                placeholder="Ask about fabric thickness, shipping costs..."
                className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-colors"
                title="Post comment"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
