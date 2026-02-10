import { create } from 'zustand';

const useGuestbookStore = create((set) => ({
    isOpen: false,
    isMinimized: false,
    open: () => set({ isOpen: true, isMinimized: false }),
    close: () => set({ isOpen: false, isMinimized: false }),
    toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized }))
}));

export default useGuestbookStore;
