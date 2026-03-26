import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, updateDoc, doc, orderBy } from '../firebase';
import { ShoppingBag, Clock, CheckCircle2, XCircle, Truck, Utensils, ChefHat, User as UserIcon, Calendar, ArrowRight } from 'lucide-react';

interface OrdersProps {
  userProfile: any;
}

export default function Orders({ userProfile }: OrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

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
            <span className="block text-2xl font-black text-gray-900 leading-none">{orders.length}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Orders</span>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
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
          {orders.map((order) => (
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
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-orange-500 transition-colors">{order.dishName}</h3>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">${order.price}</span>
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
                    <div className="flex items-center gap-4 justify-end">
                      <button
                        onClick={() => updateStatus(order.id, 'rejected')}
                        className="px-8 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border-2 border-transparent hover:border-red-100"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'accepted')}
                        className="px-8 py-4 rounded-2xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 hover:-translate-y-1 flex items-center gap-2"
                      >
                        Accept Order
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {userProfile.role === 'chef' && order.status === 'accepted' && (
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

                  {order.status !== 'pending' && order.status !== 'accepted' && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-400 italic">
                        {order.status === 'delivered' ? 'Order completed' : 'Order closed'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
