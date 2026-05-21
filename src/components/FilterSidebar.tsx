import React from "react";
import { SlidersHorizontal, Tag, Heart, Shield, Sparkles, Filter } from "lucide-react";
import { ClothingItem } from "../types";

interface FilterSidebarProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  selectedCondition: string;
  setSelectedCondition: (cond: string) => void;
  priceRange: number;
  setPriceRange: (range: number) => void;
  maxPriceLimit: number;
  items: ClothingItem[];
  onClearFilters: () => void;
}

export default function FilterSidebar({
  selectedCategory,
  setSelectedCategory,
  selectedSize,
  setSelectedSize,
  selectedCondition,
  setSelectedCondition,
  priceRange,
  setPriceRange,
  maxPriceLimit,
  items,
  onClearFilters
}: FilterSidebarProps) {
  const categories = ["All", "Vintage", "Streetwear", "Casual", "Formal", "Sportswear"];
  const sizes = ["All", "XS", "S", "M", "L", "XL", "XXL"];
  const conditions = ["All", "Brand New", "Like New", "Excellent", "Good", "Fair"];

  // Calculate statistics for the marketplace dashboard feeling (rich/modern style)
  const totalItems = items.length;
  const availableItems = items.filter(i => i.status === 'available').length;
  const soldItems = items.filter(i => i.status === 'sold').length;
  const averagePrice = totalItems > 0 
    ? Math.round(items.reduce((acc, curr) => acc + curr.price, 0) / totalItems)
    : 0;

  return (
    <aside className="space-y-6">
      
      {/* Social Live Marketplace Metrics (Anti-Minimalist Rich styling) */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-pink-500 rounded-full blur-3xl opacity-45"></div>
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-505 rounded-full blur-3xl opacity-35"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] uppercase font-bold tracking-widest text-[#f472b6] mb-3">
            <Sparkles size={11} />
            <span>Community Activity</span>
          </div>

          <h3 className="text-lg font-bold font-display tracking-tight text-white mb-4">Marketplace Pulse</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 backdrop-blur-xs rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs block font-medium">For Sale</span>
              <span className="text-2xl font-extrabold text-white">{availableItems} <span className="text-xs text-emerald-400 font-semibold">● Live</span></span>
            </div>
            <div className="p-3 bg-white/5 backdrop-blur-xs rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs block font-medium">Avg Price</span>
              <span className="text-2xl font-extrabold text-[#fbcfe8]">${averagePrice}</span>
            </div>
            <div className="p-3 bg-white/5 backdrop-blur-xs rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs block font-medium">Adopted</span>
              <span className="text-2xl font-extrabold text-indigo-200">{soldItems} items</span>
            </div>
            <div className="p-3 bg-white/5 backdrop-blur-xs rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs block font-medium">Safe Escrow</span>
              <span className="text-[#a7f3d0] font-bold text-xs flex items-center space-x-1 mt-1">
                <Shield size={12} />
                <span>100% Guard</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-800">
            <Filter size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm tracking-tight">Refine Wardrobe</h3>
          </div>
          <button
            onClick={onClearFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-805 cursor-pointer underline hover:no-underline"
          >
            Clear All
          </button>
        </div>

        {/* Categories Grid selection */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748b] block mb-3">
            Garment Vibe / Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102"
                      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {cat === "All" ? "🏷️ All Styles" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sizes Selection */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748b] block mb-3">
            Sizing (Unisex Fits)
          </label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((sz) => {
              const active = selectedSize === sz;
              return (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`h-9 min-w-9 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    active
                      ? "bg-indigo-650 text-white shadow-xs border border-indigo-600 ring-2 ring-indigo-200"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slider for Price Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748b]">
              Maximum Price
            </label>
            <span className="font-mono text-sm font-bold text-indigo-700">${priceRange}</span>
          </div>
          <input
            type="range"
            min="20"
            max={maxPriceLimit || 200}
            step="5"
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#f1f5f9] rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
            <span>$20</span>
            <span>${maxPriceLimit || 200}</span>
          </div>
        </div>

        {/* Condition Checkboxes */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748b] block mb-3">
            Garment Condition Status
          </label>
          <div className="space-y-2">
            {conditions.map((cond) => {
              const active = selectedCondition === cond;
              return (
                <button
                  key={cond}
                  onClick={() => setSelectedCondition(cond)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer border transition-all ${
                    active
                      ? "bg-indigo-50 border-indigo-250 text-indigo-900 font-bold"
                      : "bg-white border-slate-100 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>{cond === "All" ? "✨ All Conditions" : cond}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-indigo-600"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vintage Care Tip Card */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-amber-800 text-[10px] uppercase font-bold tracking-wider mb-1">🧼 Wise Wardrobe Circle</p>
          <p className="text-amber-900/90 text-xs leading-relaxed">
            Buying pre-loved clothes reduces dye water waste by up to 85%. Wash vintage silks and heavy woolen threads with delicate soaps, laying them flat to dry!
          </p>
        </div>

      </div>
    </aside>
  );
}
