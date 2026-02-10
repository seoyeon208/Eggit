import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BlogCreationSettings from '../../components/blog/BlogCreationSettings';
import BlogPreview from '../../components/blog/BlogPreview';
import FloatingBackButton from '../../components/common/FloatingBackButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import useRepoStore from '../../store/useRepoStore';
import useNotificationStore from '../../store/useNotificationStore';
import useDeploymentStore from '../../store/useDeploymentStore';
import useUserStore from '../../store/useUserStore';
import useAuthStore from '../../store/useAuthStore';
import TutorialOverlay from '../../components/common/TutorialOverlay';
import apiClient from '../../utils/apiClient';


export default function BlogCreationPage() {
    const navigate = useNavigate();
    const { fetchRepos } = useRepoStore();
    const { notify } = useNotificationStore();
    const { startDeploy, failDeploy } = useDeploymentStore();

    // 1. 기본 상태
    const [repositoryName, setRepositoryName] = useState('');
    const [blogTemplate, setBlogTemplate] = useState('tech');
    const [blogTitle, setBlogTitle] = useState('');
    const [blogDescription, setBlogDescription] = useState('');
    const [blogTagline, setBlogTagline] = useState('');
    const [email, setEmail] = useState('');
    const [nickname, setNickname] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // [New] 모달 상태 관리
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null
    });

    // Theme State
    const [customTheme, setCustomTheme] = useState({
        font_import_url: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap",
        font_family_base: "'Noto Sans KR', sans-serif",
        main_bg: "#f0f8ff",
        sidebar_bg: "#2c3e50",
        sidebar_text: "#ffffff",
        active_color: "#00cd1b",
        card_bg: "#ffffff"
    });

    // [Fix] 실제 로그인 유저 정보 가져오기
    const { user } = useUserStore();
    const username = user?.username || "my-username"; // Fallback 유지

    // 유저 정보 로드 시 닉네임 기본값 설정
    // 유저 정보 로드 시 닉네임 기본값 설정 (초기 1회만)
    useEffect(() => {
        if (user?.username && nickname === '') {
            setNickname(user.username);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.username]); // user가 변경될 때만 실행 (nickname 변경 시에는 실행 X)

    // Theme Preset Logic
    useEffect(() => {
        if (blogTemplate === 'docs') {
            fetchRepos();
            setCustomTheme(prev => ({
                ...prev,
                main_bg: "#ffffff",
                sidebar_bg: "#f5f6fa",
                sidebar_text: "#333333",
                active_color: "#7253ed",
                card_bg: "#ffffff"
            }));
        } else {
            setCustomTheme(prev => ({
                ...prev,
                main_bg: "#F0F8FF",
                sidebar_bg: "#D9EBF7",
                sidebar_text: "#FFFFFF",
                active_color: "#287281",
                card_bg: "#FFFFFF"
            }));
        }
    }, [blogTemplate, fetchRepos]);

    const handleDeploy = async (isForce = false) => {
        if (!blogTitle.trim()) {
            notify("블로그 제목을 입력해주세요.", "error");
            return;
        }
        if (blogTemplate === 'docs' && !repositoryName) {
            notify("연동할 레포지토리를 선택해주세요.", "error");
            return;
        }

        if (isForce) {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        }

        setIsLoading(true);

        try {
            // [Fix] 키 매핑: Docs는 'link_color', Tech는 'active_color' 사용
            const themePayload = { ...customTheme };

            if (blogTemplate === 'docs') {
                // Docs 템플릿용 키 매핑
                themePayload.link_color = customTheme.active_color;
            }

            let urlPath = '';
            let payload = {};

            if (blogTemplate === 'tech') {
                urlPath = '/blog/main';
                payload = {
                    blog_title: blogTitle.trim(),
                    blog_tagline: blogTagline || "My Awesome Tech Blog",
                    description: blogDescription,
                    author_name: nickname, // [Fix] 빈 값 허용 (GitHub Username과 독립적)
                    author_email: email || null,
                    theme_settings: themePayload, // Mapped Payload 사용
                    github_username: username,
                    is_force: isForce,
                    avatar_url: avatarUrl.trim() || null
                };
            } else {
                urlPath = '/blog/docs';
                const targetRepo = repositoryName.includes('/')
                    ? repositoryName
                    : `${username}/${repositoryName}`;

                payload = {
                    target_repo: targetRepo,
                    project_name: blogTitle.trim(),
                    description: blogDescription,
                    theme_settings: themePayload, // Mapped Payload 사용
                    is_force: isForce
                };
            }

            // [Refactor] apiClient 사용 권장 (User Code used fetch, but apiClient handles token automatically)
            // User Code: fetch with VITE_API_URL + token
            // We'll stick to User's fetch pattern if they insist, but apiClient is cleaner.
            // But since user provided fetch code, let's use apiClient to match project style while respecting logic.
            // Actually, User Code used `fetch`. Let's use `apiClient` as it was in previous version and is safer.

            const response = await apiClient.post(urlPath, payload);
            const data = response.data;

            // 배포 성공 알림 및 전역 상태 갱신
            notify("🎉 블로그 생성이 시작되었습니다! 메인 화면에서 진행 상황을 확인하세요.", "success");
            startDeploy(data.task_id, {
                taskType: 'blog_creation',
                blogInfo: {
                    blogName: blogTitle,
                    blogType: blogTemplate
                }
            });

            // 메인 페이지로 이동 (아바타가 진행상황 중계)
            navigate('/');

        } catch (error) {
            console.error("❌ Deployment Error:", error);

            // Axios Error Handling
            const status = error.response?.status;
            const errorMsg = error.response?.data?.detail || error.message;

            if (status === 409) {
                setModalConfig({
                    isOpen: true,
                    title: "⚠️ Blog Already Exists",
                    message: `해당 블로그(또는 브랜치)가 이미 존재합니다.\n기존 내용을 삭제하고 덮어씌우시겠습니까?\n(이 작업은 되돌릴 수 없습니다)`,
                    onConfirm: () => handleDeploy(true)
                });
                return;
            }

            notify(`배포 요청 실패: ${errorMsg}`, "error");
            failDeploy(errorMsg);
        } finally {
            if (!modalConfig.isOpen) {
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    setIsLoading(false);
                }}
                onConfirm={modalConfig.onConfirm}
                confirmText="Overwrite (Force)"
                isProcessing={isLoading}
            />

            <div className="h-screen bg-gray-50 flex overflow-hidden">
                <BlogCreationSettings
                    repositoryName={repositoryName}
                    setRepositoryName={setRepositoryName}
                    blogTemplate={blogTemplate}
                    setBlogTemplate={setBlogTemplate}
                    nickname={nickname}
                    setNickname={setNickname}
                    email={email}
                    setEmail={setEmail}
                    blogTitle={blogTitle}
                    setBlogTitle={setBlogTitle}
                    blogDescription={blogDescription}
                    setBlogDescription={setBlogDescription}
                    blogTagline={blogTagline}
                    setBlogTagline={setBlogTagline}
                    customTheme={customTheme}
                    setCustomTheme={setCustomTheme}
                    username={username}
                    onDeploy={() => handleDeploy(false)}
                    isLoading={isLoading}
                    avatarUrl={avatarUrl}
                    setAvatarUrl={setAvatarUrl}
                />

                <BlogPreview
                    blogTitle={blogTitle}
                    blogDescription={blogTagline || blogDescription}
                    customTheme={customTheme}
                    isLoading={isLoading}
                    blogTemplate={blogTemplate}
                    nickname={nickname || username}
                    avatarUrl={avatarUrl}
                    username={username}
                    isTech={blogTemplate === 'tech'}
                />
            </div>

            <TutorialOverlay page="blog-creation" />
        </>
    );
}