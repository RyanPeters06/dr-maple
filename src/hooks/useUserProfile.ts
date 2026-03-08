import { useState, useEffect, useCallback } from 'react';
import { getUserProfile, saveUserProfile, type UserProfile } from '../services/firebase';

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) return false;
    setSaving(true);
    setError(null);
    try {
      const next: UserProfile = {
        sex: updates.sex !== undefined ? updates.sex : profile?.sex ?? null,
        heightCm: updates.heightCm !== undefined ? updates.heightCm : profile?.heightCm ?? null,
        weightKg: updates.weightKg !== undefined ? updates.weightKg : profile?.weightKg ?? null,
        dateOfBirth: updates.dateOfBirth !== undefined ? updates.dateOfBirth : profile?.dateOfBirth ?? null,
        pastMedicalProblems: updates.pastMedicalProblems ?? profile?.pastMedicalProblems ?? [],
        currentMedications: updates.currentMedications ?? profile?.currentMedications ?? [],
        allergies: updates.allergies ?? profile?.allergies ?? [],
      };
      await saveUserProfile(userId, next);
      setProfile(next);
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  }, [userId, profile]);

  return { profile, loading, saving, error, reload: load, save };
}
