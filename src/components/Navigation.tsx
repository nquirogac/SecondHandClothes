import React from "react";
import { User } from "../types";
import { ShoppingBag, Search, PlusCircle, MessageCircle, LogOut } from "lucide-react";

interface NavigationProps {
  currentUser: User | null;
  onOpenPublish: () => void;
  onOpenInbox: () => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onSignOut: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  unreadCount: number;
}

export default function Navigation({
  currentUser,
  onOpenPublish,
  onOpenInbox,
  onOpenProfile,
  onOpenLogin,
  onSignOut,
  searchQuery,
  setSearchQuery,
  unreadCount
}: NavigationProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenProfile}>
            <div className="h-10 w-10 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-purple-200">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-linear-to-r from-slate-900 via-indigo-950 to-purple-900 bg-clip-text text-transparent">
                VIBE<span className="font-light text-indigo-600">WEAR</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                used fashion circle
              </p>
            </div>
          </div>

          {/* Social Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search styles, retro garments, brands, sizes..."
                className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full bg-slate-50 text-slate-850 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Actions & Profiles */}
          <div className="flex items-center space-x-4">
            
            {/* Publish Button */}
            <button
              onClick={onOpenPublish}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-100 cursor-pointer active:scale-95 transition-all"
            >
              <PlusCircle size={17} />
              <span>Sell Clothing</span>
            </button>

            {/* Inbox Button */}
            <button
              onClick={onOpenInbox}
              className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              title="Chat Inbox"
            >
              <MessageCircle size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 bg-pink-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile avatar */}
            {currentUser ? (
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-100">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-100 group-hover:ring-indigo-300 transition-all"
                  />
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-slate-850">@{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400 font-medium">✨ {currentUser.rating} Rating</p>
                  </div>
                </button>
                
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-all cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-bold rounded-full transition-all cursor-pointer"
              >
                Log In / Sign Up
              </button>
            )}

          </div>

        </div>
      </div>
      
      {/* Mobile Search Bar Row */}
      <div className="px-4 pb-3.5 md:hidden">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search styles, vintage garments, sizes..."
            className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full bg-slate-50 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}
