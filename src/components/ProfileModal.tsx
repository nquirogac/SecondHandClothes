import React, { useState } from "react";
import { X, Award, MapPin, Calendar, Heart, User as UserIcon, Palette, Plus, Tag } from "lucide-react";
import { User, ClothingItem } from "../types";

interface ProfileModalProps {
  onClose: () => void;
  currentUser: User | null;
  items: ClothingItem[];
  onUpdateBio: (newBio: string, stylePrefs: string[]) => void;
  onSelectGarment: (item: ClothingItem) => void;
  onSignOut: () => void;
}

const STOCK_STYLES = ["Vintage", "Casual", "Streetwear", "Formal", "Sportswear", "Gothic"];

export default function ProfileModal({
  onClose,
  currentUser,
  items,
  onUpdateBio,
  onSelectGarment,
  onSignOut
}: ProfileModalProps) {
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(currentUser?.stylePreference || []);
  const [isEditing, setIsEditing] = useState(false);

  if (!currentUser) return null;

  // Filter listings published by the currently connected user
  const myGarments = items.filter(item => item.sellerId === currentUser.id);
  const totalMyLikes = myGarments.reduce((acc, curr) => acc + curr.likesCount, 0);

  const handleSave = () => {
    onUpdateBio(bio, selectedStyles);
    setIsEditing(false);
  };

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6 no-scrollbar">
        
        {/* Head Nav */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <UserIcon size={20} className="text-indigo-650" />
            <h3 className="font-extrabold text-lg text-slate-800 font-display">Stylist Closet & Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-3 border border-slate-200 text-slate-500 hover:text-slate-900 text-xs font-bold rounded-lg cursor-pointer"
          >
            Go Back
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100 shrink-0 self-center md:self-start"
          />

          <div className="flex-1 space-y-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xl font-bold text-slate-900">@{currentUser.username}</h4>
                <p className="text-xs text-slate-400 font-mono font-bold select-all leading-none">{currentUser.email}</p>
              </div>

              <div className="inline-flex items-center space-x-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-850 px-3 py-1 rounded-full text-xs font-extrabold shadow-xs transition-colors self-start">
                <Award size={14} />
                <span>{currentUser.rating.toFixed(2)} / 5.0 Trust rating</span>
              </div>
            </div>

            {/* Editing state description inputs */}
            {isEditing ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    Update Wardrobe bio info
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your style preferences, thrifting routines..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    Select Favorite Clothing Aesthetics
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STOCK_STYLES.map((style) => {
                      const selected = selectedStyles.includes(style);
                      return (
                        <button
                          key={style}
                          onClick={() => toggleStyle(style)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border ${
                            selected
                              ? "bg-indigo-650 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex space-x-2 pt-1.5">
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-lg cursor-pointer transition-colors"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-650 leading-relaxed font-semibold italic">
                  "{currentUser.bio || "Thrifting enthusiast looking to trade aesthetic garments."}"
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {currentUser.stylePreference.map((style) => (
                    <span
                      key={style}
                      className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-[#4f46e5] text-[10px] font-black rounded-full"
                    >
                      # {style}
                    </span>
                  ))}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-650 border border-dashed border-indigo-200 hover:bg-indigo-50 px-2 py-0.5 text-[10px] rounded-full font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                  >
                    <span>Edit Profile Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Join stats row */}
            <div className="flex items-center space-x-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-1">
              <span className="flex items-center space-x-1">
                <Calendar size={13} />
                <span>Joined {new Date(currentUser.joinedDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              </span>
              <span>•</span>
              <span className="text-[#ec4899] font-black">✨ Verified Thrifting Circle Creator</span>
            </div>

          </div>
        </div>

        {/* User stats summary boxes */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-100 text-center rounded-2xl">
            <span className="text-[11px] block text-slate-400 font-bold uppercase tracking-wider">My Listings</span>
            <span className="text-xl font-mono font-black text-slate-850">{myGarments.length}</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-100 text-center rounded-2xl">
            <span className="text-[11px] block text-slate-400 font-bold uppercase tracking-wider">Garments Sold</span>
            <span className="text-xl font-mono font-black text-slate-850">
              {myGarments.filter(item => item.status === 'sold').length}
            </span>
          </div>
          <div className="p-4 bg-[#fdf2f8] border border-[#fbcfe8] text-center rounded-2xl">
            <span className="text-[11px] block text-pink-500 font-bold uppercase tracking-wider">Total Likes</span>
            <span className="text-xl font-mono font-black text-[#db2777]">{totalMyLikes} ❤️</span>
          </div>
        </div>

        {/* List of active garments published by target user */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
              Wardrobe Publications ({myGarments.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Click item to inspect specs</span>
          </div>

          {myGarments.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
              <Tag size={28} className="mx-auto text-slate-350 stroke-1 block mb-2" />
              <p className="text-xs text-slate-500 font-medium">You haven't listed any garments for sale yet.</p>
              <p className="text-[10px] text-slate-400 mt-1">Tap the purple "Sell Clothing" button at the top navigation to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myGarments.map((garment) => (
                <div
                  key={garment.id}
                  onClick={() => {
                    onClose();
                    onSelectGarment(garment);
                  }}
                  className="group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-150 p-2.5 rounded-2xl flex space-x-3 cursor-pointer transition-all"
                >
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                    <img src={garment.imageUrl} alt={garment.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
                    <h5 className="text-xs font-extrabold text-slate-850 truncate group-hover:text-indigo-650 transition-colors">
                      {garment.title}
                    </h5>
                    <p className="text-[11px] font-bold text-indigo-705 font-mono mt-0.5">${garment.price}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-[#8c8c8c]">Size {garment.size} • {garment.category}</span>
                      <span className={`text-[8px] uppercase font-bold px-1.5 rounded-full ${
                        garment.status === 'available' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {garment.status === 'available' ? "Active" : "Sold"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
