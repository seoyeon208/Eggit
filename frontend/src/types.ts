/**
 * 프론트엔드 데이터 타입 정의
 * 백엔드 Snake Case -> 프론트엔드 Camel Case 변환
 */

// 사용자 정보 타입
export interface User {
    userId: number;
    username: string;
    email: string;
    avatarUrl: string;
    tokenExpiresAt: string;
}

// 캐릭터 성향 타입
export type AvatarType =
    | 'BACKEND_WARRIOR'
    | 'FRONTEND_ARTIST'
    | 'FULLSTACK_ADVENTURER'
    | 'DATA_WIZARD'
    | 'DEVOPS_GUARDIAN';

// 캐릭터 및 성장 정보 타입 (User와 1:1 관계)
export interface Avatar {
    avatarType: AvatarType;
    level: number;
    exp: number;
    statusMessage: string;
}

// 블로그 타입
export type BlogType = 'MAIN' | 'SUB';

// 연동된 레포지토리 정보 타입
export interface Blog {
    repoName: string;
    blogType: BlogType;
    lastSyncedCommit: string;
}

// 퀘스트 상태 타입
export type QuestStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

// 퀘스트 타입
export interface Quest {
    id: number;
    title: string;
    status: QuestStatus;
    reward: string;
}

// 채팅 메시지 타입
export interface ChatMessage {
    id: number;
    username: string;
    message: string;
}

// 대시보드 통계 타입
export interface DashboardStats {
    level: number;
    stageName: string;
    expCurrent: number;
    expMax: number;
    coins: number;
}

// 전체 사용자 데이터 타입 (API 응답용)
export interface UserData {
    user: User;
    avatar: Avatar;
    blog: Blog | null;
    quests: Quest[];
    dashboardStats: DashboardStats;
    chatMessages: ChatMessage[];
}
