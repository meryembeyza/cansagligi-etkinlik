'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

import { User } from '@supabase/supabase-js';
import { UserRole, UserData } from '@/types';

interface RoleContextType {
  currentRole: UserRole | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any) => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('role, is_approved, region, university, unit_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          if (mounted) {
            setUser(session.user);
            setUserData(data);
            setCurrentRole(data.role);
          }
          if (data.is_approved) {
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
              router.push('/dashboard');
            }
          } else {
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setUserData(null);
              setCurrentRole(null);
            }
            window.location.href = '/login?error=not_approved';
          }
        } else {
          console.warn("Kullanıcı profili bulunamadı.");
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
            setUserData(null);
            setCurrentRole(null);
          }
          window.location.href = '/login?error=not_found';
        }
      } else {
        if (mounted) {
          setUser(null);
          setUserData(null);
          setCurrentRole(null);
        }
        if (window.location.pathname?.startsWith('/dashboard')) {
          window.location.href = '/login?error=no_session';
        }
      }
    };

    const fetchSessionAndRole = async () => {
      if (window.location.pathname === '/register') {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        await handleSession(session);
      } catch (error) {
        console.error("Auth/Network error in RoleContext:", error);
        if (mounted) {
          setUser(null);
          setUserData(null);
          setCurrentRole(null);
        }
        if (window.location.pathname?.startsWith('/dashboard')) {
          window.location.href = '/login?error=session_error';
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchSessionAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (window.location.pathname === '/register') {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        await handleSession(session);
      } catch (err) {
        console.error("onAuthStateChange error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(prev => {
          if (prev) {
            console.warn('RoleContext: Force disabling isLoading due to timeout (7s).');
            if (window.location.pathname?.startsWith('/dashboard')) {
               window.location.href = '/login?error=session_error';
            }
          }
          return false;
        });
      }
    }, 7000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <RoleContext.Provider value={{ currentRole, user, userData, isLoading, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
