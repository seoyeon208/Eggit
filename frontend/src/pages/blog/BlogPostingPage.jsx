import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

// [Import] 하위 컴포넌트 (정상적인 분리 구조)
import PostingSettings from "../../components/blog/PostingSettings";
import MarkdownEditor from "../../components/blog/MarkdownEditor";
import AIAssistant from "../../components/blog/AIAssistant";
import FloatingBackButton from "../../components/common/FloatingBackButton";
import { useGeneration } from "../../contexts/GenerationContext";
import useDeploymentStore from "../../store/useDeploymentStore";
import useNotificationStore from "../../store/useNotificationStore";
import useBlogPostingStore from "../../store/useBlogPostingStore";
import TutorialOverlay from "../../components/common/TutorialOverlay";
import useTutorialStore from "../../store/useTutorialStore";

// ============================================================================
// [Helper] YAML Front Matter Parser
// ============================================================================
const parseFrontMatter = (rawContent) => {
    const fmRegex = /^---\n([\s\S]+?)\n---\n/;
    const match = rawContent.match(fmRegex);

    if (!match) {
        return { metadata: {}, body: rawContent };
    }

    const yamlBlock = match[1];
    const body = rawContent.replace(fmRegex, '').trim();
    const metadata = {};

    const lines = yamlBlock.split('\n');
    let currentKey = null;

    lines.forEach(line => {
        if (line.trim().startsWith('- ')) {
            if (currentKey) {
                if (!Array.isArray(metadata[currentKey])) metadata[currentKey] = [];
                let val = line.trim().substring(2).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                metadata[currentKey].push(val);
            }
            return;
        }

        const sepIndex = line.indexOf(':');
        if (sepIndex !== -1) {
            const key = line.slice(0, sepIndex).trim();
            let value = line.slice(sepIndex + 1).trim();

            if (!value) {
                currentKey = key;
                return;
            }

            if (line.startsWith('  ') && currentKey === 'image') {
                if (typeof metadata['image'] !== 'object') metadata['image'] = {};
                metadata['image'][key] = value.replace(/^["'](.*)["]$/, '$1');
                return;
            }

            value = value.replace(/^["'](.*)["]$/, '$1');

            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(Number(value))) value = Number(value);

            metadata[key] = value;
            currentKey = key;
        }
    });

    return { metadata, body };
};

