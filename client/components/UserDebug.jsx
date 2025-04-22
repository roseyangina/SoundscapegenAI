import React from 'react';
import { useAuth } from './AuthContext';

// User debug component
const UserDebug = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) { // If the loading is true
    return <div>Loading authentication status...</div>;
  }

  return null;
};

export default UserDebug; 