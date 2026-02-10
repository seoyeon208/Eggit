import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * BlogPostingStore - 블로그 포스팅 페이지 전역 상태 관리
 * 
 * 기능:
 * - Tech 블로그 및 Docs 사이트 작성 데이터 저장
 * - AI 생성 결과 및 사용자 작업 내용 유지
 * - 메인 화면 이동 시에도 데이터 보존
 * - localStorage를 통한 영구 저장
 */
const useBlogPostingStore = create(
    persist(
        (set, get) => ({
            // ====================================================================
            // 공통 리소스
            // ====================================================================
            blogList: [],
            sourceRepos: [],

            // ====================================================================
            // Tech 블로그 데이터
            // ====================================================================
            techData: {
                selectedBlog: null,
                targetRepo: "",
                postTitle: "",
                markdownContent: "",
                category: "General",
                tags: "",
                imageInfo: { path: "", alt: "" },
                options: { math: false, mermaid: false, pin: false },
                aiResult: null,
                mode: 'create', // 'create' | 'edit'
                originalPath: null,
                originalSha: null,
                // [New] 독립적인 리소스 관리
                categories: [],
                posts: []
            },

            // ====================================================================
            // Docs 사이트 데이터
            // ====================================================================
            docsData: {
                selectedBlog: null,
                postTitle: "",
                markdownContent: "",
                category: "",
                imageInfo: { path: "", alt: "" },
                options: { nav_order: "" },
                activeDocPath: null,
                sourceFiles: [],
                selectedRefs: [],
                userPrompt: "",
                mode: 'create',
                originalPath: null,
                originalSha: null,
                // [New] 독립적인 리소스 관리
                categories: [],
                posts: []
            },

            // ====================================================================
            // AI 히스토리
            // ====================================================================
            aiHistory: {
                tech: null,
                docsScan: null,
                docsContent: null
            },

            // ====================================================================
            // 사용자 작업 공간
            // ====================================================================
            userWorkspace: {
                tech: null,
                docs: null
            },

            // ====================================================================
            // UI 상태
            // ====================================================================
            activeTab: 'tech', // 'tech' | 'docs'
            isDirty: false, // 수정 여부

            // ====================================================================
            // Actions - 공통 리소스
            // ====================================================================
            setBlogList: (blogList) => set({ blogList }),
            setSourceRepos: (sourceRepos) => set({ sourceRepos }),

            // ====================================================================
            // Actions - Tech 데이터
            // ====================================================================
            setTechData: (updates) => set((state) => {
                const newValues = typeof updates === 'function' ? updates(state.techData) : updates;
                return {
                    techData: { ...state.techData, ...newValues },
                    isDirty: true
                };
            }),

            updateTechField: (field, value) => set((state) => ({
                techData: { ...state.techData, [field]: value },
                isDirty: true
            })),

            resetTechData: () => set({
                techData: {
                    selectedBlog: null,
                    targetRepo: "",
                    postTitle: "",
                    markdownContent: "",
                    category: "General",
                    tags: "",
                    imageInfo: { path: "", alt: "" },
                    options: { math: false, mermaid: false, pin: false },
                    aiResult: null,
                    mode: 'create',
                    originalPath: null,
                    originalSha: null,
                    categories: [],
                    posts: []
                },
                isDirty: false
            }),

            // ====================================================================
            // Actions - Docs 데이터
            // ====================================================================
            setDocsData: (updates) => set((state) => {
                const newValues = typeof updates === 'function' ? updates(state.docsData) : updates;
                return {
                    docsData: { ...state.docsData, ...newValues },
                    isDirty: true
                };
            }),

            updateDocsField: (field, value) => set((state) => ({
                docsData: { ...state.docsData, [field]: value },
                isDirty: true
            })),

            resetDocsData: () => set({
                docsData: {
                    selectedBlog: null,
                    postTitle: "",
                    markdownContent: "",
                    category: "",
                    imageInfo: { path: "", alt: "" },
                    options: { nav_order: "" },
                    activeDocPath: null,
                    sourceFiles: [],
                    selectedRefs: [],
                    userPrompt: "",
                    mode: 'create',
                    originalPath: null,
                    originalSha: null,
                    categories: [],
                    posts: []
                },
                isDirty: false
            }),

            // ====================================================================
            // Actions - AI 히스토리
            // ====================================================================
            setAiHistory: (type, data) => set((state) => ({
                aiHistory: { ...state.aiHistory, [type]: data }
            })),

            clearAiHistory: (type) => set((state) => ({
                aiHistory: { ...state.aiHistory, [type]: null }
            })),

            // ====================================================================
            // Actions - 사용자 작업 공간
            // ====================================================================
            setUserWorkspace: (type, data) => set((state) => ({
                userWorkspace: { ...state.userWorkspace, [type]: data }
            })),

            clearUserWorkspace: (type) => set((state) => ({
                userWorkspace: { ...state.userWorkspace, [type]: null }
            })),

            // ====================================================================
            // Actions - UI 상태
            // ====================================================================
            setActiveTab: (tab) => set({ activeTab: tab }),

            setIsDirty: (isDirty) => set({ isDirty }),

            // ====================================================================
            // Actions - 전체 초기화
            // ====================================================================
            resetAll: () => set({
                techData: {
                    selectedBlog: null,
                    targetRepo: "",
                    postTitle: "",
                    markdownContent: "",
                    category: "General",
                    tags: "",
                    imageInfo: { path: "", alt: "" },
                    options: { math: false, mermaid: false, pin: false },
                    aiResult: null,
                    mode: 'create',
                    originalPath: null,
                    originalSha: null,
                    categories: [],
                    posts: []
                },
                docsData: {
                    selectedBlog: null,
                    postTitle: "",
                    markdownContent: "",
                    category: "",
                    imageInfo: { path: "", alt: "" },
                    options: { nav_order: "" },
                    activeDocPath: null,
                    sourceFiles: [],
                    selectedRefs: [],
                    userPrompt: "",
                    mode: 'create',
                    originalPath: null,
                    originalSha: null,
                    categories: [],
                    posts: []
                },
                aiHistory: {
                    tech: null,
                    docsScan: null,
                    docsContent: null
                },
                userWorkspace: {
                    tech: null,
                    docs: null
                },
                isDirty: false
            }),

            // ====================================================================
            // Helper - 현재 활성 탭 데이터 가져오기
            // ====================================================================
            getCurrentData: () => {
                const state = get();
                return state.activeTab === 'tech' ? state.techData : state.docsData;
            },

            // ====================================================================
            // Helper - 현재 활성 탭 데이터 설정
            // ====================================================================
            setCurrentData: (updates) => {
                const state = get();
                if (state.activeTab === 'tech') {
                    state.setTechData(updates);
                } else {
                    state.setDocsData(updates);
                }
            },
        }),
        {
            name: 'blog-posting-storage', // localStorage key
            // 특정 필드만 영구 저장 (선택적)
            partialize: (state) => ({
                // techData 저장 시 categories, posts 제외 (용량 절약 & 항상 최신화 필요 여부 고민)
                // 만약 오프라인/새로고침 복원을 원하면 포함해야 함. 
                // 여기서는 사용자 경험(독립성)을 위해 포함시키되, 너무 크면 제외 고려.
                // 일단 포함시킵니다.
                techData: state.techData,
                docsData: state.docsData,
                aiHistory: state.aiHistory,
                userWorkspace: state.userWorkspace,
                activeTab: state.activeTab,
                isDirty: state.isDirty,
                // blogList, sourceRepos 등은 매번 새로 불러오므로 저장 안 함
            }),
        }
    )
);

export default useBlogPostingStore;
