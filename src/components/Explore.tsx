import { useState, useEffect, useRef } from 'react';
import { db, collection, getDocs, onSnapshot, query, where, addDoc, serverTimestamp, Timestamp } from '../firebase';
import { ShoppingCart, Star, Clock, MapPin, ChefHat, Search, Filter, ArrowRight, CheckCircle2, MessageSquare, X, CreditCard, Loader2 } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import ChatModal from './ChatModal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places'];

interface ExploreProps {
  userProfile: any;
}

const CheckoutForm = ({ food, quantity, deliveryAddress, onConfirm, onCancel, setGlobalError }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!deliveryAddress.trim()) {
      setGlobalError("Please enter a delivery address to proceed.");
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: food.price * quantity }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { clientSecret } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setGlobalError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onConfirm();
      }
    } catch (err) {
      setGlobalError((err as Error).message || 'An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        {isProcessing ? 'Processing...' : `Pay $${(food.price * quantity).toFixed(2)}`}
      </button>
    </form>
  );
};

export default function Explore({ userProfile }: ExploreProps) {
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderStatus, setOrderStatus] = useState<{ [key: string]: 'idle' | 'ordering' | 'success' }>({});
  const [userRatings, setUserRatings] = useState<{ [dishId: string]: number }>({});
  const [quantities, setQuantities] = useState<{ [dishId: string]: number }>({});
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', // Ensure this is set in .env
    libraries,
  });

  const onLoad = (autocompleteObj: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteObj);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setDeliveryAddress(place.formatted_address);
      }
    }
  };

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

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setAutocompleteSuggestions([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const suggestions = new Set<string>();

    foodItems.forEach(item => {
      if (item.name.toLowerCase().includes(searchLower)) {
        suggestions.add(item.name);
      }
      if (item.chefName.toLowerCase().includes(searchLower)) {
        suggestions.add(item.chefName);
      }
      if (item.category && item.category.toLowerCase().includes(searchLower)) {
        suggestions.add(item.category);
      }
    });

    setAutocompleteSuggestions(Array.from(suggestions).slice(0, 5));
  }, [searchTerm, foodItems]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setAutocompleteSuggestions([]);
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    const fetchUserRatings = async () => {
      if (!userProfile?.uid) return;
      try {
        const response = await fetch(`/api/users/${userProfile.uid}/ratings`);
        if (response.ok) {
          const data = await response.json();
          const ratingsMap = data.reduce((acc: any, r: any) => {
            acc[r.dishId] = r.rating;
            return acc;
          }, {});
          setUserRatings(ratingsMap);
        }
      } catch (err) {
        console.error("Failed to fetch user ratings", err);
      }
    };
    fetchUserRatings();
  }, [userProfile?.uid]);

  const handleRate = async (dishId: string, rating: number) => {
    if (!userProfile?.uid) {
      setGlobalError("Please log in to rate dishes.");
      return;
    }
    setGlobalError(null);
    
    // Optimistic update
    setUserRatings(prev => ({ ...prev, [dishId]: rating }));
    
    try {
      const response = await fetch(`/api/dishes/${dishId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.uid,
          rating
        }),
      });
      
      if (response.ok) {
        // Refetch dishes to update average rating
        const dishesResponse = await fetch('/api/dishes');
        if (dishesResponse.ok) {
          const data = await dishesResponse.json();
          setFoodItems(data);
        }
      }
    } catch (error) {
      console.error("Failed to rate dish", error);
    }
  };

  const handleOrderClick = (food: any) => {
    if (userProfile.role === 'chef') {
      setGlobalError("Chefs cannot place orders. Please use a customer account.");
      return;
    }
    setGlobalError(null);
    setPaymentModalOpen(food);
  };

  const confirmOrder = async () => {
    if (!paymentModalOpen) return;
    const food = paymentModalOpen;

    if (!deliveryAddress.trim()) {
      setGlobalError("Please enter a delivery address to proceed.");
      return;
    }

    setPaymentModalOpen(null);
    setGlobalError(null);

    const quantity = quantities[food.id] || 1;
    const total = food.price * quantity;

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
          quantity: quantity,
          total: total,
          address: deliveryAddress,
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
      setGlobalError("Failed to place order. Please try again.");
      setOrderStatus(prev => ({ ...prev, [food.id]: 'idle' }));
    }
  };

  const handleContactChef = (food: any) => {
    setContactModalOpen(food);
  };

  const handleQuantityChange = (dishId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[dishId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [dishId]: next };
    });
  };

  const categories = ['All', ...Array.from(new Set(foodItems.map(item => item.category).filter(Boolean)))];

  const filteredItems = foodItems.filter(item => {
    if (item.isAvailable === false) return false;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchLower) ||
                         item.chefName.toLowerCase().includes(searchLower) ||
                         (item.category && item.category.toLowerCase().includes(searchLower));
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
          
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for dishes, chefs, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all shadow-lg"
            />
            {autocompleteSuggestions.length > 0 && (
              <ul className="absolute z-20 w-full bg-white mt-2 rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                {autocompleteSuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-gray-700 transition-colors border-b border-gray-50 last:border-none flex items-center gap-2"
                  >
                    <Search className="h-4 w-4 text-gray-400" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
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
        <div className="mb-6">
          <ErrorMessage message={globalError} />
        </div>
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(item.id, star)}
                            className={`focus:outline-none transition-colors ${
                              (userRatings[item.id] || 0) >= star ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          >
                            <Star className="h-5 w-5 fill-current" />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        {item.averageRating ? item.averageRating.toFixed(1) : 'New'} 
                        <span className="font-normal"> ({item.ratingCount || 0} reviews)</span>
                      </span>
                      <button 
                        onClick={() => handleContactChef(item)}
                        className="text-xs text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 mt-2"
                      >
                        <MessageSquare className="h-3 w-3" /> Contact Chef
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl">
                        <button 
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:bg-gray-100 font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold text-gray-900 min-w-[1ch] text-center">
                          {quantities[item.id] || 1}
                        </span>
                        <button 
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:bg-gray-100 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleOrderClick(item)}
                        disabled={orderStatus[item.id] === 'ordering' || orderStatus[item.id] === 'success'}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
                          orderStatus[item.id] === 'success'
                          ? 'bg-green-500 text-white shadow-lg shadow-green-100'
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-100 hover:-translate-y-0.5'
                        }`}
                      >
                        {orderStatus[item.id] === 'ordering' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : orderStatus[item.id] === 'success' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Ordered!
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Order Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact Chef Modal */}
      {contactModalOpen && (
        <ChatModal
          isOpen={!!contactModalOpen}
          onClose={() => setContactModalOpen(null)}
          currentUser={userProfile}
          otherUser={{
            id: contactModalOpen.chefId,
            name: contactModalOpen.chefName,
            role: 'chef'
          }}
          dishId={contactModalOpen.id}
          dishName={contactModalOpen.name}
        />
      )}

      {/* Payment & Location Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setPaymentModalOpen(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Order</h3>
            <p className="text-gray-500 mb-6 text-sm">You are ordering {quantities[paymentModalOpen.id] || 1}x {paymentModalOpen.name}.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Delivery Address</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onLoad}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <input
                        type="text"
                        required
                        placeholder="Enter your full address..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Enter your full address..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Payment Method</label>
                <div className="relative mt-1">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'card')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-gray-900 appearance-none"
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="card">Credit/Debit Card (Stripe)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-100">
              <span className="text-gray-500 font-medium">Total Amount:</span>
              <span className="text-2xl font-black text-gray-900">${(paymentModalOpen.price * (quantities[paymentModalOpen.id] || 1)).toFixed(2)}</span>
            </div>

            {paymentMethod === 'cod' ? (
              <button
                onClick={confirmOrder}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Confirm Order (COD)
              </button>
            ) : (
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  food={paymentModalOpen} 
                  quantity={quantities[paymentModalOpen.id] || 1} 
                  deliveryAddress={deliveryAddress}
                  onConfirm={confirmOrder}
                  onCancel={() => setPaymentModalOpen(null)}
                  setGlobalError={setGlobalError}
                />
              </Elements>
            )}
          </div>
        </div>
      )}
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
