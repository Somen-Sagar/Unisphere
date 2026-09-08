import { create } from 'zustand';

type PreferencesState = {
  selectedCollegeId: string | null;
  setSelectedCollegeId: (collegeId: string | null) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  selectedCollegeId: null,
  setSelectedCollegeId: (selectedCollegeId) => set({ selectedCollegeId }),
}));
