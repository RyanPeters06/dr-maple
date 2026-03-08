import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UserProfile } from '../services/firebase';

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setInput('');
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-rose-500 hover:text-rose-700 font-medium leading-none"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
        />
        <button type="button" onClick={add} className="btn-primary px-4 py-2.5 text-sm">
          Add
        </button>
      </div>
    </div>
  );
}

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();
  const { profile, loading, saving, error, save } = useUserProfile(user?.sub);
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        sex: profile.sex ?? '',
        heightCm: profile.heightCm ?? undefined,
        weightKg: profile.weightKg ?? undefined,
        dateOfBirth: profile.dateOfBirth ?? '',
        pastMedicalProblems: profile.pastMedicalProblems ?? [],
        currentMedications: profile.currentMedications ?? [],
        allergies: profile.allergies ?? [],
      });
    } else if (!loading) {
      setForm({
        sex: '',
        heightCm: undefined,
        weightKg: undefined,
        dateOfBirth: '',
        pastMedicalProblems: [],
        currentMedications: [],
        allergies: [],
      });
    }
  }, [profile, loading]);

  const handleSave = async () => {
    if (!user?.sub) return;
    const ok = await save({
      sex: form.sex || null,
      heightCm: form.heightCm ?? null,
      weightKg: form.weightKg ?? null,
      dateOfBirth: form.dateOfBirth || null,
      pastMedicalProblems: form.pastMedicalProblems ?? [],
      currentMedications: form.currentMedications ?? [],
      allergies: form.allergies ?? [],
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar — same pattern as Dashboard */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-rose-100 flex flex-col sticky top-0 h-screen z-20">
        <div className="px-4 py-3 border-b border-rose-100 flex items-center">
          <img
            src="/dr-maple-logo.png"
            alt="Dr. Maple"
            className="h-20 object-contain cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
        <nav className="flex-1 p-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all"
          >
            <span className="text-base">←</span>
            <span>Back to Dashboard</span>
          </button>
        </nav>
        <div className="p-4 border-t border-rose-100 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 min-w-0">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-rose-200 object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center text-sm text-rose-600 font-bold flex-shrink-0">
                {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-600 font-medium truncate">{user?.name ?? user?.email}</span>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-xs text-gray-400 hover:text-rose-600 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Profile</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your demographics and health details help Dr. Maple personalize advice. This data is used for context (e.g. averages) when viewing your health stats.
          </p>

          {/* Demographics */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Demographics</h2>
            <div className="rounded-2xl border border-rose-100 bg-white p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sex</label>
                <select
                  value={form.sex ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value || undefined }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min={50}
                    max={250}
                    value={form.heightCm ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 170"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    step={0.1}
                    value={form.weightKg ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 70"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date of birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value || undefined }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
                <p className="text-xs text-gray-400 mt-0.5">Used to compute age for personalized averages.</p>
              </div>
            </div>
          </section>

          {/* Past medical problems */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Past medical problems</h2>
            <div className="rounded-2xl border border-rose-100 bg-white p-6">
              <ListEditor
                label="Conditions or diagnoses (e.g. Asthma, Hypertension)"
                items={form.pastMedicalProblems ?? []}
                onChange={(pastMedicalProblems) => setForm((f) => ({ ...f, pastMedicalProblems }))}
                placeholder="Add a condition"
              />
            </div>
          </section>

          {/* Current medications */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current medications</h2>
            <div className="rounded-2xl border border-rose-100 bg-white p-6">
              <ListEditor
                label="Medications you take regularly"
                items={form.currentMedications ?? []}
                onChange={(currentMedications) => setForm((f) => ({ ...f, currentMedications }))}
                placeholder="e.g. Lisinopril 10mg"
              />
            </div>
          </section>

          {/* Allergies */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Allergies</h2>
            <div className="rounded-2xl border border-rose-100 bg-white p-6">
              <ListEditor
                label="Drug, food, or other allergies"
                items={form.allergies ?? []}
                onChange={(allergies) => setForm((f) => ({ ...f, allergies }))}
                placeholder="e.g. Penicillin, Peanuts"
              />
            </div>
          </section>

          <div className="flex flex-col gap-3">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !user?.sub}
                className="btn-primary px-6 py-3 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              {saved && <span className="text-sm text-emerald-600 font-medium">Saved.</span>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
