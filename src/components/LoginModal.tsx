import React, { useState } from "react";
import { X, Mail, ShieldAlert, Sparkles, Check, RefreshCw } from "lucide-react";
import { User } from "../types";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (credentials: { userId?: string; username: string; email?: string }) => void;
  currentUser: User | null;
  usersList: User[];
}

export default function LoginModal({
  onClose,
  onLogin,
  currentUser,
  usersList
}: LoginModalProps) {
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput) {
      alert("Please provide a valid username to log in.");
      return;
    }
    onLogin({
      username: usernameInput.toLowerCase().replace(/\s+/g, "_"),
      email: emailInput || `${usernameInput}@example.com`
    });
    setSubmitSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSwitchAccount = (user: User) => {
    onLogin({ userId: user.id, username: user.username });
    alert(`Switched active profile to @${user.username}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-150">
          <div className="flex items-center space-x-2">
            <Mail className="text-indigo-650" size={22} />
            <div>
              <h3 className="font-extrabold text-slate-850 text-lg leading-tight">Switch / Join Member Profile</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulate multi-user social actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-3 border border-slate-200 text-slate-400 hover:text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Current status info */}
        {currentUser && (
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between leading-none">
            <div className="flex items-center space-x-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Connected as</p>
                <p className="text-xs font-black text-slate-850 mt-1">@{currentUser.username}</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500 text-white rounded-full px-2.5 py-0.5 font-bold font-sans">
              ● Active
            </span>
          </div>
        )}

        {/* Form to connect as new user */}
        {submitSuccess ? (
          <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-150 space-y-2">
            <Check size={28} className="mx-auto text-emerald-500 animate-bounce" />
            <h4 className="text-sm font-bold text-emerald-900">Sign In success!</h4>
            <p className="text-xs text-emerald-705">Synergizing closet presets & social network nodes...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                Enter Stylist Username *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. thrifty_maris"
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                Designated Email (Optional)
              </label>
              <input
                type="email"
                placeholder="maris@example.com"
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all cursor-pointer active:scale-95"
              >
                Join / Sign In
              </button>
            </div>
          </form>
        )}

        {/* Testing Multi-user Switch Panel */}
        <div className="space-y-3 pt-4 border-t border-slate-150">
          <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
            <RefreshCw size={14} className="text-indigo-650" />
            <h4 className="text-xs uppercase tracking-wider text-slate-700">Simulate Social Testing Nodes</h4>
          </div>
          
          <p className="text-[11px] text-slate-400 leading-normal font-sans">
            Switch between different aesthetic catalog creators below to post comments on clothes, like each other's lists, or test direct chat negotiation exchanges!
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar">
            {usersList.map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  disabled={isSelected}
                  onClick={() => handleSwitchAccount(user)}
                  className={`p-2 rounded-xl text-left border flex items-center space-x-2 transition-all ${
                    isSelected
                      ? "border-emerald-250 bg-emerald-50/40 opacity-70 cursor-not-allowed"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer"
                  }`}
                >
                  <img src={user.avatar} className="h-7 w-7 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate leading-none">@{user.username}</p>
                    <p className="text-[9px] text-[#8e8e8e] truncate mt-0.5">{user.stylePreference.slice(0, 2).join(' #')}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PostgreSQL Security Layer Disclaimer */}
        <div className="p-3 bg-indigo-50 rounded-xl flex items-start space-x-2 text-[10px] text-indigo-905 font-medium leading-relaxed">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Architectural Roadmap Notice:</strong> When deploying this to production, you can replace this manual profile-switcher with standard JWT authentication (using bcrypt + passport-jwt on PostgreSQL tables).
          </span>
        </div>

      </div>
    </div>
  );
}
