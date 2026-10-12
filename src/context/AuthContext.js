import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserStore, SessionStore, generateId } from '../data/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => SessionStore.get());
  const [loading, setLoading] = useState(false);

  const login = useCallback((email, password) => {
    const found = UserStore.findByEmail(email);
    if (!found) return { success: false, error: 'No account found with this email.' };
    if (found.password !== password) return { success: false, error: 'Incorrect password.' };
    SessionStore.set(found);
    setUser(SessionStore.get());
    return { success: true, user: found };
  }, []);

  const register = useCallback((name, email, password, phone = '') => {
    if (UserStore.findByEmail(email)) return { success: false, error: 'Email already registered.' };
    const newUser = {
      id: generateId(),
      name, email, password,
      role: 'customer',
      customerType: 'regular',
      phone,
      addresses: [],
      createdAt: new Date().toISOString(),
    };
    UserStore.add(newUser);
    SessionStore.set(newUser);
    setUser(SessionStore.get());
    return { success: true, user: newUser };
  }, []);

  const logout = useCallback(() => {
    SessionStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates) => {
    if (!user) return;
    const existing = UserStore.findById(user.id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    UserStore.update(updated);
    SessionStore.set(updated);
    setUser(SessionStore.get());
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
