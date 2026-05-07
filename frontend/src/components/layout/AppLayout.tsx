import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Navigation links based on user role
  const getNavLinks = () => {
    if (!user) return [];
    
    // Common links for all authenticated users
    const commonLinks: Array<{to: string, label: string}> = [
      { to: '/predictions', label: 'Predictions' },
    ];
    
    // Role-specific links
    const roleSpecificLinks: Record<string, Array<{to: string, label: string}>> = {
      farmer: [
        { to: '/farmer/dashboard', label: 'Dashboard' },
        { to: '/farmer/profile', label: 'Profile' },
        { to: '/farmer/crops', label: 'My Crops' },
        { to: '/farmer/add-crop', label: 'Add Crop' },
        { to: '/farmer/orders', label: 'Orders' },
      ],
      buyer: [
        { to: '/buyer/dashboard', label: 'Dashboard' },
        { to: '/buyer/profile', label: 'Profile' },
        { to: '/buyer/marketplace', label: 'Marketplace' },
        { to: '/buyer/orders', label: 'My Orders' },
      ],
      admin: [
        { to: '/admin/dashboard', label: 'Dashboard' },
        { to: '/admin/crops', label: 'Crop Submissions' },
        { to: '/admin/orders', label: 'Orders' },
        { to: '/admin/users', label: 'Users' },
      ],
      agent: [
        { to: '/agent/dashboard', label: 'Dashboard' },
        { to: '/agent/profile', label: 'Profile' },
        { to: '/agent/deliveries', label: 'Deliveries' },
      ],
    };
    
    // If user role exists in roleSpecificLinks, return those links plus common links
    return [...commonLinks, ...(roleSpecificLinks[user.role] || [])];
  };

  // Get the navigation links
  const navLinks = user ? getNavLinks() : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-2xl font-bold text-green-700">AgriFresh</Link>
              </div>
            </div>
            
            {user && (
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(link.to)
                        ? 'border-green-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
            
            <div className="flex items-center">
              {user ? (
                <div className="hidden md:flex items-center">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-700 mr-2">
                      <span className="font-medium">{user.name}</span>
                      <span className="ml-1 text-gray-500 capitalize">({user.role})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      icon={<LogOut size={16} />}
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-4">
                  <Link to="/login">
                    <Button variant="outline" size="sm">Log in</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Register</Button>
                  </Link>
                </div>
              )}
              
              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                        isActive(link.to)
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                      }`}
                      onClick={closeMobileMenu}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="flex items-center px-4">
                      <div className="ml-3">
                        <div className="text-base font-medium text-gray-800">{user.name}</div>
                        <div className="text-sm font-medium text-gray-500 capitalize">{user.role}</div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <button
                        onClick={() => {
                          handleLogout();
                          closeMobileMenu();
                        }}
                        className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1 px-4 pt-2 pb-3">
                  <Link
                    to="/login"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} AgriFresh. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};