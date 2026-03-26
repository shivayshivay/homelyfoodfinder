import { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Star, TrendingUp, Clock, CheckCircle2, DollarSign, Truck, X, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChefDashboardProps {
  userProfile: any;
}

export default function ChefDashboard({ userProfile }: ChefDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'revenue' | 'orders'>('revenue');
  const [showAllOrders, setShowAllOrders] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, dishesRes] = await Promise.all([
          fetch(`/api/orders/${userProfile.uid}?role=chef`),
          fetch('/api/dishes')
        ]);

        if (ordersRes.ok && dishesRes.ok) {
          const ordersData = await ordersRes.json();
          const dishesData = await dishesRes.json();
          
          setOrders(ordersData);
          setDishes(dishesData.filter((d: any) => d.chefId === userProfile.uid));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile?.uid) {
      fetchDashboardData();
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);
  
  const totalRatings = dishes.reduce((sum, d) => sum + (d.ratingCount || 0), 0);
  const averageRating = totalRatings > 0 
    ? (dishes.reduce((sum, d) => sum + ((d.averageRating || 0) * (d.ratingCount || 0)), 0) / totalRatings).toFixed(1)
    : 'New';

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const toggleAvailability = async (dishId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/dishes/${dishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !currentStatus })
      });
      if (res.ok) {
        setDishes(dishes.map(d => d.id === dishId ? { ...d, isAvailable: !currentStatus } : d));
      }
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.createdAt.startsWith(date));
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dayOrders.length,
        revenue: dayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
      };
    });
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic mb-2">
          Chef Dashboard
        </h1>
        <p className="text-gray-500 text-lg">
          Welcome back, Chef {userProfile.name}! Here's how your kitchen is doing.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-2xl text-orange-500">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Orders</p>
            <p className="text-3xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-2xl text-green-500">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Revenue</p>
            <p className="text-3xl font-black text-gray-900">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-yellow-100 p-4 rounded-2xl text-yellow-500">
            <Star className="h-8 w-8 fill-current" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Avg Rating</p>
            <p className="text-3xl font-black text-gray-900">{averageRating}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-500">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Dishes</p>
            <p className="text-3xl font-black text-gray-900">{dishes.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setChartType('revenue')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartType === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Revenue
              </button>
              <button 
                onClick={() => setChartType('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartType === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Orders
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'revenue' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Recent Order Activity</h2>
            <div className="flex items-center gap-3">
              {pendingOrders.length > 0 && (
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  {pendingOrders.length} Pending
                </span>
              )}
              <button 
                onClick={() => setShowAllOrders(true)}
                className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Eye className="h-4 w-4" /> View All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No recent orders.</div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      order.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                      order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-600' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {order.status === 'pending' ? <Clock className="h-5 w-5" /> :
                       order.status === 'delivered' ? <CheckCircle2 className="h-5 w-5" /> :
                       order.status === 'out_for_delivery' ? <Truck className="h-5 w-5" /> :
                       <ShoppingBag className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{order.quantity}x {order.dishName}</p>
                      <p className="text-sm text-gray-500">Ordered by {order.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">${order.total.toFixed(2)}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Dishes */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Your Dishes</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {dishes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No dishes added yet.</div>
            ) : (
              [...dishes]
                .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
                .map(dish => (
                  <div key={dish.id} className="p-6 flex items-center gap-4">
                    <img src={dish.image} alt={dish.name} className={`w-16 h-16 rounded-2xl object-cover ${dish.isAvailable !== false ? '' : 'opacity-50 grayscale'}`} />
                    <div className="flex-1">
                      <p className={`font-bold text-gray-900 line-clamp-1 ${dish.isAvailable !== false ? '' : 'line-through text-gray-400'}`}>{dish.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs font-bold text-gray-700">
                            {dish.averageRating ? dish.averageRating.toFixed(1) : 'New'}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">({dish.ratingCount || 0})</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={dish.isAvailable !== false}
                            onChange={() => toggleAvailability(dish.id, dish.isAvailable !== false)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* All Orders Modal */}
      {showAllOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setShowAllOrders(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Full Order History</h3>
            <p className="text-gray-500 mb-6 text-sm">A detailed view of all your orders.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 divide-y divide-gray-50">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders yet.</div>
              ) : (
                [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors rounded-xl px-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        order.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                        order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-600' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {order.status === 'pending' ? <Clock className="h-5 w-5" /> :
                         order.status === 'delivered' ? <CheckCircle2 className="h-5 w-5" /> :
                         order.status === 'out_for_delivery' ? <Truck className="h-5 w-5" /> :
                         <ShoppingBag className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{order.quantity}x {order.dishName}</p>
                        <p className="text-sm text-gray-500">Customer: {order.customerName}</p>
                        {order.address && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.address}</p>}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-black text-gray-900">${order.total.toFixed(2)}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
