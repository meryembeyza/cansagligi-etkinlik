'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'unit_head' | 'region_manager' | 'general_admin' | 'design_team' | 'resource_manager' | 'rep_head' | 'rep_region_manager' | 'rep_coordinator' | 'representative';

interface RoleContextType {
  currentRole: UserRole | null;
  user: any | null;
  userData: any | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const fetchSessionAndRole = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data, error } = await supabase
            .from('users')
            .select('role, is_approved, region, university, unit_name')
            .eq('id', session.user.id)
            .maybeSingle();

          // Ağ hatası veya tablo hatasıysa oturumu kapatma, sadece hata fırlat
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
              if (window.location.pathname !== '/login') {
                router.push('/login?error=not_approved');
              }
            }
          } else {
            // Veritabanında kayıt yok (silinmiş veya şema sıfırlanmış)
            console.warn("Kullanıcı profili bulunamadı.");
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setUserData(null);
              setCurrentRole(null);
            }
            if (window.location.pathname !== '/login') {
              window.location.href = '/login?error=not_found';
            }
          }
        } else {
          // Oturum yok
          if (mounted) {
            setUser(null);
            setUserData(null);
            setCurrentRole(null);
          }
          if (window.location.pathname?.startsWith('/dashboard')) {
            window.location.href = '/login?error=no_session';
          }
        }
      } catch (error) {
        console.error("Auth/Network error in RoleContext:", error);
        // Ağ hatası yüzünden insanları zorla çıkış yaptırma, sadece state'i temizle
        // Çıkış yaparsak kullanıcı sürekli login loop'a girer
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
      try {
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
              if (window.location.pathname !== '/login') {
                router.push('/login?error=not_approved');
              }
            }
          } else {
            console.error("onAuthStateChange Role fetch error - No user found");
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setUserData(null);
              setCurrentRole(null);
            }
            if (window.location.pathname !== '/login') {
              window.location.href = '/login?error=not_found';
            }
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
            console.warn('RoleContext: Force disabling isLoading due to timeout.');
          }
          return false;
        });
      }
    }, 3500);

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
