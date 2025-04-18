import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status when the app loads
  useEffect(() => {
    const checkAuthStatus = async () => {
      // use 'http://localhost:3001/api/auth/status' for local dev environment
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/status`, {
          credentials: 'include' // Important for cookies to be sent
        });
        const data = await response.json();
        
        setIsAuthenticated(data.isAuthenticated);
        setUser(data.user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Function to handle logout
  const logout = async () => {
    // use 'http://localhost:3001/api/auth/logout' in local dev environment
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/status`, {
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 