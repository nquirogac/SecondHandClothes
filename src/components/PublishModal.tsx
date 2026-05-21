import React, { useState } from "react";
import { X, Sparkles, Image as ImageIcon, Camera } from "lucide-react";

interface PublishModalProps {
  onClose: () => void;
  onPublish: (itemData: {
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    size: string;
    brand: string;
    condition: string;
    price: number;
  }) => void;
}

const PRESET_IMAGES = [
  {
    name: "Classic Sweatshirt",
    url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Oversized Leather",
    url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Utility Cargo",
    url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Vintage Cardigan",
    url: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Fancy Camel Trench",
    url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Pastel Silk Dress",
    url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800"
  }
];

export default function PublishModal({ onClose, onPublish }: PublishModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Vintage");
  const [size, setSize] = useState("M");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [price, setPrice] = useState("");
  const [customUrlMode, setCustomUrlMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !category || !size || !condition) {
      alert("Please fill in all mandatory clothing parameters.");
      return;
    }

    // Default image if empty
    const selectedImage = imageUrl || PRESET_IMAGES[0].url;

    onPublish({
      title,
      description,
      imageUrl: selectedImage,
      category,
      size,
      brand: brand || "Unbranded / Unique Piece",
      condition,
      price: Number(price),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6 scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Camera className="text-indigo-600" size={24} />
            <div>
              <h3 className="text-xl font-extrabold text-slate-850 font-display">List Pre-loved Fashion</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Publish item into our global network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Hand: Garment info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1992 oversized denim chore shirt"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Story & Description</label>
                <textarea
                  placeholder="Tell the community about historical context, fabric feel, or exact sizing measurements..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vintage Levi's"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Price ($USD) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="45"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Vibe/Category</label>
                  <select
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Vintage">Vintage</option>
                    <option value="Streetwear">Streetwear</option>
                    <option value="Casual">Casual</option>
                    <option value="Formal">Formal</option>
                    <option value="Sportswear">Sportswear</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Unisex Size</label>
                  <select
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="One Size">One Size</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Condition</label>
                  <select
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Right Hand: Visual Selectors */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">Choose Apparel Image</span>
                
                {/* Selector interface */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4">
                  <button
                    type="button"
                    onClick={() => setCustomUrlMode(false)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      !customUrlMode ? "bg-white text-indigo-750 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Preset Wardrobe
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomUrlMode(true)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      customUrlMode ? "bg-white text-indigo-750 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Image Web URL
                  </button>
                </div>

                {/* Preset Picker */}
                {!customUrlMode ? (
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setImageUrl(img.url)}
                        className={`group relative h-16 rounded-xl overflow-hidden cursor-pointer border ${
                          imageUrl === img.url 
                            ? "border-indigo-600 ring-2 ring-indigo-200" 
                            : "border-slate-200"
                        }`}
                        title={img.name}
                      >
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/40 text-[9px] text-white font-bold py-0.5 text-center truncate">
                          {img.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="Paste clothing photo layout url (https://...)"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm text-slate-705 mb-2 font-mono"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <p className="text-[10px] font-semibold text-slate-400">
                      Supports direct link formats like Unsplash or Pinterest apparel cataloging hooks.
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Image preview frame */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-4">
                <div className="h-20 w-20 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                  <img
                    src={imageUrl || PRESET_IMAGES[0].url}
                    alt="Garment showcase preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-750 truncate">
                    {title || "Pending Garment Title"}
                  </h4>
                  <p className="text-[10px] text-[#4f46e5] font-black font-mono">
                    {price ? `$${price}.00` : "$0.00"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Category: <span className="font-bold text-slate-600">{category}</span> • Size {size}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Prompt banner explaining easy integration */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start space-x-3">
            <span className="text-xl">🛡️</span>
            <p className="text-xs text-indigo-900 font-medium leading-relaxed">
              <strong>Security Protocol:</strong> Your seller rating stands at 5.0★. High-quality descriptions, raw daylight layout shots, and responsive chat negotiations build trust fast!
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-750 hover:to-purple-750 text-white text-sm font-bold shadow-lg shadow-indigo-100 cursor-pointer active:scale-95 transition-all flex items-center space-x-1.5"
            >
              <Sparkles size={16} />
              <span>Publish Now</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
