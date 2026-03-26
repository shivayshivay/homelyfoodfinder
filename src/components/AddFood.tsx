import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { PlusCircle, Image as ImageIcon, DollarSign, Utensils, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import ErrorMessage from './ErrorMessage';

interface AddFoodProps {
  userProfile: any;
}

export default function AddFood({ userProfile }: AddFoodProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: 'Main Course',
    isAvailable: true,
  });

  const categories = ["Main Course", "Breakfast", "Desserts", "Snacks", "Beverages"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.description || !formData.price || !formData.imageUrl) {
        throw new Error("All fields are required.");
      }

      const response = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chefId: userProfile.uid,
          chefName: userProfile.name,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          image: formData.imageUrl,
          category: formData.category,
          isAvailable: formData.isAvailable,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to list dish");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-orange-500 font-medium mb-10 transition-colors group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Explore</span>
      </button>

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 md:grid-cols-2">
        <div className="p-12 bg-orange-500 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="bg-white/20 p-4 rounded-2xl w-fit mb-8 backdrop-blur-sm">
              <PlusCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight italic">
              Share Your <br /> Culinary <br /> Masterpiece.
            </h2>
            <p className="text-orange-50 text-lg opacity-90 leading-relaxed max-w-xs">
              List your homemade dish and reach hundreds of hungry neighbors.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-400 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-600 rounded-full opacity-50 blur-3xl"></div>
        </div>

        <div className="p-12">
          {success ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-green-100 p-6 rounded-full mb-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Dish Listed Successfully!</h3>
              <p className="text-gray-500">Redirecting you to the explore page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Dish Name</label>
                <div className="relative group">
                  <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grandma's Special Lasagna"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about the ingredients, taste, and love you put into this dish..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Price ($)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Image URL</label>
                  <div className="relative group">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="url"
                      required
                      placeholder="Paste image link..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-orange-100 transition-colors">
                <div>
                  <label className="block text-sm font-bold text-gray-900">Available for Order</label>
                  <p className="text-xs text-gray-500 mt-1">Customers can see and order this dish immediately.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 disabled:opacity-50 transition-all shadow-xl shadow-orange-100 hover:-translate-y-1 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <PlusCircle className="h-6 w-6" />
                    List Dish Now
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
