import React, { useState } from "react";
import { X, Send, MessageCircle, MessageSquare, AlertCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { ChatMessage, User, ClothingItem } from "../types";

interface ChatInboxModalProps {
  onClose: () => void;
  currentUser: User | null;
  chats: ChatMessage[];
  items: ClothingItem[];
  onSendMessage: (itemId: string, receiverId: string, text: string) => void;
}

export default function ChatInboxModal({
  onClose,
  currentUser,
  chats,
  items,
  onSendMessage
}: ChatInboxModalProps) {
  const [activeItemConversation, setActiveItemConversation] = useState<string | null>(null);
  const [activeReceiverId, setActiveReceiverId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4">
          <AlertCircle size={40} className="mx-auto text-rose-500" />
          <h3 className="font-bold text-slate-800">Connection required</h3>
          <p className="text-xs text-slate-500 leading-normal">
            Please close this tab and specify or connect your email first to negotiate.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold"
          >
            Close Dialog
          </button>
        </div>
      </div>
    );
  }

  // Group messages by item, then find the corresponding seller/buyer
  // Unique combinations of (itemId, otherParticipantUserId)
  interface ChatThread {
    itemId: string;
    itemTitle: string;
    itemImage: string;
    otherUserId: string;
    otherUserName: string;
    lastMessage: string;
    lastMessageTime: string;
    messages: ChatMessage[];
  }

  const threadsMap = new Map<string, ChatThread>();

  chats.forEach((msg) => {
    const isSender = msg.senderId === currentUser.id;
    const otherUserId = isSender ? msg.receiverId : msg.senderId;
    const otherUserName = isSender ? (items.find(i => i.sellerId === otherUserId)?.sellerName || "community_member") : msg.senderName;
    const associatedItem = items.find(i => i.id === msg.itemId);
    
    const key = `${msg.itemId}_${otherUserId}`;

    if (!threadsMap.has(key)) {
      threadsMap.set(key, {
        itemId: msg.itemId,
        itemTitle: associatedItem ? associatedItem.title : "Faded Vintage Piece",
        itemImage: associatedItem ? associatedItem.imageUrl : "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=200",
        otherUserId,
        otherUserName,
        lastMessage: msg.text,
        lastMessageTime: msg.createdAt,
        messages: [msg]
      });
    } else {
      const existing = threadsMap.get(key)!;
      existing.messages.push(msg);
      // Keep last message up to date because sequential sorting represents ordering
      existing.lastMessage = msg.text;
      existing.lastMessageTime = msg.createdAt;
    }
  });

  const threads = Array.from(threadsMap.values()).sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  // Set default active thread if none set and there is at least one thread
  if (!activeItemConversation && threads.length > 0) {
    setActiveItemConversation(threads[0].itemId);
    setActiveReceiverId(threads[0].otherUserId);
  }

  const activeThread = threads.find(
    t => t.itemId === activeItemConversation && t.otherUserId === activeReceiverId
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeItemConversation || !activeReceiverId) return;
    onSendMessage(activeItemConversation, activeReceiverId, inputText);
    setInputText("");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[80vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        
        {/* Header bar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <MessageSquare size={22} className="text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Vibe Negotiation Circle</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Secure direct chat with clothing sellers and buyers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Exit Inbox
          </button>
        </div>

        {/* Messaging frame */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Threads column */}
          <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto no-scrollbar ${
            activeThread ? "hidden md:flex" : "flex"
          }`}>
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Garments Under Negotiation
              </span>
            </div>

            {threads.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <MessageCircle size={32} className="mx-auto text-slate-300" />
                <p className="text-xs text-slate-500 font-medium">No live negotiations active.</p>
                <p className="text-[10px] text-slate-400">
                  Tap "Negotiate" on any style detailing drawer to bargain price terms with vendors!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {threads.map((thread) => {
                  const isActive = activeItemConversation === thread.itemId && activeReceiverId === thread.otherUserId;
                  return (
                    <button
                      key={`${thread.itemId}_${thread.otherUserId}`}
                      onClick={() => {
                        setActiveItemConversation(thread.itemId);
                        setActiveReceiverId(thread.otherUserId);
                      }}
                      className={`w-full text-left p-4 flex space-x-3 transition-colors hover:bg-slate-50/80 cursor-pointer ${
                        isActive ? "bg-indigo-50/45 border-l-4 border-indigo-650" : "bg-white"
                      }`}
                    >
                      <img
                        src={thread.itemImage}
                        alt="negotiation piece thumbnail"
                        className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-100"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between header-row">
                          <span className="text-xs font-black text-slate-800">@{thread.otherUserName}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-bold">
                            {new Date(thread.lastMessageTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-indigo-700 truncate">{thread.itemTitle}</p>
                        <p className="text-xs text-[#a0a0a0] truncate">{thread.lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Messages Column view */}
          <div className={`flex-1 flex flex-col bg-slate-50/50 ${
            !activeThread ? "hidden md:flex items-center justify-center p-8 bg-white" : "flex"
          }`}>

            {activeThread ? (
              <>
                {/* Active negotiation header */}
                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 leading-tight">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setActiveItemConversation(null);
                        setActiveReceiverId(null);
                      }}
                      className="p-1 px-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 cursor-pointer mr-1 md:hidden"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <img
                      src={activeThread.itemImage}
                      alt="Active garment design"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-extrabold text-[#111827]">
                        Bargaining over: <span className="text-indigo-600 font-mono font-bold">{activeThread.itemTitle}</span>
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400">
                        Chatting with <span className="text-slate-700 font-bold">@{activeThread.otherUserName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    <span>● Active Stream</span>
                  </div>
                </div>

                {/* Messages scroll box */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar flex flex-col justify-end">
                  <div className="space-y-4 overflow-y-auto max-h-full">
                    {activeThread.messages.map((msg) => {
                      const isOwnMessage = msg.senderId === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-xs md:max-w-sm rounded-2xl p-3.5 text-xs select-text ${
                            isOwnMessage
                              ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100 font-medium"
                              : "bg-white text-slate-850 rounded-bl-none border border-slate-100 shadow-xs leading-relaxed"
                          }`}>
                            <p>{msg.text}</p>
                            <span className={`block text-[9px] font-bold text-right mt-1.5 font-mono leading-none ${
                              isOwnMessage ? "text-indigo-200" : "text-slate-400"
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submitting formulation */}
                <form onSubmit={handleSend} className="p-4 border-t border-slate-150 bg-white shrink-0 flex items-center space-x-2.5">
                  <input
                    type="text"
                    required
                    placeholder={`Propose a trade deal to @${activeThread.otherUserName}...`}
                    className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-colors"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center space-y-3">
                <ShoppingBag size={48} className="mx-auto text-indigo-200 animate-float" />
                <h4 className="text-sm font-extrabold text-slate-800">Negotiation Center</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Select a discussion thread from the left pane to haggle over sizing fabric weight, request custom measurements, or lock shipping deals instantly.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
