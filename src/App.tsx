import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { User, ClothingItem, ChatMessage } from "./types";
import Navigation from "./components/Navigation";
import FilterSidebar from "./components/FilterSidebar";
import FeedCard from "./components/FeedCard";
import DetailsDrawer from "./components/DetailsDrawer";
import PublishModal from "./components/PublishModal";
import ChatInboxModal from "./components/ChatInboxModal";
import ProfileModal from "./components/ProfileModal";
import LoginModal from "./components/LoginModal";
import { Sparkles, ShoppingBag, PlusCircle, Bookmark, Flame, RotateCw, HelpCircle, FileText } from "lucide-react";
import { buildMarketplaceHeaders, type LoginRequest, firebaseUserToMarketplaceUser, mergeMarketplaceUser } from "./lib/auth";
import { firebaseAuth, firebaseConfigured, googleProvider, turnstileSiteKey } from "./lib/firebase";

export default function App() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [priceRange, setPriceRange] = useState(150);
  const [maxPriceLimit, setMaxPriceLimit] = useState(250);

  // Modal active states
  const [activeItemDetails, setActiveItemDetails] = useState<ClothingItem | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [showSchemaGuideModal, setShowSchemaGuideModal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  const getRequestHeaders = () => ({
    "Content-Type": "application/json",
    ...buildMarketplaceHeaders(currentUser),
  });

  const getAuthenticatedRequestHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...Object.fromEntries(Object.entries(buildMarketplaceHeaders(currentUser)).map(([key, value]) => [key, String(value)])),
    };

    if (firebaseAuth?.currentUser) {
      const token = await firebaseAuth.currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const syncCurrentUser = (nextUser: User | null) => {
    setCurrentUser(nextUser);
    if (nextUser) {
      setUsers((prev) => mergeMarketplaceUser(prev, nextUser));
    }
  };

  // Fetch initial state nodes from Express
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const authHeaders = await getAuthenticatedRequestHeaders();
      const requestList = [
        fetch("/api/items", { headers: authHeaders }),
        fetch("/api/users", { headers: authHeaders }),
      ];

      if (currentUser) {
        requestList.push(fetch("/api/chats", { headers: authHeaders }));
      }

      const [itemsRes, usersRes, chatsRes] = await Promise.all(requestList);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
        // Find maximum price for dynamic limits
        if (itemsData.length > 0) {
          const maxP = Math.max(...itemsData.map((i: ClothingItem) => i.price));
          setMaxPriceLimit(maxP + 50);
          setPriceRange(maxP + 20);
        }
      }

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }

      if (chatsRes && chatsRes.ok) {
        setChats(await chatsRes.json());
      }
    } catch (err) {
      console.warn("Express server connection fallback mode. Syncing standard memory values.", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = firebaseUserToMarketplaceUser(firebaseUser);
        syncCurrentUser(mappedUser);
      } else {
        setCurrentUser(null);
      }

      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authReady) {
      fetchData();
    }
  }, [authReady, currentUser?.id]);

  useEffect(() => {
    if (authReady) {
      setShowLoginModal(!currentUser && !showLanding);
    }
  }, [authReady, currentUser, showLanding]);

  // Sync active details if list is modified (like/comment updates)
  useEffect(() => {
    if (activeItemDetails) {
      const refreshedItem = items.find(i => i.id === activeItemDetails.id);
      if (refreshedItem) {
        setActiveItemDetails(refreshedItem);
      }
    }
  }, [items]);

  // Social action: Like
  const handleLikeItem = async (itemId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/items/${itemId}/like`, { method: "POST", headers: await getAuthenticatedRequestHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(prev => prev.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              likesCount: data.likesCount,
              likedByUserIds: data.likedByUserIds
            };
          }
          return item;
        }));
      }
    } catch (err) {
      // Fallback local memory toggle
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const liked = item.likedByUserIds.includes(currentUser.id);
          const nextLiked = liked 
            ? item.likedByUserIds.filter(id => id !== currentUser.id)
            : [...item.likedByUserIds, currentUser.id];
          return {
            ...item,
            likedByUserIds: nextLiked,
            likesCount: nextLiked.length
          };
        }
        return item;
      }));
    }
  };

  // Social action: Comment post
  const handlePostComment = async (itemId: string, text: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/items/${itemId}/comment`, {
        method: "POST",
        headers: await getAuthenticatedRequestHeaders(),
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        setItems(prev => prev.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              comments: [...item.comments, data.comment]
            };
          }
          return item;
        }));
      }
    } catch (err) {
      // Local fallback
      const mockComment = {
        id: "mock_c_" + Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        text,
        createdAt: new Date().toISOString()
      };
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            comments: [...item.comments, mockComment]
          };
        }
        return item;
      }));
    }
  };

  // Social action: Begin negotiation discussion thread
  const handleStartChatNegotiation = async (itemId: string, receiverId: string, text: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: await getAuthenticatedRequestHeaders(),
        body: JSON.stringify({ itemId, receiverId, text })
      });
      if (res.ok) {
        const data = await res.json();
        setChats(prev => [...prev, data.chat]);
      }
    } catch (err) {
      // Offline fallback local sync
      const mockMessage: ChatMessage = {
        id: "mock_msg_" + Date.now(),
        itemId,
        senderId: currentUser.id,
        senderName: currentUser.username,
        receiverId,
        text,
        createdAt: new Date().toISOString()
      };
      setChats(prev => [...prev, mockMessage]);
    }
  };

  // Social action: Instant Checkout buy
  const handleBuyItem = async (itemId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/items/${itemId}/buy`, { method: "POST", headers: await getAuthenticatedRequestHeaders() });
      if (res.ok) {
        setItems(prev => prev.map(item => {
          if (item.id === itemId) {
            return { ...item, status: "sold" };
          }
          return item;
        }));
      }
    } catch (err) {
      // Local fallback
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, status: "sold" };
        }
        return item;
      }));
    }
  };

  // List user published garments inside marketplace
  const handlePublishListing = async (garmentData: any) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: await getAuthenticatedRequestHeaders(),
        body: JSON.stringify(garmentData)
      });
      if (res.ok) {
        const data = await res.json();
        setItems(prev => [data.item, ...prev]);
        setShowPublishModal(false);
        alert("Success! Your pre-loved wardrobe listing has entered the social feed loop.");
      }
    } catch (err) {
      // Local setup fallback
      const mockItem: ClothingItem = {
        id: "mock_" + Date.now(),
        sellerId: currentUser.id,
        sellerName: currentUser.username,
        sellerAvatar: currentUser.avatar,
        title: garmentData.title,
        description: garmentData.description,
        imageUrl: garmentData.imageUrl,
        category: garmentData.category,
        size: garmentData.size,
        brand: garmentData.brand,
        condition: garmentData.condition,
        price: garmentData.price,
        likesCount: 0,
        likedByUserIds: [],
        comments: [],
        status: "available",
        createdAt: new Date().toISOString()
      };
      setItems(prev => [mockItem, ...prev]);
      setShowPublishModal(false);
      alert("Offline Fallback: Listed piece temporarily stored in browser context!");
    }
  };

  // Profile preferences sync
  const handleUpdateBio = async (newBio: string, stylePrefs: string[]) => {
    if (!currentUser) return;
    const updated = { ...currentUser, bio: newBio, stylePreference: stylePrefs };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    alert("Closet and aesthetic preferences updated successfully!");
  };

  const handleSignOut = async () => {
    try {
      if (firebaseAuth?.currentUser) {
        await signOut(firebaseAuth);
      }
    } catch (error) {
      console.warn("No se pudo cerrar sesion en Firebase.", error);
    } finally {
      setCurrentUser(null);
      setShowProfileModal(false);
      setShowInboxModal(false);
      setShowPublishModal(false);
      setShowLoginModal(false);
      setShowLanding(true);
    }
  };

  const handleEnterMarketplace = () => {
    setShowLanding(false);
    if (!currentUser) {
      setShowLoginModal(true);
    }
  };

  // Profile switches and Firebase auth entrypoint
  const handleLoginRequest = async (request: LoginRequest) => {
    setLoginError(null);

    if (!firebaseAuth || !firebaseConfigured) {
      setLoginError("Firebase no está configurado. Completa las variables VITE_FIREBASE_* para activar este flujo.");
      return;
    }

    if (turnstileSiteKey) {
      if (!request.turnstileToken) {
        setLoginError("Completa el captcha antes de continuar.");
        return;
      }

      const turnstileResponse = await fetch("/api/security/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: request.turnstileToken }),
      });

      if (!turnstileResponse.ok) {
        const payload = await turnstileResponse.json().catch(() => null);
        setLoginError(payload?.error || "No se pudo validar el captcha.");
        return;
      }
    }

    if (request.action === "google") {
      if (!googleProvider) {
        setLoginError("No se pudo preparar el proveedor de Google.");
        return;
      }

      await signInWithPopup(firebaseAuth, googleProvider);
      return;
    }

    if (!request.email || !request.password) {
      setLoginError("Necesitas correo y contraseña para Firebase.");
      return;
    }

    if (!request.turnstileToken && turnstileSiteKey) {
      setLoginError("Completa el captcha antes de continuar.");
      return;
    }

    if (request.action === "register") {
      const result = await createUserWithEmailAndPassword(firebaseAuth, request.email, request.password);
      const displayName = request.displayName || request.email.split("@")[0];
      await updateProfile(result.user, { displayName });
      return;
    }

    await signInWithEmailAndPassword(firebaseAuth, request.email, request.password);
  };

  // Quick action: Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedSize("All");
    setSelectedCondition("All");
    setPriceRange(maxPriceLimit);
  };

  // Feed processing computations
  const processedItems = items.filter((item) => {
    // Search query alignment
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

    // Category
    const matchesCategory = selectedCategory === "All" || item.category.toLowerCase() === selectedCategory.toLowerCase();

    // Size
    const matchesSize = selectedSize === "All" || item.size === selectedSize;

    // Condition
    const matchesCondition = selectedCondition === "All" || item.condition === selectedCondition;

    // Price
    const matchesPrice = item.price <= priceRange;

    return matchesSearch && matchesCategory && matchesSize && matchesCondition && matchesPrice;
  });

  if (showLanding) {
    return (
      <div className="min-h-screen bg-linear-to-b from-amber-50 via-white to-orange-50 text-slate-900">
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-4 py-1 text-xs font-bold uppercase tracking-wider">
                Marketplace de segunda mano
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-tight text-slate-900">
                Compra y vende ropa con estilo sostenible.
              </h1>
              <p className="text-sm md:text-base text-slate-600 max-w-xl leading-relaxed">
                Publica prendas, conecta con compradores y negocia en tiempo real. Todo en un solo lugar con autenticacion segura.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleEnterMarketplace}
                  className="px-6 py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Entrar al marketplace
                </button>
                <button
                  onClick={() => setShowSchemaGuideModal(true)}
                  className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Ver info tecnica
                </button>
              </div>
            </div>

            <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-xl shadow-orange-100/60 space-y-4">
              <h2 className="text-xl font-extrabold">Que puedes hacer aqui</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                <li>• Publicar prendas y gestionar tu perfil.</li>
                <li>• Filtrar por categoria, talla, condicion y precio.</li>
                <li>• Dar likes, comentar y abrir chats de compra.</li>
                <li>• Iniciar sesion con Firebase y proteccion captcha.</li>
              </ul>
            </div>
          </div>
        </section>

        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLogin={handleLoginRequest}
            currentUser={currentUser}
            firebaseConfigured={firebaseConfigured}
            loginError={loginError}
            canClose={!!currentUser}
          />
        )}

        {showSchemaGuideModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-3">
              <h3 className="font-extrabold text-slate-900">Info tecnica</h3>
              <p className="text-sm text-slate-600">
                El esquema SQL y el setup local estan documentados en `database_setup.md` y `README.dev.md`.
              </p>
              <button
                onClick={() => setShowSchemaGuideModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 leading-normal">
      
      {/* Complete Top bar Navigation */}
      <Navigation
        currentUser={currentUser}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenInbox={() => setShowInboxModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenLogin={() => setShowLoginModal(true)}
        onSignOut={handleSignOut}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        unreadCount={chats.length > 0 ? 1 : 0}
      />

      {/* Main Container Core */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left hand: Filter dashboard */}
        <div className="lg:col-span-1">
          <FilterSidebar
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedCondition={selectedCondition}
            setSelectedCondition={setSelectedCondition}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            maxPriceLimit={maxPriceLimit}
            items={items}
            onClearFilters={handleClearFilters}
          />

          {/* PostgreSQL manual inspection trigger card for Local developers */}
          <div className="mt-6 p-5 bg-white border border-slate-100 rounded-3xl space-y-3.5 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🗂️</span>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Postgres Schema & SQL</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              We've prepared local integration scripts, table creation formulas, and mock seed records to boot your production Postgres container in under 2 minutes.
            </p>
            <button
              onClick={() => setShowSchemaGuideModal(true)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <FileText size={14} />
              <span>Inspect Database Schema</span>
            </button>
          </div>
        </div>

        {/* Right hand / main section: Social garment feed streams */}
        <div className="lg:col-span-3 space-y-6">

          {/* Social Showcase banner frame */}
          <div className="bg-linear-to-r from-pink-500 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
            {/* Ambient visual overlay orbs */}
            <div className="absolute top-0 right-0 w-80 h-full bg-white/5 skew-x-12 shrink-0"></div>
            
            <div className="relative z-10 max-w-xl space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-pink-200">
                <Flame size={14} className="animate-pulse" />
                <span>HOT DISCOVER FEED</span>
              </div>
              
              <h2 className="text-2xl md:text-3.5xl font-extrabold font-display tracking-tight leading-tight">
                Express yourself through pre-loved garments.
              </h2>
              
              <p className="text-xs md:text-sm text-indigo-100 leading-relaxed font-light">
                Vote with likes on street aesthetics, speak to designers, propose trade variables, or register your own closet secrets immediately.
              </p>
            </div>
          </div>

          {/* Feed Filters & Statistics header bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="leading-tight">
              <h3 className="font-black text-slate-900 text-lg">Social Stream</h3>
              <p className="text-xs text-slate-400 font-semibold font-sans">
                Showing <b>{processedItems.length}</b> matches out of <b>{items.length}</b> live listings
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                <span>Active Filter: </span>
                <strong className="ml-1 uppercase text-[10px] bg-indigo-600 text-white px-2 rounded-full font-mono">{selectedCategory}</strong>
              </span>
            </div>
          </div>

          {/* Feed grid cards */}
          {isLoading ? (
            <div className="py-24 text-center space-y-4">
              <RotateCw className="animate-spin text-indigo-600 mx-auto" size={36} />
              <p className="text-xs text-slate-500 font-bold">Unpacking the vintage wardrobe vaults...</p>
            </div>
          ) : processedItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xs p-8 space-y-4">
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                🧥
              </div>
              <h4 className="font-bold text-slate-800">No matching garments found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Try loosening your maximum maximum price sliding controls or switching to "🏷️ All Styles" category. Alternatively, become the first to list a piece!
              </p>
              <button
                onClick={handleClearFilters}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-100"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedItems.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  currentUser={currentUser}
                  onLike={handleLikeItem}
                  onSelect={setActiveItemDetails}
                />
              ))}
            </div>
          )}

        </div>

      </main>

      {/* Footer Segment */}
      <footer className="bg-slate-900 text-slate-450 text-xs py-12 border-t border-slate-850">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-center md:text-left">
            <h4 className="text-white font-extrabold font-display text-lg tracking-tight">VIBEWEAR SOCIAL MARKETPLACE</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Building circular economy fashion loops on resilient Express + PostgreSQL architectures.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-semibold text-[11px]">
            <a href="#github" className="hover:text-white" onClick={() => setShowSchemaGuideModal(true)}>Postgres SQL tables</a>
            <span>•</span>
            <span className="text-[#a7f3d0]">🔐 Security Ready Architecture</span>
            <span>•</span>
            <span>Local Instance Port 3000</span>
          </div>
        </div>
      </footer>

      {/* Details drawer panel */}
      {activeItemDetails && (
        <DetailsDrawer
          item={activeItemDetails}
          currentUser={currentUser}
          onClose={() => setActiveItemDetails(null)}
          onLike={handleLikeItem}
          onComment={handlePostComment}
          onStartChat={handleStartChatNegotiation}
          onBuy={handleBuyItem}
        />
      )}

      {/* Modal overlays */}
      {showPublishModal && (
        <PublishModal
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublishListing}
        />
      )}

      {/* Direct Negotiation Inbox Modal */}
      {showInboxModal && (
        <ChatInboxModal
          onClose={() => setShowInboxModal(false)}
          currentUser={currentUser}
          chats={chats}
          items={items}
          onSendMessage={handleStartChatNegotiation}
        />
      )}

      {/* Connected Profile Details */}
      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          items={items}
          onUpdateBio={handleUpdateBio}
          onSelectGarment={setActiveItemDetails}
          onSignOut={handleSignOut}
        />
      )}

      {/* Switching / Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginRequest}
          currentUser={currentUser}
          firebaseConfigured={firebaseConfigured}
          loginError={loginError}
          canClose={!!currentUser}
        />
      )}

      {/* Code / Postgres manual help model */}
      {showSchemaGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto font-mono scrollbar-thin">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🛠️</span>
                <div>
                  <h4 className="text-sm font-extrabold text-white">PostgreSQL Bootstrapper Guide</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Manual injection via psql container</p>
                </div>
              </div>
              <button
                onClick={() => setShowSchemaGuideModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg cursor-pointer transition-colors"
              >
                Close View
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                This schema has been generated specifically for our metadata specifications. You can execute this sequence directly inside your local Postgres schema administrator to support offline data bindings.
              </p>

              <div>
                <span className="text-[10px] uppercase text-indigo-400 font-bold block mb-1">Step 1: Instantiating Tables</span>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[10px] overflow-x-auto whitespace-pre leading-relaxed select-all">
{`CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(1000) NOT NULL,
    bio TEXT,
    style_preferences VARCHAR(255)[] NOT NULL,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating NUMERIC(3, 2) DEFAULT 5.00
);

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
    price NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

              <div>
                <span className="text-[10px] uppercase text-indigo-400 font-bold block mb-1">Step 2: Securing Connection Variables</span>
                <p className="text-xs text-slate-400 font-sans leading-relaxed mb-2">
                  Configure your environment parameters inside your development computer manually:
                </p>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-[11px] text-pink-300">
                  PGHOST=localhost <br />
                  PGPORT=5432 <br />
                  PGDATABASE=used_clothing_social <br />
                  PGUSER=postgres <br />
                  PGPASSWORD=******
                </div>
              </div>

              <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-900/30 text-xs font-sans text-indigo-200">
                💡 Full schema specifications and seeding arrays have been permanently baked into <b>"/database_setup.md"</b> at your project root tree!
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
