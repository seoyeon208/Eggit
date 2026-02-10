import { create } from 'zustand';

/**
 * useNotificationStore
 * Decoupled Toast and Modal states to prevent state conflicts.
 */
const useNotificationStore = create((set) => ({
    // Toast State (Passive notifications)
    toast: {
        show: false,
        message: '',
        type: 'info',
        duration: 4000
    },

    // Modal State (Active confirmation dialogs)
    modal: {
        show: false,
        message: '',
        type: 'info',
        actionLabel: null,
        onAction: null
    },

    /**
     * Show a passive toast notification (top-right)
     */
    notify: (message, type = 'info', duration = 4000) => {
        set({
            toast: { show: true, message, type, duration }
        });
    },

    /**
     * Hide the current toast
     */
    hideToast: () => set((state) => ({
        toast: { ...state.toast, show: false }
    })),

    /**
     * Show an active confirmation modal (centered)
     */
    confirm: (message, onConfirm, actionLabel = '확인', type = 'info') => {
        set({
            modal: {
                show: true,
                message,
                type,
                actionLabel,
                onAction: async () => {
                    // Close immediately for better UX
                    set((state) => ({ modal: { ...state.modal, show: false } }));
                    // Then execute the action (it might call notify())
                    if (onConfirm) await onConfirm();
                }
            }
        });
    },

    /**
     * Hide the current modal without taking action
     */
    hideModal: () => set((state) => ({
        modal: { ...state.modal, show: false }
    })),

    // Evolution Overlay State
    evolution: {
        show: false,
        resultCode: 'VBS',
        childImage: '',
        adultImage: '',
        isMaster: false,
        animStage: 'strange' // 'strange', 'evolving', 'result'
    },

    /**
     * Trigger the full-screen evolution animation
     */
    showEvolution: (resultCode, childImage, adultImage, isMaster = false) => set({
        evolution: { show: true, resultCode, childImage, adultImage, isMaster, animStage: 'strange' }
    }),

    /**
     * Update the current stage of the evolution animation
     */
    setEvolutionStage: (stage) => set((state) => ({
        evolution: { ...state.evolution, animStage: stage }
    })),

    /**
     * Hide the evolution overlay
     */
    hideEvolution: () => set((state) => ({
        evolution: { show: false, resultCode: 'VBS', childImage: '', adultImage: '', isMaster: false, animStage: 'strange' }
    })),

    // Level Up Overlay State
    levelUp: {
        show: false
    },

    /**
     * Trigger the full-screen level-up animation
     */
    showLevelUp: () => set({
        levelUp: { show: true }
    }),

    /**
     * Hide the level-up overlay
     */
    hideLevelUp: () => set({
        levelUp: { show: false }
    })
}));

export default useNotificationStore;
