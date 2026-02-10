import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const GenerationContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export const GenerationProvider = ({ children }) => {
    // tasks 구조: { [taskId]: { status: 'processing'|'success'|'failure', result: null, requestPayload: {}, timestamp: 0 } }
    const [tasks, setTasks] = useState({});

    // 폴링을 위한 interval ID 저장소
    const pollingIntervals = useRef({});

    // 1. 생성 시작 (작업 등록)
    const startGeneration = async (payload) => {
        // 작업 ID 생성: 
        // Tech/Docs 작업은 동시에 하나씩만 돌아가는 게 일반적이므로 타입을 ID로 사용해 중복 방지
        // (원한다면 Date.now()를 붙여서 완전히 독립적인 N개 작업도 가능)
        const taskId = payload.template_type || payload.type || `task_${Date.now()}`;
        
        console.log(`🚀 [Context] Starting Task: ${taskId}`, payload);

        // 초기 상태 설정
        setTasks(prev => ({
            ...prev,
            [taskId]: { 
                status: 'processing', 
                result: null, 
                requestPayload: payload, // 복원용 데이터 저장
                timestamp: Date.now(),
                type: taskId // 식별자
            }
        }));
        
        try {
            const token = localStorage.getItem('access_token');
            const res = await axios.post(`${API_URL}/blog/generate`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const serverTaskId = res.data.task_id;
            console.log(`✅ [Context] Server Task ID received for ${taskId}:`, serverTaskId);

            // 서버 Task ID를 매핑하고 폴링 시작
            startPolling(taskId, serverTaskId);

        } catch (err) {
            console.error(`❌ [Context] Request Failed for ${taskId}:`, err);
            setTasks(prev => ({
                ...prev,
                [taskId]: { ...prev[taskId], status: 'failure', error: err.message }
            }));
        }
    };

    // 2. 폴링 로직 (개별 작업용)
    const startPolling = (clientTaskId, serverTaskId) => {
        // 이미 돌고 있는 폴링이 있다면 제거 (중복 방지)
        if (pollingIntervals.current[clientTaskId]) {
            clearInterval(pollingIntervals.current[clientTaskId]);
        }

        const intervalId = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/blog/tasks/${serverTaskId}`);
                const taskStatus = res.data.status;

                if (taskStatus === 'SUCCESS') {
                    console.log(`🎉 [Context] Task Success: ${clientTaskId}`);
                    setTasks(prev => ({
                        ...prev,
                        [clientTaskId]: { 
                            ...prev[clientTaskId], 
                            status: 'success', 
                            result: res.data.result 
                        }
                    }));
                    clearInterval(intervalId);
                    delete pollingIntervals.current[clientTaskId];

                } else if (taskStatus === 'FAILURE') {
                    console.error(`💥 [Context] Task Failed: ${clientTaskId}`);
                    setTasks(prev => ({
                        ...prev,
                        [clientTaskId]: { 
                            ...prev[clientTaskId], 
                            status: 'failure', 
                            error: res.data.error || "Unknown Error" 
                        }
                    }));
                    clearInterval(intervalId);
                    delete pollingIntervals.current[clientTaskId];
                }
                // PENDING이나 STARTED면 계속 폴링

            } catch (e) {
                console.error(`⚠️ [Context] Polling Error (${clientTaskId}):`, e);
                // 네트워크 에러 등 일시적 오류는 무시하고 계속 시도 (필요 시 카운트 제한 추가 가능)
            }
        }, 3000); // 3초 간격

        pollingIntervals.current[clientTaskId] = intervalId;
    };

    // 3. 작업 삭제 (개별)
    const removeTask = (taskId) => {
        if (pollingIntervals.current[taskId]) {
            clearInterval(pollingIntervals.current[taskId]);
            delete pollingIntervals.current[taskId];
        }
        setTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[taskId];
            return newTasks;
        });
    };

    // 4. 전체 초기화 (로그아웃 등)
    const resetGeneration = () => {
        Object.values(pollingIntervals.current).forEach(clearInterval);
        pollingIntervals.current = {};
        setTasks({});
    };

    // [Legacy Support] 기존 코드와의 호환성을 위한 단일 상태 반환 (가장 최근 활성 작업 기준)
    // 필요 시 제거하고 컴포넌트들이 tasks 객체를 직접 쓰게 하는 것이 좋음
    const activeTaskEntry = Object.entries(tasks).reverse().find(([_, t]) => t.status !== 'idle');
    const genStatus = activeTaskEntry ? activeTaskEntry[1].status : 'idle';
    const genResult = activeTaskEntry ? activeTaskEntry[1].result : null;
    const pendingRequest = activeTaskEntry ? activeTaskEntry[1].requestPayload : null;

    return (
        <GenerationContext.Provider value={{ 
            tasks,          // [New] 다중 작업 상태 객체
            startGeneration, 
            removeTask,     // [New] 개별 작업 삭제
            resetGeneration,
            
            // [Legacy Props - 호환성 유지용]
            genStatus, 
            genResult, 
            pendingRequest 
        }}>
            {children}
        </GenerationContext.Provider>
    );
};

export const useGeneration = () => useContext(GenerationContext);