import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    localStorage.getItem('adminAuthenticated') === 'true'
  );

  const login = (email, password) => {
    if (
      email === 'sekkarquincaillerie@gmail.com' &&
      password === 'sekkarquincaillerie12345'
    ) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ isAdminAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
