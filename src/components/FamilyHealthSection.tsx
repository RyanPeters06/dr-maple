import { useState } from 'react';
import type { ChildProfile, VaccineEntry, GrowthEntry, MedicationEntry } from '../services/firebase';

type FamilySubSection = 'profiles' | 'vaccines' | 'growth' | 'medication';

const genId = () => `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

interface FamilyHealthSectionProps {
  familySubSection: FamilySubSection;
  setFamilySubSection: (s: FamilySubSection) => void;
  children: ChildProfile[];
  childrenLoading: boolean;
  childrenSaving: boolean;
  childrenError: string | null;
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  childFormOpen: boolean;
  childFormEditing: ChildProfile | null;
  setChildFormOpen: (open: boolean) => void;
  setChildFormEditing: (c: ChildProfile | null) => void;
  addOrUpdateChild: (data: Omit<ChildProfile, 'id' | 'createdAt' | 'updatedAt'> | ChildProfile) => Promise<string | null>;
  deleteChild: (id: string) => Promise<boolean>;
  updateChildVaccines: (childId: string, vaccines: VaccineEntry[]) => Promise<boolean>;
  updateChildGrowth: (childId: string, growth: GrowthEntry[]) => Promise<boolean>;
  updateChildMedications: (childId: string, medications: MedicationEntry[]) => Promise<boolean>;
  ageFromDateOfBirth: (dob: string | null | undefined) => number | null;
}

export function FamilyHealthSection({
  familySubSection,
  setFamilySubSection,
  children,
  childrenLoading,
  childrenSaving,
  childrenError,
  selectedChildId,
  setSelectedChildId,
  childFormOpen,
  childFormEditing,
  setChildFormOpen,
  setChildFormEditing,
  addOrUpdateChild,
  deleteChild,
  updateChildVaccines,
  updateChildGrowth,
  updateChildMedications,
  ageFromDateOfBirth,
}: FamilyHealthSectionProps) {
  const tabs: { id: FamilySubSection; label: string; icon: string }[] = [
    { id: 'profiles', label: 'Child profiles', icon: '≡ƒæ╢' },
    { id: 'vaccines', label: 'Vaccines', icon: '≡ƒÆë' },
    { id: 'growth', label: 'Height & weight', icon: '≡ƒôê' },
    { id: 'medication', label: 'Medication', icon: '≡ƒÆè' },
  ];

  const selectedChild = selectedChildId ? children.find(c => c.id === selectedChildId) : null;

  // Child form state
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childSex, setChildSex] = useState('');
  const openChildForm = (editing: ChildProfile | null) => {
    setChildFormEditing(editing);
    if (editing) {
      setChildName(editing.name);
      setChildDob(editing.dateOfBirth.slice(0, 10));
      setChildSex(editing.sex ?? '');
    } else {
      setChildName('');
      setChildDob('');
      setChildSex('');
    }
    setChildFormOpen(true);
  };
  const closeChildForm = () => {
    setChildFormOpen(false);
    setChildFormEditing(null);
    setChildName('');
    setChildDob('');
    setChildSex('');
  };
  const submitChildForm = async () => {
    const name = childName.trim();
    const dateOfBirth = childDob.trim() || new Date().toISOString().slice(0, 10);
    if (!name) return;
    const payload = childFormEditing
      ? { ...childFormEditing, name, dateOfBirth, sex: childSex.trim() || undefined }
      : { name, dateOfBirth, sex: childSex.trim() || undefined, vaccines: [], growth: [], medications: [] };
    const id = await addOrUpdateChild(payload);
    if (id) closeChildForm();
  };

  // Vaccine form
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDate, setVaccineDate] = useState(new Date().toISOString().slice(0, 10));
  const [vaccineExpiration, setVaccineExpiration] = useState(''); // empty = none
  const [vaccineNoExpiration, setVaccineNoExpiration] = useState(true);
  const [vaccineNotes, setVaccineNotes] = useState('');
  const addVaccine = async () => {
    if (!selectedChild || !vaccineName.trim()) return;
    const entry: VaccineEntry = {
      id: genId(),
      name: vaccineName.trim(),
      date: vaccineDate,
      notes: vaccineNotes.trim() || undefined,
      ...(vaccineNoExpiration || !vaccineExpiration.trim() ? {} : { expirationDate: vaccineExpiration.trim() }),
    };
    const list = [...(selectedChild.vaccines ?? []), entry];
    const ok = await updateChildVaccines(selectedChild.id, list);
    if (ok) {
      setVaccineName('');
      setVaccineDate(new Date().toISOString().slice(0, 10));
      setVaccineExpiration('');
      setVaccineNoExpiration(true);
      setVaccineNotes('');
    }
  };
  const removeVaccine = async (child: ChildProfile, vaccineId: string) => {
    const list = (child.vaccines ?? []).filter(v => v.id !== vaccineId);
    await updateChildVaccines(child.id, list);
  };

  // Growth form
  const [growthDate, setGrowthDate] = useState(new Date().toISOString().slice(0, 10));
  const [growthHeight, setGrowthHeight] = useState('');
  const [growthWeight, setGrowthWeight] = useState('');
  const addGrowth = async () => {
    if (!selectedChild) return;
    const heightCm = growthHeight.trim() ? parseFloat(growthHeight) : undefined;
    const weightKg = growthWeight.trim() ? parseFloat(growthWeight) : undefined;
    if (!heightCm && !weightKg) return;
    const entry: GrowthEntry = { id: genId(), date: growthDate, heightCm, weightKg };
    const list = [...(selectedChild.growth ?? []), entry];
    const ok = await updateChildGrowth(selectedChild.id, list);
    if (ok) {
      setGrowthDate(new Date().toISOString().slice(0, 10));
      setGrowthHeight('');
      setGrowthWeight('');
    }
  };
  const removeGrowth = async (child: ChildProfile, entryId: string) => {
    const list = (child.growth ?? []).filter(g => g.id !== entryId);
    await updateChildGrowth(child.id, list);
  };

  // Medication form
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medSchedule, setMedSchedule] = useState('');
  const [medNotes, setMedNotes] = useState('');
  const addMedication = async () => {
    if (!selectedChild || !medName.trim()) return;
    const entry: MedicationEntry = {
      id: genId(),
      name: medName.trim(),
      dosage: medDosage.trim() || undefined,
      schedule: medSchedule.trim() || undefined,
      notes: medNotes.trim() || undefined,
    };
    const list = [...(selectedChild.medications ?? []), entry];
    const ok = await updateChildMedications(selectedChild.id, list);
    if (ok) {
      setMedName('');
      setMedDosage('');
      setMedSchedule('');
      setMedNotes('');
    }
  };
  const removeMedication = async (child: ChildProfile, medId: string) => {
    const list = (child.medications ?? []).filter(m => m.id !== medId);
    await updateChildMedications(child.id, list);
  };

  return (
    <div className="min-h-[60vh] pb-16">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Family Health</h2>
      <p className="text-gray-600 text-sm mb-6">
        Manage your children's health records, vaccinations, and symptoms.
      </p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFamilySubSection(tab.id);
              if ((tab.id === 'vaccines' || tab.id === 'growth' || tab.id === 'medication') && children.length > 0 && !selectedChildId) {
                setSelectedChildId(children[0].id);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              familySubSection === tab.id ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {childrenError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">{childrenError}</p>
        </div>
      )}

      {childrenLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ΓöÇΓöÇ Child profiles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {familySubSection === 'profiles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-gray-500">Add and manage profiles for each child.</p>
                <button
                  type="button"
                  onClick={() => openChildForm(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 shadow-sm transition-colors"
                >
                  Add child
                </button>
              </div>
              {children.length === 0 ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-10 text-center">
                  <p className="text-gray-600 font-medium mb-1">No child profiles yet</p>
                  <p className="text-sm text-gray-500 mb-4">Add your first child to start tracking vaccines, growth, and medication.</p>
                  <button type="button" onClick={() => openChildForm(null)} className="text-rose-600 font-medium text-sm hover:underline">
                    Add your first child ΓåÆ
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {children.map(child => (
                    <div
                      key={child.id}
                      className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm hover:border-rose-200 transition-all flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl flex-shrink-0">≡ƒæ╢</div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openChildForm(child)}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded-lg text-sm font-medium"
                            aria-label="Edit"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => window.confirm('Remove this child?') && deleteChild(child.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-lg text-sm font-medium"
                            aria-label="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900">{child.name}</h3>
                      <p className="text-sm text-gray-500">
                        DOB: {formatDate(child.dateOfBirth)}
                        {ageFromDateOfBirth(child.dateOfBirth) != null && (
                          <span> ┬╖ {ageFromDateOfBirth(child.dateOfBirth)} years</span>
                        )}
                      </p>
                      {child.sex && <p className="text-xs text-gray-400 mt-0.5">{child.sex}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ΓöÇΓöÇ Vaccines ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {familySubSection === 'vaccines' && (
            <div className="space-y-6 max-w-2xl">
              {children.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-8 text-center">
                  <p className="text-amber-800 font-medium mb-1">Add a child first</p>
                  <p className="text-sm text-amber-700">Go to Child profiles and add a child, then you can record vaccines here.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select child</label>
                    <select
                      value={selectedChildId ?? ''}
                      onChange={e => setSelectedChildId(e.target.value || null)}
                      className="w-full max-w-xs rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                    >
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedChild && (
                    <>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Add vaccine</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Vaccine name"
                            value={vaccineName}
                            onChange={e => setVaccineName(e.target.value)}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                          <input
                            type="date"
                            value={vaccineDate}
                            onChange={e => setVaccineDate(e.target.value)}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={vaccineNoExpiration}
                              onChange={e => {
                                setVaccineNoExpiration(e.target.checked);
                                if (e.target.checked) setVaccineExpiration('');
                              }}
                              className="rounded border-rose-200 text-rose-600 focus:ring-rose-200"
                            />
                            No expiration date
                          </label>
                          {!vaccineNoExpiration && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Expiration date</label>
                              <input
                                type="date"
                                value={vaccineExpiration}
                                onChange={e => setVaccineExpiration(e.target.value)}
                                className="rounded-lg border border-rose-100 px-3 py-2 text-sm w-full max-w-xs"
                              />
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={vaccineNotes}
                          onChange={e => setVaccineNotes(e.target.value)}
                          className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addVaccine}
                          disabled={childrenSaving || !vaccineName.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                        >
                          {childrenSaving ? 'SavingΓÇª' : 'Add vaccine'}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Vaccination history</h3>
                        {(selectedChild.vaccines ?? []).length === 0 ? (
                          <p className="text-sm text-gray-500">No vaccines recorded yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {(selectedChild.vaccines ?? []).map(v => (
                              <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-800">{v.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(v.date)}
                                    {v.expirationDate ? ` ┬╖ Expires ${formatDate(v.expirationDate)}` : ' ┬╖ No expiration'}
                                    {v.notes ? ` ┬╖ ${v.notes}` : ''}
                                  </p>
                                </div>
                                <button type="button" onClick={() => removeVaccine(selectedChild, v.id)} className="text-gray-400 hover:text-red-600 text-sm">Remove</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ΓöÇΓöÇ Height & weight ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {familySubSection === 'growth' && (
            <div className="space-y-6 max-w-2xl">
              {children.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 text-center">
                  <p className="text-emerald-800 font-medium mb-1">Add a child first</p>
                  <p className="text-sm text-emerald-700">Go to Child profiles and add a child, then you can log height and weight here.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select child</label>
                    <select
                      value={selectedChildId ?? ''}
                      onChange={e => setSelectedChildId(e.target.value || null)}
                      className="w-full max-w-xs rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                    >
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedChild && (
                    <>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Add height and/or weight</h3>
                        <p className="text-xs text-gray-500">Enter at least one: height (cm), weight (kg), or both.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="date"
                            value={growthDate}
                            onChange={e => setGrowthDate(e.target.value)}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Height (cm)"
                            value={growthHeight}
                            onChange={e => setGrowthHeight(e.target.value)}
                            min={0}
                            step={0.1}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Weight (kg)"
                            value={growthWeight}
                            onChange={e => setGrowthWeight(e.target.value)}
                            min={0}
                            step={0.1}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addGrowth}
                          disabled={childrenSaving || (!growthHeight.trim() && !growthWeight.trim())}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          {childrenSaving ? 'SavingΓÇª' : 'Add entry'}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Height & weight history</h3>
                        {(selectedChild.growth ?? []).length === 0 ? (
                          <p className="text-sm text-gray-500">No measurements yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {(selectedChild.growth ?? [])
                              .slice()
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map(g => (
                                <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-4 py-3">
                                  <div>
                                    <p className="text-sm text-gray-800">
                                      {formatDate(g.date)}
                                      {g.heightCm != null && <span className="text-gray-600"> ┬╖ {g.heightCm} cm</span>}
                                      {g.weightKg != null && <span className="text-gray-600"> ┬╖ {g.weightKg} kg</span>}
                                    </p>
                                  </div>
                                  <button type="button" onClick={() => removeGrowth(selectedChild, g.id)} className="text-gray-400 hover:text-red-600 text-sm">Remove</button>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ΓöÇΓöÇ Medication ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {familySubSection === 'medication' && (
            <div className="space-y-6 max-w-2xl">
              {children.length === 0 ? (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-8 text-center">
                  <p className="text-violet-800 font-medium mb-1">Add a child first</p>
                  <p className="text-sm text-violet-700">Go to Child profiles and add a child, then you can record medications here.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select child</label>
                    <select
                      value={selectedChildId ?? ''}
                      onChange={e => setSelectedChildId(e.target.value || null)}
                      className="w-full max-w-xs rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                    >
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedChild && (
                    <>
                      <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Add medication</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Medication name"
                            value={medName}
                            onChange={e => setMedName(e.target.value)}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Dosage"
                            value={medDosage}
                            onChange={e => setMedDosage(e.target.value)}
                            className="rounded-lg border border-rose-100 px-3 py-2 text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Schedule (e.g. twice daily)"
                          value={medSchedule}
                          onChange={e => setMedSchedule(e.target.value)}
                          className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={medNotes}
                          onChange={e => setMedNotes(e.target.value)}
                          className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addMedication}
                          disabled={childrenSaving || !medName.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:opacity-50"
                        >
                          {childrenSaving ? 'SavingΓÇª' : 'Add medication'}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Medication list</h3>
                        {(selectedChild.medications ?? []).length === 0 ? (
                          <p className="text-sm text-gray-500">No medications recorded yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {(selectedChild.medications ?? []).map(m => (
                              <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-800">{m.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {[m.dosage, m.schedule, m.notes].filter(Boolean).join(' ┬╖ ')}
                                  </p>
                                </div>
                                <button type="button" onClick={() => removeMedication(selectedChild, m.id)} className="text-gray-400 hover:text-red-600 text-sm">Remove</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/Edit child modal */}
      {childFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={closeChildForm}
          role="dialog"
          aria-modal="true"
          aria-label={childFormEditing ? 'Edit child' : 'Add child'}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-rose-100 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">{childFormEditing ? 'Edit child' : 'Add child'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={childName}
                  onChange={e => setChildName(e.target.value)}
                  placeholder="Child's name"
                  className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date of birth</label>
                <input
                  type="date"
                  value={childDob}
                  onChange={e => setChildDob(e.target.value)}
                  className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sex (optional)</label>
                <select
                  value={childSex}
                  onChange={e => setChildSex(e.target.value)}
                  className="w-full rounded-lg border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                >
                  <option value="">ΓÇö</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeChildForm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitChildForm}
                disabled={childrenSaving || !childName.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {childrenSaving ? 'SavingΓÇª' : childFormEditing ? 'Save' : 'Add child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
