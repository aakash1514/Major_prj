import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppLayout } from '../components/layout/AppLayout';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage'; 
import { LandingPage } from '../pages/LandingPage';
import { FarmerDashboard } from '../pages/farmer/FarmerDashboard';
import { BuyerDashboard } from '../pages/buyer/BuyerDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminOrders } from '../pages/admin/AdminOrders';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { CropSubmissions } from '../pages/admin/CropSubmissions';
import { AgentDashboard } from '../pages/agent/AgentDashboard';
import { Deliveries } from '../pages/agent/Deliveries';
import { AgentProfile } from '../pages/agent/Profile';
import { AddCropPage } from '../pages/farmer/AddCropPage';
import { MyCrop } from '../pages/farmer/MyCrop';
import { Orders } from '../pages/farmer/Orders';
import { BuyerProfile } from '../pages/buyer/BuyerProfile';
import { MyOrders } from '../pages/buyer/MyOrders';
import { MarketplacePage } from '../pages/marketplace/MarketplacePage';
import { FarmerProfile } from '../pages/farmer/FarmerProfile';
import { PredictionsPage } from '../pages/predictions/PredictionsPage';

// Protected route component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate dashboard based on role
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <>{children}</>;
};

// Router configuration
const Routes: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      ),
      children: [
        {
          index: true,
          element: <LandingPage />
        },
        {
          path: "login",
          element: <LoginPage />
        },
        {
          path: "register",
          element: <RegisterPage /> // Using LoginPage for now
        },
        {
          path: 'predictions',
          element: <ProtectedRoute><PredictionsPage /></ProtectedRoute>
        },
        
        // Farmer routes
        {
          path: "farmer",
          element: <ProtectedRoute allowedRoles={['farmer']}><Navigate to="/farmer/dashboard" replace /></ProtectedRoute>
        },
        {
          path: "farmer/dashboard",
          element: <ProtectedRoute allowedRoles={['farmer']}><FarmerDashboard /></ProtectedRoute>
        },
        {
          path: "farmer/add-crop",
          element: <ProtectedRoute allowedRoles={['farmer']}><AddCropPage /></ProtectedRoute>
        },
        {
          path: "farmer/crops",
          element: <ProtectedRoute allowedRoles={['farmer']}><MyCrop /></ProtectedRoute>
        },
        {
          path: "farmer/orders",
          element: <ProtectedRoute allowedRoles={['farmer']}><Orders /></ProtectedRoute>
        },
        {
        path: "/farmer/profile",
        element: <ProtectedRoute allowedRoles={['farmer']}><FarmerProfile /></ProtectedRoute>
        },

        
        // Buyer routes
        // Buyer routes
        {
          path: "buyer",
          element: <ProtectedRoute allowedRoles={['buyer']}><Navigate to="/buyer/dashboard" replace /></ProtectedRoute>
        },
        {
          path: "buyer/dashboard",
          element: <ProtectedRoute allowedRoles={['buyer']}><BuyerDashboard /></ProtectedRoute>
        },
        {
          path: "buyer/marketplace",
          element: <ProtectedRoute allowedRoles={['buyer']}><MarketplacePage /></ProtectedRoute>
        },
        {
          path: "buyer/profile",
          element: <ProtectedRoute allowedRoles={['buyer']}><BuyerProfile /></ProtectedRoute>
        },
        {
          path: "buyer/orders",
          element: <ProtectedRoute allowedRoles={['buyer']}><MyOrders /></ProtectedRoute>
        },
        
        // Admin routes
        {
          path: "admin",
          element: <ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>
        },
        {
          path: "admin/dashboard",
          element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
        },
        {
          path: "admin/users",
          element: <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>
        },
        {
          path: "admin/crops",
          element: <ProtectedRoute allowedRoles={['admin']}><CropSubmissions /></ProtectedRoute>
        },
        {
          path: "admin/orders",
          element: <ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>
        },
        
        // Agent routes
        {
          path: "agent",
          element: <ProtectedRoute allowedRoles={['agent']}><Navigate to="/agent/dashboard" replace /></ProtectedRoute>
        },
        {
          path: "agent/dashboard",
          element: <ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>
        },
        {
          path: "agent/deliveries",
          element: <ProtectedRoute allowedRoles={['agent']}><Deliveries /></ProtectedRoute>
        },
        {
          path: "agent/profile",
          element: <ProtectedRoute allowedRoles={['agent']}><AgentProfile /></ProtectedRoute>
        },
        
        // Fallback route
        {
          path: "*",
          element: <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Page not found</p>
              <a href="/" className="text-green-600 hover:text-green-800">
                Return Home
              </a>
            </div>
          </div>
        }
      ]
    }
  ]);

  return <RouterProvider router={router} />;
};

export default Routes;