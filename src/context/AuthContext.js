import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on load
    const storedData = localStorage.getItem('rentx_user_session');
    
    if (storedData) {
      const { user, expiry } = JSON.parse(storedData);
      
      // Check if session is expired
      if (new Date().getTime() > expiry) {
        localStorage.removeItem('rentx_user_session');
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, rememberMe = false) => {
    setCurrentUser(userData);
    
    // Set expiration: 7 days if 'Remember Me', else 1 day (or session)
    // 7 days * 24 hours * 60 min * 60 sec * 1000 ms
    const ttl = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; 
    
    const sessionData = {
      user: userData,
      expiry: new Date().getTime() + ttl
    };

    localStorage.setItem('rentx_user_session', JSON.stringify(sessionData));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rentx_user_session');
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}