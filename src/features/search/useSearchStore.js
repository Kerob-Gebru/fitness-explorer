import { create } from 'zustand'

// Search text and filters live here because the Home page, the category shortcuts
// and the Explore page all need to share them.
const emptyFilters = { search: '', bodyPart: '', target: '', equipment: '' }

export const useSearchStore = create((set) => ({
  ...emptyFilters,
  setSearch: (search) => set({ search }),
  setBodyPart: (bodyPart) => set({ bodyPart }),
  setTarget: (target) => set({ target }),
  setEquipment: (equipment) => set({ equipment }),
  resetFilters: () => set(emptyFilters),
}))
