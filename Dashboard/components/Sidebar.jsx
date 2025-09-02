import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loadingPath, setLoadingPath] = useState(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Define navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { name: 'Dashboard', path: '/', icon: 'fas fa-tachometer-alt' },
      { name: 'Clients', path: '/clients', icon: 'fas fa-users' },
    ];
    
    // Add Users management link only for admin users
    if (user?.role === 'admin') {
      baseItems.push({ name: 'Users', path: '/users', icon: 'fas fa-user-cog' });
    }
    
    return baseItems;
  };
  
  const navItems = getNavItems();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const handleLogout = () => {
    logout();
  };

  // Handle navigation with loading state
  const handleNavigation = (path) => {
    if (path !== router.pathname) {
      setLoadingPath(path);
      // Clear loading state after a short delay
      setTimeout(() => setLoadingPath(null), 1000);
    }
  };

  return (
    <aside 
      className={`bg-primary text-white transition-all duration-300 ease-in-out h-screen flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className={`flex items-center ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className="flex flex-col">
            <span className="font-signika font-bold text-xl">Medpush X</span>
            <span className="font-signika font-light text-xs text-gray-300">MEDPUSH</span>
          </div>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="text-white p-2 rounded hover:bg-gray-700 transition-colors"
        >
          {isCollapsed ? (
            <i className="fas fa-chevron-right"></i>
          ) : (
            <i className="fas fa-chevron-left"></i>
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`sidebar-link ${
                  router.pathname === item.path ? 'bg-secondary text-white' : ''
                } ${loadingPath === item.path ? 'opacity-75' : ''}`}
              >
                <i className={`${item.icon} ${isCollapsed ? 'mx-auto' : 'mr-3'} ${
                  loadingPath === item.path ? 'fa-spin' : ''
                }`}></i>
                {!isCollapsed && (
                  <span className="font-helvetica flex items-center">
                    {item.name}
                    {loadingPath === item.path && (
                      <i className="fas fa-spinner fa-spin ml-2 text-xs"></i>
                    )}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center ${isCollapsed ? 'hidden' : 'block'}`}>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white mr-2">
              <span className="font-helveticaBold">{user?.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div>
              <p className="text-sm font-helvetica">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-300 font-helvetica">{user?.role || 'Loading...'}</p>
            </div>
          </div>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white">
              <span className="font-helveticaBold">{user?.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
            </div>
          ) : (
            <button 
              onClick={handleLogout}
              className="p-2 rounded hover:bg-gray-700 transition-colors" 
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;