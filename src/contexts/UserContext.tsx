import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import userService from '../services/UserService';

interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkLoginStatus: () => Promise<void>;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (user: User) => {
    setCurrentUser(user);
    console.log('✅ UserContext: User logged in:', user.email);
  };

  const logout = async () => {
    try {
      console.log('🔓 UserContext: 开始登出，调用UserService.logout');
      await userService.logout();
      console.log('🔓 UserContext: UserService.logout完成，清除currentUser');
      setCurrentUser(null);
      console.log('✅ UserContext: 用户已登出');
    } catch (error) {
      console.error('❌ UserContext: 登出失败:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      setIsLoading(true);
      const user = await userService.checkLoginStatus();
      if (user) {
        setCurrentUser(user);
        console.log('✅ UserContext: User already logged in:', user.email);
      } else {
        setCurrentUser(null);
        console.log('ℹ️ UserContext: No user logged in');
      }
    } catch (error) {
      console.error('❌ UserContext: Check login status failed:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const contextValue: UserContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    checkLoginStatus,
    isLoggedIn: currentUser !== null,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
