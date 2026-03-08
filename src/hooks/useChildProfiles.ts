import { useState, useEffect, useCallback } from 'react';
import {
  getChildProfiles,
  saveChildProfile,
  deleteChildProfile as deleteChildProfileApi,
  type ChildProfile,
  type VaccineEntry,
  type GrowthEntry,
  type MedicationEntry,
} from '../services/firebase';

export function useChildProfiles(userId: string | undefined) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setChildren([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getChildProfiles(userId);
      setChildren(list);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load children');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addOrUpdateChild = useCallback(
    async (data: Omit<ChildProfile, 'id' | 'createdAt' | 'updatedAt'> | ChildProfile) => {
      if (!userId) return null;
      setSaving(true);
      setError(null);
      try {
        const id = await saveChildProfile(userId, data as Omit<ChildProfile, 'id' | 'createdAt' | 'updatedAt'> | ChildProfile);
        await load();
        return id;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to save');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [userId, load]
  );

  const deleteChild = useCallback(
    async (childId: string) => {
      if (!userId) return false;
      setSaving(true);
      setError(null);
      try {
        await deleteChildProfileApi(userId, childId);
        setChildren(prev => prev.filter(c => c.id !== childId));
        return true;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to delete');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  const updateChildVaccines = useCallback(
    async (childId: string, vaccines: VaccineEntry[]) => {
      const child = children.find(c => c.id === childId);
      if (!child || !userId) return false;
      return addOrUpdateChild({ ...child, vaccines }) != null;
    },
    [children, userId, addOrUpdateChild]
  );

  const updateChildGrowth = useCallback(
    async (childId: string, growth: GrowthEntry[]) => {
      const child = children.find(c => c.id === childId);
      if (!child || !userId) return false;
      return addOrUpdateChild({ ...child, growth }) != null;
    },
    [children, userId, addOrUpdateChild]
  );

  const updateChildMedications = useCallback(
    async (childId: string, medications: MedicationEntry[]) => {
      const child = children.find(c => c.id === childId);
      if (!child || !userId) return false;
      return addOrUpdateChild({ ...child, medications }) != null;
    },
    [children, userId, addOrUpdateChild]
  );

  return {
    children,
    loading,
    saving,
    error,
    reload: load,
    addOrUpdateChild,
    deleteChild,
    updateChildVaccines,
    updateChildGrowth,
    updateChildMedications,
  };
}
