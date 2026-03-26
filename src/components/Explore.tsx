import { useState, useEffect } from 'react';
import { db, collection, getDocs, onSnapshot, query, where, addDoc, serverTimestamp, Timestamp } from '../firebase';
import { ShoppingCart, Star, Clock, MapPin, ChefHat, Search, Filter, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ExploreProps {
  userProfile: any;
}

export default function Explore({ userProfile }: ExploreProps) {
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderStatus, setOrderStatus] = useState<{ [key: string]: 'idle' | 'ordering' | 'success' }>({});

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const response = await fetch('/api/dishes');
        if (response.ok) {
          const data = await response.json();
          setFoodItems(data);
        }
      } catch (err) {
        console.error("Failed to fetch dishes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, []);

  const handleOrder = async (food: any) => {
    if (userProfile.role === 'chef') {
      alert("Chefs cannot place orders. Please use a customer account.");
      return;
    }

    setOrderStatus(prev => ({ ...prev, [food.id]: 'ordering' }));
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userProfile.uid,
          customerName: userProfile.name,
          chefId: food.chefId,
          chefName: food.chefName,
          dishId: food.id,
          dishName: food.name,
          price: food.price,
          quantity: 1,
          total: food.price,
          address: 'Default Address', // In a real app, this would come from a form
        }),
      });

      if (response.ok) {
        setOrderStatus(prev => ({ ...prev, [food.id]: 'success' }));
        setTimeout(() => {
          setOrderStatus(prev => ({ ...prev, [food.id]: 'idle' }));
        }, 3000);
      } else {
        throw new Error("Failed to place order");
      }
    } catch (error) {
      console.error("Order failed", error);
      setOrderStatus(prev => ({ ...prev, [food.id]: 'idle' }));
    }
  };

  const categories = ['All', ...Array.from(new Set(foodItems.map(item => item.category).filter(Boolean)))];

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.chefName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-gray-100 shadow-sm"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-orange-500 text-white p-12 md:p-20 shadow-2xl shadow-orange-100">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight italic">
            Hygienic <br /> Homemade <br /> Meals.
          </h1>
          <p className="text-orange-50 text-xl opacity-90 mb-10 leading-relaxed">
            Discover the best homemade food from passionate chefs in your neighborhood.
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for dishes or chefs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all shadow-lg"
            />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full hidden md:block">
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000" 
            alt="Food" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-orange-500"></div>
        </div>
      </section>

      {/* Food Grid */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Available Dishes</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: any) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-100'
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <Filter className="h-4 w-4" />
            <span>{filteredItems.length} items found</span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Utensils className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No dishes found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg">
                    <span className="text-xl font-black text-orange-600 tracking-tight">${item.price}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    <span>Fresh Today</span>
                  </div>
                </div>
                
                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex items-center gap-2 text-orange-500 mb-3">
                    <ChefHat className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{item.chefName}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-500 transition-colors leading-tight">
                    {item.name}
                  </h3>
                  
                  <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-bold text-gray-700">4.9</span>
                    </div>
                    
                    <button
                      onClick={() => handleOrder(item)}
                      disabled={orderStatus[item.id] === 'ordering' || orderStatus[item.id] === 'success'}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                        orderStatus[item.id] === 'success'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-100'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-100 hover:-translate-y-1'
                      }`}
                    >
                      {orderStatus[item.id] === 'ordering' ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : orderStatus[item.id] === 'success' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Ordered!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5" />
                          Order Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Utensils(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}
