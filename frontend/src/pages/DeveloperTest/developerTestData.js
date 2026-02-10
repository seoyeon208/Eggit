// Questions for the Developer Type Test
export const questions = [
    { id: 1, type: 'VL', weight: 2, q: "내가 개발하면서 더 희열을 느끼는 순간은?", a: "화면이 기가 막히게 움직일 때", b: "복잡한 데이터를 처리했을 때" },
    { id: 2, type: 'VL', weight: 1, q: "선호하는 개발 도구는?", a: "브라우저/Figma", b: "터미널/DB" },
    { id: 3, type: 'BA', weight: 2, q: "에러가 발생했을 때 나의 대처법은?", a: "일단 이리저리 고쳐본다", b: "원인과 가설을 먼저 세운다" },
    { id: 4, type: 'BA', weight: 1, q: "폴더 구조를 정할 때?", a: "필요할 때마다 만든다", b: "처음에 구조를 잡고 시작한다" },
    { id: 5, type: 'SG', weight: 2, q: "나의 공부 스타일은?", a: "하나를 파면 끝장을 본다", b: "이것저것 연결하는 게 재밌다" },
    { id: 6, type: 'SG', weight: 1, q: "팀 프로젝트 선호 역할은?", a: "특정 파트 담당", b: "전체적인 조율" },
];

export const resultData = {
    "VBS": { subtitle: "🎨 인터랙티브 개발자", title: "FRONTEND", desc: "디자인 감각을 겸비한 프론트엔드 개발자! 화려한 애니메이션 구현은 나에게 맡겨주세요.", tags: ["#React", "#CSS장인", "#UI개발"], matchType: "VBS" },
    "LBS": { subtitle: "💾 데이터 설계자", title: "BACKEND", desc: "보이지 않는 곳에서 데이터를 처리하는 서버의 주인! 안정적인 서버가 최고입니다.", tags: ["#Java", "#DB", "#API"], matchType: "LBS" },
    "LBG": { subtitle: "🦄 만능 올라운더", title: "FULL STACK", desc: "프론트부터 서버까지 혼자서도 잘해요! 스타트업에서 가장 사랑받는 인재.", tags: ["#Node.js", "#Next.js", "#혼자다함"], matchType: "LBG" },
    "VBG": { subtitle: "🎮 게임/앱 크리에이터", title: "GAME/APP", desc: "내 손안의 작은 세상을 창조합니다. 물리 엔진과 로직을 동시에 다루는 능력자.", tags: ["#Unity", "#Unreal", "#Mobile"], matchType: "VBG" },
    "LAS": { subtitle: "🧠 미래를 읽는 예언자", title: "AI/DATA", desc: "데이터 속에 숨겨진 보물을 찾는 탐험가! 모델을 학습시켜 지능을 만듭니다.", tags: ["#Python", "#Pytorch", "#AI"], matchType: "LAS" },
    "LAG": { subtitle: "🛡️ 철벽의 수문장", title: "DEVOPS/SEC", desc: "서비스가 죽지 않게 지키는 든든한 방패! 해커와 트래픽으로부터 서버를 사수합니다.", tags: ["#Docker", "#AWS", "#Security"], matchType: "LAG" },
    "VAG": { subtitle: "🗣️ 큰 그림을 그리는 리더", title: "PM", desc: "기술과 비즈니스를 연결하는 소통왕! 코딩보다는 제품의 방향을 정하는 게 즐겁습니다.", tags: ["#기획", "#Jira", "#소통"], matchType: "VAG" },
    "VAS": { subtitle: "✨ 프로덕트 디자이너", title: "UI/UX DESIGN", desc: "사용자의 마음을 읽어내는 공감 능력자! 코딩을 이해하는 디자이너는 천하무적입니다.", tags: ["#Figma", "#UX", "#Design"], matchType: "VAS" }
};

export const animalNames = {
    "LAG": "토끼",
    "LAS": "햄스터",
    "LBG": "고양이",
    "LBS": "다람쥐",
    "VAG": "강아지",
    "VAS": "여우",
    "VBG": "펭귄",
    "VBS": "라쿤"
};

