import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';

interface AbilityContextType {
  permissions: Set<string>;
  can: (permission: string) => boolean;
  loading: boolean;
}

const AbilityContext = createContext<AbilityContextType>({
  permissions: new Set(),
  can: () => false,
  loading: true,
});

export const useAbility = () => useContext(AbilityContext);

export const AbilityProvider = ({ children }: { children: ReactNode }) => {
  const { personnel, loading: sessionLoading } = useSession();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!personnel) {
        setPermissions(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);

      // Special case for BOD and Manager roles - grant all permissions
      if (personnel.role === 'BOD' || personnel.role === 'Quản lý') {
        const { data: allPermissions, error: allPermissionsError } = await supabase
          .from('permissions')
          .select('name');
        
        if (allPermissionsError) {
          console.error('Error fetching all permissions for admin:', allPermissionsError);
          setPermissions(new Set());
        } else {
          const perms = allPermissions.map(p => p.name).filter(Boolean) as string[];
          setPermissions(new Set(perms));
        }
        setLoading(false);
        return;
      }

      // Existing logic for other roles based on position
      if (!personnel.position_id) {
        setPermissions(new Set());
        setLoading(false);
        return;
      }

      const { data: positionPermsData, error: positionPermsError } = await supabase
        .from('position_permissions')
        .select('permission_id')
        .eq('position_id', personnel.position_id);

      if (positionPermsError || !positionPermsData) {
        console.error('Error fetching position permissions:', positionPermsError);
        setPermissions(new Set());
        setLoading(false);
        return;
      }

      const permissionIds = positionPermsData.map(p => p.permission_id);

      if (permissionIds.length === 0) {
        setPermissions(new Set());
        setLoading(false);
        return;
      }

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        setPermissions(new Set());
      } else {
        const perms = permissionsData.map(p => p.name).filter(Boolean) as string[];
        setPermissions(new Set(perms));
      }
      
      setLoading(false);
    };

    if (!sessionLoading) {
      fetchPermissions();
    }
  }, [personnel, sessionLoading]);

  const can = (permission: string) => {
    return permissions.has(permission);
  };

  return (
    <AbilityContext.Provider value={{ permissions, can, loading }}>
      {!loading && children}
    </AbilityContext.Provider>
  );
};