export default function BlogPostingPage() {
    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // [Context] AI 작업 상태 및 제어 함수
    const { startGeneration, genStatus, genResult, resetGeneration, tasks, removeTask } = useGeneration();
    const { startDeploy } = useDeploymentStore();
    const { notify, confirm } = useNotificationStore();
    const { isActive: isTutorialActive, nextStep } = useTutorialStore();

    // [Global Store] 블로그 포스팅 상태 관리
    const {
        // 데이터
        techData,
        docsData,
        aiHistory,
        userWorkspace,
        blogList,
        sourceRepos,
        categories,
        allPosts,
        activeTab: storeActiveTab,
        isDirty,
        // Actions
        setTechData,
        setDocsData,
        setAiHistory,
        setUserWorkspace,
        setBlogList,
        setSourceRepos,
        // categories, allPosts 제거됨
        setActiveTab: setStoreActiveTab,
        setIsDirty,
        getCurrentData,
        setCurrentData,
        pendingRequest,
        setPendingRequest
    } = useBlogPostingStore();

    // [Local UI State] - URL params와 동기화
    const [isLoading, setIsLoading] = useState(false);
    const pendingFiles = useRef(new Map());
    const processedTaskIdRef = useRef(new Set());
    const [editorMode, setEditorMode] = useState('user');

    // [State Priority] activeTab은 URL params 최우선 -> 없으면 Store값
    const activeTab = searchParams.get('tab') || storeActiveTab;

    const setActiveTab = (tab) => {
        setStoreActiveTab(tab);
        if (tab) setSearchParams({ tab });
        else setSearchParams({});
        setIsDirty(false);
    };

    // [Fix] 현재 탭과 일치하는 진행 중인 작업 식별 (탭 독립성 보장)
    const currentTabTask = Object.values(tasks || {}).find(t => {
        if (t.status !== 'processing') return false;

        const isTechTask = t.type === 'tech_blog' || t.requestPayload?.template_type === 'tech_blog';
        const isDocsTask = t.type?.startsWith('docs') || t.requestPayload?.type?.startsWith('docs');

        if (activeTab === 'tech' && isTechTask) return true;
        if (activeTab === 'docs' && isDocsTask) return true;
        return false;
    });

    const isProcessing = !!currentTabTask;
    const currentTaskType = currentTabTask
        ? (currentTabTask.requestPayload?.template_type || currentTabTask.requestPayload?.type || currentTabTask.type)
        : null;

    // [Fix] Store Helper 대신 명시적 선택 (데이터 독립성 보장)
    const currentData = activeTab === 'tech' ? techData : docsData;

    // [Init]
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam !== activeTab) {
            setStoreActiveTab(tabParam);
        }
    }, [searchParams, activeTab, setStoreActiveTab]);

    useEffect(() => {
        const fetchInitData = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            try {
                const [blogsRes, reposRes] = await Promise.all([
                    axios.get(`${API_URL}/blog/blogs`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/github/repos`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setBlogList(blogsRes.data);
                setSourceRepos(reposRes.data);

                if (pendingRequest) {
                    restoreRequestConfig(pendingRequest, blogsRes.data);
                    setPendingRequest(null); // [Fix] 처리 후 초기화하여 반복적인 탭 전환 방지
                }
            } catch (err) {
                console.error("Init Data Error:", err);
            }
        };
        fetchInitData();
    }, [API_URL]);

    // [CRITICAL FIX] Navigation State 처리 (AI 완료 후 복원)
    // blogList가 로드된 이후에만 실행되도록 의존성 관리
    useEffect(() => {
        if (location.state?.aiResult && blogList.length > 0) {
            const { aiResult, restoreId, taskType, blogRepo, sourceRepo, activeTab: restoredTab } = location.state;

            // [Fix] 이미 처리된 작업은 무시 (무한 루프 방지)
            const uniqueKey = restoreId || (aiResult.task_id ? aiResult.task_id : JSON.stringify(aiResult).slice(0, 20));
            if (processedTaskIdRef.current.has(uniqueKey)) return;
            processedTaskIdRef.current.add(uniqueKey);

            console.log(`📥 [State Restoration] Task: ${taskType}, Blog: ${blogRepo}`);

            // [Fix] MainCenterPanel에서 전달한 정확한 탭 정보 사용
            const targetTab = restoredTab || (taskType && taskType.includes('tech') ? 'tech' : 'docs');

            // 1. 블로그/소스 레포지토리 복원
            const matchedBlog = blogList.find(b => b.repo_name === blogRepo);

            // [Fix] Store 자동 병합 활용 (기존 값을 참조할 필요 없음)
            if (targetTab === 'docs') {
                if (matchedBlog) setDocsData({ selectedBlog: matchedBlog });
            } else {
                const updates = {};
                if (matchedBlog) updates.selectedBlog = matchedBlog;
                if (sourceRepo) updates.targetRepo = sourceRepo;
                if (Object.keys(updates).length > 0) setTechData(updates);
            }

            // 2. AI 결과 적용
            applyAIResult(aiResult, targetTab);

            // 3. 탭 전환 및 State 클리어
            navigate(location.pathname + `?tab=${targetTab}`, { replace: true, state: {} });
            if (restoreId) removeTask(restoreId);
        }
        // [Fix] 의존성 배열에서 docsData, techData 제거 (무한 루프 방지)
    }, [location.state, blogList, setDocsData, setTechData, navigate, removeTask]);

    const restoreRequestConfig = (req, blogs) => {
        const type = req.template_type || req.type;
        const matchedBlog = blogs.find(b => b.repo_name === req.blog_repo);

        if (type?.includes('docs')) {
            setActiveTab('docs');
            if (matchedBlog) setDocsData({ selectedBlog: matchedBlog });
        } else {
            setActiveTab('tech');
            const updates = {};
            if (req.source_repo) updates.targetRepo = req.source_repo;
            if (matchedBlog) updates.selectedBlog = matchedBlog;
            if (Object.keys(updates).length > 0) setTechData(updates);
        }
    };

    // ========================================================================
    // [AUTO-CONSUME & AI Handler]
    // ========================================================================
    // [Fix] AI 작업 완료 후, 탭 진입 시에만 결과 적용 (실시간 덮어쓰기 방지)
    useEffect(() => {
        if (!activeTab || !tasks) return;

        // location.state에 의한 복원이 진행 중이면 스킵
        if (location.state?.aiResult) return;

        const finishedTaskEntry = Object.entries(tasks).find(([key, task]) => {
            if (task.status !== 'success') return false;

            const isTechTab = activeTab === 'tech';
            const isTechTask = task.type?.includes('tech');

            if (isTechTab && isTechTask) return true;
            if (!isTechTab && !isTechTask) return true;

            return false;
        });

        if (finishedTaskEntry) {
            const [key, task] = finishedTaskEntry;
            const result = task.result;

            if (processedTaskIdRef.current.has(key)) return;

            // 사용자가 이미 내용을 수정 중이면 덮어쓰지 않음
            if (isDirty) {
                console.log("⚠️ User is editing, skipping tab-entry auto-consume");
                return;
            }

            processedTaskIdRef.current.add(key);

            console.log(`⚡ [Tab Entry Consume] Found finished task for ${activeTab}. Key: ${key}`);

            applyAIResult(result, activeTab);
            removeTask(key);
        }
        // [중요] tasks가 변경되어도 실행되지 않도록 tasks를 의존성에서 제외
        // 오직 탭이 변경되었을 때(activeTab) 혹은 컴포넌트 마운트 시에만 체크함
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, removeTask, isDirty, location.state]);


    // [CRITICAL FIX] AI 결과 적용 (데이터 정합성 복구)
    const applyAIResult = (result, targetTab) => {
        if (result.task_type === 'docs_recommend') {
            // [Fix] 백엔드에서 받은 전체 파일 리스트(recommended 플래그 포함)
            const allFiles = result.recommendations || result.files || [];
            console.log(`🔍 [AI Scan Result] received ${allFiles.length} files. (Recommended: ${allFiles.filter(f => f.recommended).length})`);

            // [Fix] 추천된 파일(recommended: true)만 골라서 선택 상태(selectedRefs)로 만듦
            const recommendedPaths = allFiles
                .filter(f => f.recommended === true)
                .map(f => f.path);

            const scanData = {
                sourceFiles: allFiles,      // 전체 트리 구조용 (모든 파일)
                recommendedRefs: recommendedPaths // 자동 체크용 (추천 파일)
            };
            setAiHistory('docsScan', scanData);

            if (targetTab === 'docs') {
                setDocsData({
                    sourceFiles: scanData.sourceFiles,   // UI 트리에 전체 목록 전달
                    selectedRefs: scanData.recommendedRefs // UI 체크박스에 추천 목록 전달
                });
            }
        }
        else if (result.task_type === 'docs_copilot') {
            if (result.markdown_template) {
                const contentData = {
                    markdown: result.markdown_template,
                    imageInfo: { path: "", alt: "" },
                    options: { nav_order: "" }
                };
                setAiHistory('docsContent', contentData);

                if (targetTab === 'docs') {
                    setDocsData({
                        markdownContent: contentData.markdown,
                        imageInfo: contentData.imageInfo,
                        options: contentData.options
                    });
                }
            }
        }
        else if (result.task_type === 'tech_blog') {
            const techSnapshot = {
                markdown: result.markdown_template || "",
                title: result.recommended_topics?.[0]?.title || "",
                category: result.category || "General",
                tags: "",
                aiResult: {
                    recommended_topics: result.recommended_topics || [],
                    key_concepts: result.key_concepts || [],
                    code_examples: result.code_examples || []
                },
                imageInfo: { path: "", alt: "" },
                options: { math: false, mermaid: false, pin: false }
            };
            setAiHistory('tech', techSnapshot);

            if (targetTab === 'tech') {
                setTechData({
                    markdownContent: techSnapshot.markdown,
                    postTitle: techSnapshot.title,
                    category: techSnapshot.category,
                    tags: techSnapshot.tags,
                    aiResult: techSnapshot.aiResult,
                    imageInfo: techSnapshot.imageInfo,
                    options: techSnapshot.options,
                    mode: 'create'
                });
            }
        }
        // [New] AI 결과 적용 시 자동으로 AI 모드로 전환
        if (activeTab === targetTab) {
            setEditorMode('ai');
        }
    };

    // ========================================================================
    // [Swap Logic]
    // ========================================================================
    const handleSaveWorkspace = () => {
        if (activeTab === 'tech') {
            setUserWorkspace('tech', { ...techData });
            console.log("💾 Tech Workspace Saved Locally");
        } else {
            setUserWorkspace('docs', { ...docsData });
            console.log("💾 Docs Workspace Saved Locally");
        }
    };

    const handleRestoreUserWorkspace = () => {
        const target = activeTab === 'tech' ? userWorkspace.tech : userWorkspace.docs;
        // [Fix] Alert 제거 & 데이터 없으면 빈 상태 로드 (Default)
        if (!target) {
            // 빈 상태로 초기화 (모드만 User로 변경)
            return;
        }

        if (activeTab === 'tech') setTechData({ ...target });
        else setDocsData({ ...target });
    };

    const handleRestoreTechAI = () => {
        const h = aiHistory.tech;
        if (!h) {
            // [Fix] Alert 제거, 빈 값이면 무시하거나 빈 상태
            return;
        }
        setTechData({
            markdownContent: h.markdown,
            postTitle: h.title,
            category: h.category,
            tags: h.tags,
            aiResult: h.aiResult,
            imageInfo: h.imageInfo || { path: "", alt: "" },
            options: h.options || { math: false, mermaid: false, pin: false },
            mode: 'create'
        });
    };

    const handleRestoreDocsScan = () => {
        const h = aiHistory.docsScan;
        if (!h) return;
        setDocsData({
            sourceFiles: h.sourceFiles,
            selectedRefs: h.recommendedRefs
        });
    };

    const handleRestoreDocsContent = () => {
        const h = aiHistory.docsContent;
        if (!h) return;
        setDocsData({
            markdownContent: h.markdown,
            imageInfo: h.imageInfo || { path: "", alt: "" },
            options: h.options || { nav_order: "" }
        });
    };

    const handleRestoreAI = () => {
        if (activeTab === 'tech') handleRestoreTechAI();
        else {
            if (aiHistory.docsContent) handleRestoreDocsContent();
            else if (aiHistory.docsScan) handleRestoreDocsScan();
        }
    };

    // [New] 통합 모드 스위칭 핸들러
    const handleModeSwitch = (newMode) => {
        if (newMode === editorMode) return;

        // 1. 현재 User 작업 저장 (AI로 넘어갈 때)
        if (editorMode === 'user' && newMode === 'ai') {
            handleSaveWorkspace();
        }

        // 2. 데이터 교체
        if (newMode === 'user') {
            handleRestoreUserWorkspace();
        } else {
            handleRestoreAI();
        }

        setEditorMode(newMode);
    };

    // ========================================================================
    // [Standard Handlers]
    // ========================================================================

    // [Fix] Tech 탭 구조(카테고리/포스트) 로딩 - 독립적 관리
    useEffect(() => {
        const targetBlog = techData.selectedBlog;
        if (!targetBlog) return;

        // 이미 데이터가 있고 repo가 같다면 스킵? 
        // -> 보통 selectedBlog가 바뀌면 로드해야 함. 
        // -> 하지만 탭 전환 시에는 selectedBlog 객체 참조가 유지되므로 괜찮음.
        // -> 만약 다른데 갔다와서 재로드하고 싶다면? 
        // -> 여기서는 selectedBlog의 참조가 바뀔 때만 로드하므로 효율적임.

        // 만약 categories가 이미 있다면 스킵할 수도 있지만, 최신화를 위해 로드하는게 나을 수도 있음.
        // 여기서는 "탭 전환 시 유지"가 목표이므로, 이미 있으면 스킵하지 않더라도,
        // 탭 전환 시에는 selectedBlog가 안 바뀌므로 실행되지 않음 -> OK.

        const fetchTechStructure = async () => {
            // 이미 로드된 데이터가 있으면 재로드 방지 (선택 사항)
            // if (techData.categories.length > 0) return; 

            const token = localStorage.getItem('access_token');
            try {
                const res = await axios.get(`${API_URL}/blog/structure`, {
                    params: { repo: targetBlog.repo_name, branch: targetBlog.default_branch, theme: targetBlog.theme_type },
                    headers: { Authorization: `Bearer ${token}` }
                });

                const updates = {
                    categories: res.data.categories,
                    posts: res.data.posts
                };

                // 초기 카테고리 설정
                if (techData.mode === 'create' && res.data.categories.length > 0 && !techData.category) {
                    updates.category = res.data.categories[0];
                }

                setTechData(updates);
            } catch (e) { console.error(e); }
        };
        fetchTechStructure();
    }, [techData.selectedBlog, API_URL]);

    // [Fix] Docs 탭 구조(카테고리/포스트) 로딩 - 독립적 관리
    useEffect(() => {
        const targetBlog = docsData.selectedBlog;
        if (!targetBlog) return;

        const fetchDocsStructure = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await axios.get(`${API_URL}/blog/structure`, {
                    params: { repo: targetBlog.repo_name, branch: targetBlog.default_branch, theme: targetBlog.theme_type },
                    headers: { Authorization: `Bearer ${token}` }
                });

                setDocsData({
                    categories: res.data.categories,
                    posts: res.data.posts
                });
            } catch (e) { console.error(e); }
        };
        fetchDocsStructure();
    }, [docsData.selectedBlog, API_URL]);

    // [AI 요청 핸들러]
    const handleGenerateContent = (customPayload) => {
        let payload = { ...customPayload };

        if (activeTab === 'docs') {
            if (!docsData.selectedBlog) return notify("블로그를 선택해주세요.", "error");

            // 1. 경로 추론
            let targetPath = docsData.activeDocPath;
            if (!targetPath && docsData.postTitle) {
                const cleanTitle = docsData.postTitle.trim().replace(/\s+/g, '-');
                const cleanCategory = docsData.category ? docsData.category.trim() : "";
                targetPath = cleanCategory ? `${cleanCategory}/${cleanTitle}.md` : `${cleanTitle}.md`;
            }

            // 2. 현재 작성 내용 Context
            const currentContent = docsData.markdownContent || "";

            payload = {
                ...payload,
                source_repo: docsData.selectedBlog.repo_name,
                blog_repo: docsData.selectedBlog.repo_name,
                doc_title: docsData.postTitle || "Untitled",
                doc_path: targetPath,
                doc_context: currentContent
            };
        } else {
            const targetRepo = payload.targetRepo || techData.targetRepo;
            if (!targetRepo) return notify("소스 저장소를 선택해주세요.", "error");

            // Sync with state if different
            if (payload.targetRepo && payload.targetRepo !== techData.targetRepo) {
                setTechData(prev => ({ ...prev, targetRepo: payload.targetRepo }));
            }

            payload = {
                ...payload,
                template_type: 'tech_blog',
                source_repo: targetRepo,
                blog_repo: techData.selectedBlog.repo_name,
                selected_category: techData.category
            };
        }
        startGeneration(payload);
    };



    // AI 상태 초기화
    const handleResetAI = () => {
        if (activeTab === 'tech') {
            setTechData(prev => ({ ...prev, aiResult: null }));
        } else {
            confirm(
                "AI 분석 결과를 초기화하시겠습니까?\n(스캔된 문서는 유지됩니다)",
                () => setDocsData(prev => ({ ...prev, sourceFiles: null, aiResult: null })),
                "초기화",
                "info"
            );
        }
    };

    // 포스트 선택
    const handleSelectPost = async (post) => {
        if (!post.path || post.path.startsWith('__virtual__')) return;
        const targetBlog = activeTab === 'tech' ? techData.selectedBlog : docsData.selectedBlog;
        if (!targetBlog) return;

        const token = localStorage.getItem('access_token');
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/blog/blogs/post`, {
                params: { repo: targetBlog.repo_name, path: post.path, branch: targetBlog.default_branch },
                headers: { Authorization: `Bearer ${token}` }
            });
            const { metadata, body } = parseFrontMatter(res.data.content);
            const commonUpdates = {
                postTitle: metadata.title || post.title || "",
                markdownContent: body,
                mode: 'update',
                originalPath: post.path,
                originalSha: res.data.sha,
                imageInfo: metadata.image ? (typeof metadata.image === 'object' ? metadata.image : { path: metadata.image }) : { path: "", alt: "" }
            };

            if (activeTab === 'tech') {
                setTechData({ ...commonUpdates, category: post.category, tags: metadata.tags ? (Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags) : "" });
            } else {
                setDocsData({ ...commonUpdates, activeDocPath: post.path, category: metadata.parent ? (metadata.grand_parent ? `${metadata.grand_parent}/${metadata.parent}` : metadata.parent) : "", sourceFiles: null, aiResult: null });
            }
            setIsDirty(false);
        } catch (err) {
            console.error(err);
            notify("파일을 불러오지 못했습니다.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // 업로드
    const handleUpload = async () => {
        const data = currentData;
        if (!data.postTitle || !data.markdownContent) return notify("제목과 내용을 입력해주세요.", "error");
        if (!data.selectedBlog) return notify("블로그를 선택해주세요.", "error");

        handleSaveWorkspace();

        // [Tutorial] 튜토리얼 진행 중이면 confirm 없이 바로 업로드
        const proceedWithUpload = async () => {

            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            try {
                let finalContent = data.markdownContent;
                let finalImageInfo = { ...data.imageInfo };

                // [Fix] 순차 처리로 변경하여 Race Condition 방지 및 안정성 확보
                for (const [blobUrl, file] of Array.from(pendingFiles.current.entries())) {
                    const isContent = finalContent.includes(blobUrl);
                    const isHeader = finalImageInfo.path === blobUrl;

                    if (!isContent && !isHeader) continue;

                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("repo_name", data.selectedBlog.repo_name);

                    // 개별 이미지 업로드 수행
                    const upRes = await axios.post(`${API_URL}/blog/upload/image`, formData, {
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
                    });

                    // 성공 시 URL 치환
                    if (isContent) finalContent = finalContent.replaceAll(blobUrl, upRes.data.path);
                    if (isHeader) finalImageInfo = { ...finalImageInfo, path: upRes.data.path, lqip: upRes.data.lqip };
                }

                // [Fix] 치환되지 않은 blob: URL이 남아있는지 검사 (새로고침 등으로 인한 pendingFiles 유실 감지)
                if (finalContent.includes('blob:') || (finalImageInfo.path && finalImageInfo.path.includes('blob:'))) {
                    setIsLoading(false);
                    return notify("이미지 원본 파일 정보가 유실되었습니다(새로고침 등).\n본문의 이미지를 삭제하고 다시 추가해주세요.", "error");
                }

                const tagList = data.tags ? (Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean)) : [];
                const themeType = activeTab === 'tech' ? 'chirpy' : activeTab;
                const payload = {
                    mode: data.mode,
                    blog_repo: data.selectedBlog.repo_name,
                    branch: data.selectedBlog.default_branch,
                    theme_type: themeType,
                    title: data.postTitle,
                    category: data.category || "General",
                    markdown_content: finalContent,
                    tags: tagList,
                    image: (finalImageInfo.path && finalImageInfo.path.trim() !== "") ? finalImageInfo : null,
                    options: data.options || {},
                    file_path: data.mode === 'update' ? data.originalPath : null,
                    original_sha: data.mode === 'update' ? data.originalSha : null
                };

                const res = await axios.post(`${API_URL}/blog/upload`, payload, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.status === 'processing') {
                    // 비동기 작업 추적 시작
                    notify("📤 포스트 업로드가 시작되었습니다! 메인 화면에서 진행 상황을 확인하세요.", "success");

                    startDeploy(res.data.task_id, {
                        taskType: 'blog_posting',
                        blogInfo: {
                            postTitle: data.postTitle,
                            blogName: data.selectedBlog.blog_title || data.selectedBlog.repo_name,
                            mode: data.mode
                        }
                    });

                    // [Reset] 업로드 완료 후 작업 공간 초기화
                    if (activeTab === 'tech') {
                        setUserWorkspace('tech', null); // 저장된 작업 삭제

                        // 상태 초기화 (블로그 선택 등은 편의상 유지, 내용은 삭제)
                        setTechData(prev => ({
                            ...prev,
                            postTitle: "",
                            markdownContent: "",
                            // category: prev.categories?.[0] || "", // 카테고리는 유지할지 선택사항이나 보통 유지
                            tags: "",
                            aiResult: null,
                            imageInfo: { path: "", alt: "" },
                            mode: 'create'
                        }));
                    } else {
                        setUserWorkspace('docs', null);
                        setDocsData(prev => ({
                            ...prev,
                            postTitle: "",
                            markdownContent: "",
                            // activeDocPath: "", // Docs는 경로가 중요하므로 초기화
                            sourceFiles: null,
                            aiResult: null,
                            imageInfo: { path: "", alt: "" },
                            mode: 'create'
                        }));
                    }
                    console.log(`🧹 ${activeTab} workspace cleared after upload.`);

                    pendingFiles.current.clear();
                    setIsDirty(false);

                    // [Tutorial] 튜토리얼 진행 중이면 다음 단계로 이동
                    if (isTutorialActive) {
                        nextStep('main', 12); // system-logs 단계로
                    }

                    // 메인 화면으로 이동하여 진행 상황 확인
                    navigate('/');
                } else {
                    notify(`업로드 실패: ${res.data.message}`, "error");
                }
            } catch (e) {
                console.error("Upload Error:", e);
                notify(`업로드 중 오류가 발생했습니다: ${e.response?.data?.detail || e.message}`, "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (isTutorialActive) {
            proceedWithUpload();
        } else {
            confirm(
                "업로드 하시겠습니까?",
                proceedWithUpload,
                "업로드",
                "info"
            );
        }
    };

    const handleAddPendingImage = (file) => {
        const blobUrl = URL.createObjectURL(file);
        pendingFiles.current.set(blobUrl, file);
        return blobUrl;
    };

    const hasAIHistory = activeTab === 'tech' ? !!aiHistory.tech : (!!aiHistory.docsContent || !!aiHistory.docsScan);
    const hasUserWorkspace = activeTab === 'tech' ? !!userWorkspace.tech : !!userWorkspace.docs;

    return (
        <>
            {!activeTab && <FloatingBackButton />}
            <div className="h-screen bg-gray-50 flex overflow-hidden font-sans">
                {/* 자식 컴포넌트에 Props 전달 (기능 손실 없음) */}
                <PostingSettings
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isProcessing={isProcessing}
                    currentTaskType={currentTaskType}

                    techData={techData} setTechData={setTechData}
                    docsData={docsData} setDocsData={setDocsData}

                    blogList={blogList}
                    sourceRepos={sourceRepos}
                    categories={activeTab === 'tech' ? (techData.categories || []) : (docsData.categories || [])}
                    posts={activeTab === 'tech' ? (techData.posts || []) : (docsData.posts || [])}
                    isLoading={isLoading}

                    onGenerate={handleGenerateContent}
                    onSelectPost={handleSelectPost}
                    onUpload={handleUpload}
                    onAddImage={handleAddPendingImage}

                    // [중요] 수정된 데이터 매핑 전달
                    docsSourceFiles={docsData.sourceFiles} // 전체 트리 파일
                    aiRecommendations={techData.aiResult}

                    onRestoreTechAI={handleRestoreTechAI}
                    onRestoreDocsScan={handleRestoreDocsScan}
                    hasTechHistory={!!aiHistory.tech}
                    hasDocsScanHistory={!!aiHistory.docsScan}
                    onRestoreAI={handleRestoreAI}

                    onSaveWorkspace={handleSaveWorkspace}
                    onRestoreUserWorkspace={handleRestoreUserWorkspace}
                    hasUserWorkspace={hasUserWorkspace}
                />

                {/* Editor */}
                <MarkdownEditor
                    visible={!!activeTab}

                    postTitle={currentData.postTitle}
                    setPostTitle={(val) => activeTab === 'tech' ? setTechData({ postTitle: val }) : setDocsData({ postTitle: val })}
                    markdownContent={currentData.markdownContent}
                    setMarkdownContent={(val) => activeTab === 'tech' ? setTechData({ markdownContent: val }) : setDocsData({ markdownContent: val })}
                    category={currentData.category}
                    setCategory={(val) => activeTab === 'tech' ? setTechData({ category: val }) : setDocsData({ category: val })}

                    onRestoreAI={handleRestoreAI}
                    onRestoreUser={handleRestoreUserWorkspace}
                    hasAIHistory={hasAIHistory}
                    hasUserWorkspace={hasUserWorkspace}

                    // [New] 부모 제어 모드
                    sourceMode={editorMode}
                    onModeSwitch={handleModeSwitch}

                    uploadPath={currentData.mode === 'update'
                        ? currentData.originalPath
                        : `${currentData.category || 'Root'}/${currentData.postTitle || 'Untitled'}.md`
                    }

                    onUpload={handleUpload}
                    isUploadLoading={isLoading}
                    onAddImage={handleAddPendingImage}
                    onSaveUser={handleSaveWorkspace} // [New] 추가 필요
                />

                {/* AI Panel (Integrated Request & Result) */}
                {activeTab && (
                    <AIAssistant
                        isGenerating={isProcessing}
                        aiRecommendations={activeTab === 'tech' ? techData.aiResult : null} // Docs result is handled internally via sourceFiles

                        onApplyTopic={(val) => activeTab === 'tech' ? setTechData(prev => ({ ...prev, postTitle: val })) : setDocsData(prev => ({ ...prev, postTitle: val }))}
                        onApplyExample={(code) => {
                            if (activeTab === 'tech') setTechData(prev => ({ ...prev, markdownContent: prev.markdownContent + `\n${code}` }));
                        }}

                        // New Props
                        currentMode={activeTab === 'tech' ? 'tech' : 'docs'}
                        sourceRepos={sourceRepos}
                        docsSourceFiles={docsData.sourceFiles}
                        onGenerate={handleGenerateContent}
                        onReset={handleResetAI}
                        initialTitle={activeTab === 'tech' ? techData.postTitle : docsData.postTitle}
                        activeDocPath={activeTab === 'docs' ? docsData.activeDocPath : null}
                    />
                )}
            </div>

            <TutorialOverlay page="blog-posting" />
        </>
    );
}