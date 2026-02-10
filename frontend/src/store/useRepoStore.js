// src/stores/useRepoStore.js
import { create } from 'zustand';
import axios from 'axios';

const useRepoStore = create((set, get) => ({
    repos: [],
    isLoading: false,
    error: null,
    
    // 이미 불러왔다면 다시 부르지 않도록 체크하는 플래그
    isFetched: false,

    fetchRepos: async () => {
        // 이미 데이터가 있고 로딩중이 아니면 스킵 (캐싱 효과)
        if (get().isFetched && get().repos.length > 0) return;

        set({ isLoading: true, error: null });
        
        try {
            const token = localStorage.getItem('access_token');
            const API_BASE_URL = import.meta.env.VITE_API_URL;

            const response = await axios.get(`${API_BASE_URL}/github/repos`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            set({ repos: response.data, isFetched: true, isLoading: false });
        } catch (err) {
            console.error("Failed to fetch repos:", err);
            set({ error: "레포지토리 목록을 불러오는데 실패했습니다.", isLoading: false });
        }
    }
}));

export default useRepoStore;