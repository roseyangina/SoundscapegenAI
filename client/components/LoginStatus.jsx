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
  return (
    <div className="login-status">
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user.username || user.email}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <Link href="/login">
            <a>Login</a>
          </Link>
          {' | '}
          <Link href="/signup">
            <a>Sign Up</a>
          </Link>
        </div>
      )}
    </div>
  );
};

export default LoginStatus; 