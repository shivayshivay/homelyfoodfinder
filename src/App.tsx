import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged, logout, db, doc, getDoc, FirebaseUser } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogOut, PlusCircle, Search, ShoppingBag, User as UserIcon, ChefHat, Utensils } from 'lucide-react';

// Components
import Explore from './components/Explore';
import AddFood from './components/AddFood';
import Orders from './components/Orders';
import Auth from './components/Auth';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          {user && userProfile && (
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <Link to="/" className="flex items-center space-x-2">
                    <Utensils className="h-8 w-8 text-orange-500" />
                    <span className="text-xl font-bold tracking-tight text-gray-900">HomelyFood</span>
                  </Link>
                  
                  <div className="hidden md:flex items-center space-x-8">
                    <Link to="/" className="text-gray-600 hover:text-orange-500 font-medium transition-colors flex items-center gap-2">
                      <Search className="h-4 w-4" /> Explore
                    </Link>
                    {userProfile.role === 'chef' && (
                      <Link to="/add-food" className="text-gray-600 hover:text-orange-500 font-medium transition-colors flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Add Dish
                      </Link>
                    )}
                    <Link to="/orders" className="text-gray-600 hover:text-orange-500 font-medium transition-colors flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> {userProfile.role === 'chef' ? 'Orders Received' : 'My Orders'}
                    </Link>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-full">
                      {userProfile.role === 'chef' ? <ChefHat className="h-4 w-4 text-orange-500" /> : <UserIcon className="h-4 w-4 text-orange-500" />}
                      <span className="text-sm font-semibold text-gray-700">{userProfile.name}</span>
                    </div>
                    <button 
                      onClick={() => logout()}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          )}

          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
              <Route path="/" element={user ? (userProfile ? <Explore userProfile={userProfile} /> : <Auth />) : <Navigate to="/auth" />} />
              <Route path="/add-food" element={user && userProfile?.role === 'chef' ? <AddFood userProfile={userProfile} /> : <Navigate to="/" />} />
              <Route path="/orders" element={user && userProfile ? <Orders userProfile={userProfile} /> : <Navigate to="/auth" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
