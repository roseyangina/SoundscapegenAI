import React from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';

const LoginStatus = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  // If the loading is true, show the loading screen
  if (loading) {
    return <div>Loading...</div>;
  }

  // Return the login status
  return null;
};

export default LoginStatus; 