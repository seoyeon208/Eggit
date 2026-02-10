/**
 * 튜토리얼 단계 정의
 * 각 페이지별로 순서대로 진행되는 튜토리얼 스텝
 */

export const tutorialSteps = {
    // 1. 메인 페이지 (전체 가이드)
    main: [
        {
            id: 'welcome',
            title: 'Welcome to Eggit!',
            message: '안녕하세요! 저는 여러분의 도우미 **마스터 깃**이에요!\n**Eggit**에 오신 것을 진심으로 환영합니다. ✨',
            target: 'body',
            position: 'center',
            action: 'confirm'
        },
        {
            id: 'start_ask',
            title: 'Tutorial Start',
            message: '지금부터 **Eggit**을 100% 즐기기 위한\n튜토리얼을 시작해볼까요? 🚀',
            target: 'body',
            position: 'center',
            action: 'confirm'
        },
        {
            id: 'profile',
            title: '1. 프로필 확인',
            message: '여기서 내 **레벨**과 **경험치**를 한눈에 볼 수 있어요!',
            target: '.profile-section',
            position: 'right',
            action: 'confirm'
        },
        {
            id: 'avatar',
            title: '2. 나의 캐릭터',
            message: '당신의 아바타 **{avatarName}**(이)에요! \n일정 레벨에 도달하면 멋진 모습으로 **진화**한답니다!\n꾸준한 기록으로 아바타를 성장시켜주세요. ✨',
            target: '.avatar-scene-container',
            position: 'bottom',
            action: 'confirm'
        },
        {
            id: 'background-toggle',
            title: '3. 배경 전환',
            message: '버튼 하나로 **실내/실외 배경**을 바꿀 수 있어요! ☀️',
            target: '.background-toggle-button',
            position: 'left',
            action: 'click'
        },
        {
            id: 'quests',
            title: '4. 일일 퀘스트',
            message: '매일 주어지는 **미션**을 완료하고 경험치를 쌓으세요!',
            target: '.quest-panel',
            position: 'left',
            action: 'confirm'
        },
        {
            id: 'sidetoolbar',
            title: '5. 설문조사 안내',
            message: '서비스 사용 후 **설문조사**를 통해 소중한 의견을 들려주세요! 📋',
            target: '.right-toolbar button[title="설문조사"]',
            position: 'left',
            action: 'confirm'
        },
        {
            id: 'friend-chat-open',
            title: '6. 친구 채팅 서랍',
            message: '**채팅 서랍**을 열어 친구들과 대화해볼까요? 💬',
            target: '.right-toolbar button[title="채팅"]',
            position: 'left',
            action: 'click'
        },
        {
            id: 'friend-manage-edit',
            title: '6. 친구 관리',
            message: '**EDIT** 버튼을 누르면 친구를 검색하고 추가하고, 관리할 수 있어요!',
            target: '.friend-manage-button',
            position: 'left',
            action: 'click'
        },
        {
            id: 'friend-search-input',
            title: '6. 친구 검색',
            message: '**eggit_admin** 관리자 아이디를 검색해 친구를 맺어보세요!\n (아이디 입력 후 엔터) 👋',
            target: '.friend-search-input',
            position: 'left',
            action: 'confirm'
        },
        {
            id: 'blog-create-link',
            title: '7. 블로그 생성',
            message: '이제 나만의 **블로그**를 만들러 가볼까요? 🚀',
            target: '.blog-create-button',
            position: 'right',
            action: 'click',
            nextPage: 'blog-creation',
            nextStep: 0
        },
        {
            id: 'blog-post-link',
            title: '9. 블로그 포스팅',
            message: '블로그가 생겼다면, **글쓰기 버튼**을 눌러 첫 글을 남겨보세요! ✍️',
            target: '.blog-post-button',
            position: 'right',
            action: 'click',
            nextPage: 'blog-posting',
            nextStep: 0
        },
        {
            id: 'system-logs',
            title: '11. 시스템 로그',
            message: 'AI가 블로그를 생성하고 글을 올리는 **실시간 진행 상황**을 확인하세요! 🤖',
            target: '.system-logs-container',
            position: 'top',
            action: 'confirm'
        },
        {
            id: 'calendar-guide',
            title: '12. 캘린더 연동',
            message: '**캘린더**에서 내 포스팅 기록을 한눈에 확인할 수 있답니다. 📅',
            target: '.calendar-panel',
            position: 'right',
            action: 'confirm'
        },
        {
            id: 'dashboard-visitors',
            title: '13. 대시보드 - 방문자',
            message: '내 블로그에 방문한 **사람 수**를 집계해 보여줍니다.',
            target: '.visitor-count-card',
            position: 'left',
            action: 'confirm'
        },
        {
            id: 'dashboard-guestbook',
            title: '14. 대시보드 - 방명록',
            message: '친구가 남긴 **방명록**을 확인하고 인사를 나눠보세요!',
            target: '.guestbook-card',
            position: 'left',
            action: 'confirm'
        },
        {
            id: 'farewell',
            title: 'Tutorial Completed!',
            message: '가이드가 끝났어요! 에깃과 함께 멋진 기록을 남겨보세요!\n아바타를 레벨업하다 보면 저를 **다시 만날 수 있을 거예요!** 👋',
            target: 'body',
            position: 'center',
            action: 'confirm'
        }
    ],

    // 2. 블로그 생성 페이지
    'blog-creation': [
        {
            id: 'blog-setup-free',
            title: '8. 블로그 자유 설정',
            message: '이곳에서 블로그 테마와 정보를 자유롭게 설정해보세요! 설정을 마쳤다면 맨 아래로 스크롤하여 \'Create Blog\' 버튼을 눌러주세요. 🚀 \n (꼭 Project Name을 작성해야 생성 버튼이 눌러져요)',
            target: '.blog-settings-container',
            trigger: '.create-blog-button',
            position: 'top-right',
            action: 'click',
            nextPage: 'main',
            nextStep: 11 // 'blog-post-link' 인덱스 (블로그 생성 후 포스팅 유도)
        }
    ],

    // 3. 블로그 포스팅 페이지
    'blog-posting': [
        {
            id: 'markdown-intro',
            title: '10. 블로그 포스팅',
            message: '이곳은 나만의 생각을 기록하는 공간이에요!\n마크다운 에디터와 AI 도우미를 활용해 자유롭게 글을 써볼까요? ✍️',
            target: 'body',
            position: 'center',
            action: 'confirm'
        },
        {
            id: 'markdown-editor-guide',
            title: '11. 자유로운 포스팅',
            message: '작성이 끝나면 상단의 **발행 버튼**을 눌러주세요!\n여러분의 멋진 글이 블로그에 게시될 거예요. 🚀',
            target: '.save-post-button',
            trigger: '.save-post-button',
            position: 'right',
            action: 'click',

            nextPage: 'main',
            nextStep: 12
        }
    ]
};


export const getTutorialSteps = (page) => tutorialSteps[page] || [];
export const getTutorialStep = (page, stepIndex) => getTutorialSteps(page)[stepIndex] || null;
