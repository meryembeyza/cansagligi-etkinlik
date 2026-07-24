'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRouter, usePathname } from 'next/navigation';

import { User, Session } from '@supabase/supabase-js';
import { UserRole, UserData } from '@/types';

interface RoleContextType {
  currentRole: UserRole | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  networkError: boolean;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: { user: User } | null) => {
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError && userError.name !== 'AuthSessionMissingError' && !userError.message.includes('missing')) {
          console.error("Oturum kontrolünde bir hata oluştu.");
        }

        await handleSession(user ? { user } : null);
      } catch (error) {
        console.error("RoleContext yüklenirken ağ veya yetki hatası oluştu.");
        if (mounted) {
          setUser(null);
          setUserData(null);
          setCurrentRole(null);
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
        console.error("Oturum durumu güncellenirken hata oluştu.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(prev => {
          if (prev) {
            console.warn('RoleContext: Force disabling isLoading due to timeout (10s).');
            setNetworkError(true);
          }
          return false;
        });
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    localStorage.removeItem('event_draft');
    localStorage.removeItem('revision_draft_' + userData?.id);
    // Also clear any keys starting with 'revision_draft_'
    Object.keys(localStorage).filter(k => k.startsWith('revision_draft_') || k.startsWith('event_draft')).forEach(k => localStorage.removeItem(k));
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <RoleContext.Provider value={{ currentRole, user, userData, isLoading, networkError, logout }}>
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



