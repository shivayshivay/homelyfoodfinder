import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, updateDoc, doc, orderBy } from '../firebase';
import { ShoppingBag, Clock, CheckCircle2, XCircle, Truck, Utensils, ChefHat, User as UserIcon, Calendar, ArrowRight } from 'lucide-react';

interface OrdersProps {
  userProfile: any;
}

const OrderTracker = ({ status, estimatedDeliveryTime }: { status: string, estimatedDeliveryTime?: string }) => {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3 text-red-500 mt-8 pt-6 border-t border-gray-50 bg-red-50 p-4 rounded-2xl">
        <XCircle className="h-6 w-6" />
        <span className="font-bold">Order was declined by the chef.</span>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'Order Placed', icon: Clock },
    { id: 'accepted', label: 'Preparing', icon: ChefHat },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const getCurrentStepIndex = () => {
    if (status === 'pending') return 0;
    if (status === 'accepted') return 1;
    if (status === 'out_for_delivery') return 2;
    if (status === 'delivered') return 3;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="mt-8 pt-8 border-t border-gray-50">
      {estimatedDeliveryTime && status !== 'delivered' && (
        <div className="mb-6 flex items-center justify-center gap-2 text-orange-600 bg-orange-50 py-2 px-4 rounded-full w-fit mx-auto">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-bold">Estimated Delivery: {estimatedDeliveryTime}</span>
        </div>
      )}
      <div className="relative flex justify-between max-w-2xl mx-auto">
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 rounded-full -z-10"></div>
        <div 
          className="absolute top-5 left-0 h-1 bg-orange-500 rounded-full -z-10 transition-all duration-1000 ease-in-out"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-3 bg-white px-4">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-4 transition-all duration-500 ${
                  isCompleted 
                    ? 'bg-green-500 border-white text-white shadow-md' 
                    : isCurrent
                    ? 'bg-orange-500 border-white text-white shadow-md scale-110 ring-4 ring-orange-100'
                    : 'bg-gray-100 border-white text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-500 ${
                isCompleted ? 'text-green-600' : isCurrent ? 'text-orange-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Orders({ userProfile }: OrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimatedTimes, setEstimatedTimes] = useState<{ [key: string]: string }>({});
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders/${userProfile.uid}?role=${userProfile.role}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [userProfile]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'accepted' && estimatedTimes[orderId]) {
        body.estimatedDeliveryTime = estimatedTimes[orderId];
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, estimatedDeliveryTime: body.estimatedDeliveryTime || o.estimatedDeliveryTime } : o));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <ChefHat className="h-4 w-4" />;
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (userProfile.role === 'chef') {
      if (customerFilter && !order.customerName.toLowerCase().includes(customerFilter.toLowerCase())) return false;
      if (dateRange.start && new Date(order.createdAt) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(order.createdAt) > new Date(dateRange.end + 'T23:59:59')) return false;
    } else {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-3xl h-48 animate-pulse border border-gray-100 shadow-sm"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic mb-2">
            {userProfile.role === 'chef' ? 'Orders Received' : 'My Orders'}
          </h1>
          <p className="text-gray-500 text-lg">
            {userProfile.role === 'chef' 
              ? 'Manage and fulfill orders from your customers' 
              : 'Track the status of your homemade food orders'}
          </p>
        </div>
        
        <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-2xl">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <span className="block text-2xl font-black text-gray-900 leading-none">{filteredOrders.length}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Orders</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        {userProfile.role === 'chef' ? (
          <>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Filter by Customer</label>
              <input 
                type="text" 
                placeholder="Customer name..." 
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">End Date</label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Filter by Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="accepted">Preparing</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-sm">
          <div className="bg-gray-50 p-8 rounded-full w-fit mx-auto mb-8">
            <ShoppingBag className="h-20 w-20 text-gray-200" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">No orders yet</h3>
          <p className="text-gray-500 max-w-xs mx-auto">
            {userProfile.role === 'chef' 
              ? "Your delicious dishes are waiting for their first customer!" 
              : "Explore the menu and place your first order today!"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 group"
            >
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-6">
                    <div className="bg-gray-50 p-6 rounded-3xl group-hover:bg-orange-50 transition-colors">
                      <Utensils className="h-10 w-10 text-orange-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Order #{String(order.id).slice(-6)}</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-orange-500 transition-colors">
                        {order.quantity}x {order.dishName}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">${order.total.toFixed(2)}</span>
                    <div className="flex items-center justify-end gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      <Calendar className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center pt-10 border-t border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gray-50 text-gray-400">
                      {userProfile.role === 'chef' ? <UserIcon className="h-6 w-6" /> : <ChefHat className="h-6 w-6" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                        {userProfile.role === 'chef' ? 'Customer' : 'Chef'}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {userProfile.role === 'chef' ? order.customerName : order.chefName}
                      </span>
                    </div>
                  </div>

                  {userProfile.role === 'chef' && order.status === 'pending' && (
                    <div className="flex flex-col items-end gap-3 col-span-1 md:col-span-2 mt-4 md:mt-0">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-gray-500">Est. Delivery:</label>
                        <select 
                          className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 font-medium"
                          value={estimatedTimes[order.id] || '30 mins'}
                          onChange={(e) => setEstimatedTimes(prev => ({ ...prev, [order.id]: e.target.value }))}
                        >
                          <option value="15 mins">15 mins</option>
                          <option value="30 mins">30 mins</option>
                          <option value="45 mins">45 mins</option>
                          <option value="1 hour">1 hour</option>
                          <option value="1.5 hours">1.5 hours</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => updateStatus(order.id, 'rejected')}
                          className="px-6 py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border-2 border-transparent hover:border-red-100"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            if (!estimatedTimes[order.id]) {
                              setEstimatedTimes(prev => ({ ...prev, [order.id]: '30 mins' }));
                            }
                            updateStatus(order.id, 'accepted');
                          }}
                          className="px-6 py-3 rounded-2xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 hover:-translate-y-1 flex items-center gap-2"
                        >
                          Accept Order
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {userProfile.role === 'chef' && order.status === 'accepted' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        className="px-10 py-4 rounded-2xl font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all shadow-lg shadow-purple-100 hover:-translate-y-1 flex items-center gap-2"
                      >
                        Mark Out for Delivery
                        <Truck className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {userProfile.role === 'chef' && order.status === 'out_for_delivery' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="px-10 py-4 rounded-2xl font-bold bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-100 hover:-translate-y-1 flex items-center gap-2"
                      >
                        Mark as Delivered
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {userProfile.role === 'chef' && order.status !== 'pending' && order.status !== 'accepted' && order.status !== 'out_for_delivery' && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-400 italic">
                        {order.status === 'delivered' ? 'Order completed' : 'Order closed'}
                      </span>
                    </div>
                  )}
                </div>

                {userProfile.role !== 'chef' && (
                  <OrderTracker status={order.status} estimatedDeliveryTime={order.estimatedDeliveryTime} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
