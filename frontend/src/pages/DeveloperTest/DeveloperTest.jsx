import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import useUserStore from '../../store/useUserStore';
import useNotificationStore from '../../store/useNotificationStore';
import useRefreshStore from '../../store/useRefreshStore';

// Data and Sub-components
import { questions as rawQuestions, resultData } from './developerTestData';
import { StartView, QuestionView, ResultView, EggView, HatchedView } from './components/DeveloperTestSteps';

// Dynamically import child images
const childImages = import.meta.glob('../../assets/images/child/*.png', { eager: true });

const DeveloperTest = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, setUser } = useUserStore();

    // Logic States
    const [step, setStep] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [scores, setScores] = useState({ V: 0, L: 0, B: 0, A: 0, S: 0, G: 0 });
    const [animState, setAnimState] = useState('result');
    const [skipMatchType, setSkipMatchType] = useState(null);
    const [hasExistingAvatar, setHasExistingAvatar] = useState(false);


    const { showEvolution } = useNotificationStore();
    const { refreshAvatar } = useRefreshStore();

    // 1. Fetch user info and avatar status
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // User Info
                if (!currentUser) {
                    const userRes = await apiClient.get('/users/me');
                    setUser(userRes.data);
                }

                // Avatar status check for the "already has avatar" message
                const avatarRes = await apiClient.get('/avatar/me');
                if (avatarRes.data && avatarRes.data.level >= 2) {
                    setHasExistingAvatar(true);
                }
            } catch (err) {
                console.error("Data fetch failed:", err);
            }
        };
        fetchUserData();
    }, [currentUser, setUser]);


    // 2. Initialize questions and choices (Shuffle)
    useEffect(() => {
        const shuffled = [...rawQuestions]
            .sort(() => Math.random() - 0.5)
            .map(q => {
                // Shuffle choices within each question
                const choices = [
                    { text: q.a, value: q.type[0] },
                    { text: q.b, value: q.type[1] }
                ].sort(() => Math.random() - 0.5);
                return { ...q, shuffledChoices: choices };
            });
        setQuestions(shuffled);
    }, []);

    // 3. Initial load check for skip mode (Egg hatching directly)
    useEffect(() => {
        console.log("[Debug] DeveloperTest Entry State:", location.state);
        if (location.state?.mode === 'egg') {
            if (location.state?.matchType) {
                console.log("[Debug] Skipping to Egg Hatching with:", location.state.matchType);
                setStep(rawQuestions.length + 1);
                setAnimState('egg');
                setSkipMatchType(location.state.matchType);
            } else {
                console.warn("[Debug] Egg mode entered but matchType missing. Resetting to step 0.");
                // 🛠️ 억지로 들어왔으나 matchType이 없는 경우 테스트 처음으로 리셋
                setStep(0);
                setAnimState('result');
            }
        }
    }, [location.state]);



    // 4. Handlers
    const handleAnswer = (choice) => {
        const currentQ = questions[step - 1];
        const weight = currentQ?.weight || 1;
        setScores(prev => ({ ...prev, [choice]: prev[choice] + weight }));
        setStep(prev => prev + 1);
    };

    // 결과 코드를 메모이제이션하여 렌더링마다 바뀌지 않게 고정
    const resultCode = useMemo(() => {
        if (skipMatchType) return skipMatchType;

        // 동점일 경우를 대비한 stable한 승자 결정 (Math.random 대신 점수가 큰 쪽 우선)
        // 만약 완전 동일하다면 앞의 문자를 우선함 (V > L, B > A, S > G)
        const getWinner = (a, b) => {
            return scores[a] >= scores[b] ? a : b;
        };

        const v_or_l = getWinner('V', 'L');
        const b_or_a = getWinner('B', 'A');
        const s_or_g = getWinner('S', 'G');

        return `${v_or_l}${b_or_a}${s_or_g}`;
    }, [scores, skipMatchType]);

    // [New] 결과가 나왔을 때 즉시 DB에 저장 (Early Save)
    // 부화를 누르기 전이라도 성향을 확정지어둠 (중도 이탈 대비)
    useEffect(() => {
        if (step === rawQuestions.length + 1 && !skipMatchType) {
            console.log("[Debug] Test Finished. Saving match_type early:", resultCode);
            apiClient.post(`/avatar/`, { match_type: resultCode })
                .then(() => {
                    console.log("[Debug] Early save success.");
                    refreshAvatar(); // Zustand/Global 상태 갱신
                })
                .catch(err => {
                    console.warn("[Debug] Early save failed (possibly already set):", err);
                });
        }
    }, [step, resultCode, rawQuestions.length, skipMatchType, refreshAvatar]);

    // [New] 마운트 시점에 이미 성향이 정해져 있는지 체크하여 리다이렉트
    useEffect(() => {
        const checkRedirect = async () => {
            // mode='egg'인 경우는 이미 의도된 진입이므로 패스
            if (location.state?.mode === 'egg') return;

            try {
                const res = await apiClient.get('/avatar/me');
                const ava = res.data;
                const isDefault = !ava.match_type || ava.match_type === 'DEFAULT';

                if (!isDefault) {
                    if (ava.level === 1) {
                        console.log("[Debug] Already has personality but level 1. Moving to Egg View.");
                        setStep(rawQuestions.length + 1);
                        setAnimState('egg');
                        setSkipMatchType(ava.match_type);
                    } else {
                        console.log("[Debug] Already has personality and level >= 2. Redirecting to home.");
                        navigate('/', { replace: true });
                    }
                }
            } catch (err) {
                // 아바타가 없거나 에러난 경우 테스트 진행
            }
        };
        checkRedirect();
    }, [location.state, navigate, rawQuestions.length]);


    const handleEggClick = async () => {
        setAnimState('cracking');

        try {
            // 1. 현재 아바타 상태 확인 (이미 부화했는지 체크)
            let currentAvatar = null;
            try {
                const res = await apiClient.get('/avatar/me');
                currentAvatar = res.data;
            } catch (err) {
                // 아바타가 없는 상태
            }

            // 2. 아바타가 없거나 DEFAULT 상태면 업데이트/생성
            try {
                if (!currentAvatar || currentAvatar.match_type === 'DEFAULT') {
                    console.log("[Debug] Creating or Updating Avatar to:", resultCode);
                    const createRes = await apiClient.post(`/avatar/`, { match_type: resultCode });
                    currentAvatar = createRes.data;
                }
            } catch (err) {
                console.warn("[Debug] Avatar update/create failed, but continuing if level 1:", err);
            }

            // 3. 알(Level 1) 상태일 때만 부화를 위한 경험치 10 지급
            if (!currentAvatar || currentAvatar.level === 1) {
                console.log("[Debug] Level 1 detected. Gaining exp to hatch...");
                await apiClient.post(`/avatar/gain-exp?amount=10`);
            }

            // Zustand 스토어를 통한 아바타 갱신
            refreshAvatar();

            setTimeout(() => {
                setAnimState('hatched');
                setTimeout(() => navigate('/', { replace: true }), 3000);
            }, 1500);

        } catch (err) {
            console.error("Egg cracking process failed permanently:", err);
            setTimeout(() => {
                setAnimState('hatched');
                setTimeout(() => navigate('/', { replace: true }), 3000);
            }, 1500);
        }

    };

    // 5. Conditional Rendering (The "Logic" of the page)

    // Step 0: Welcome
    if (step === 0) {
        return <StartView onStart={() => setStep(1)} />;
    }

    // Step 1 ~ N: Questions
    if (step <= questions.length) {
        return <QuestionView step={step} questions={questions} onAnswer={handleAnswer} />;
    }

    // After questions: Result or Egg Animation
    const result = resultData[resultCode];

    if (animState === 'egg' || animState === 'cracking') {
        return <EggView animState={animState} onEggClick={handleEggClick} />;
    }

    if (animState === 'hatched') {
        const childImageSrc = childImages[`../../assets/images/child/${resultCode.toUpperCase()}.png`]?.default;
        return <HatchedView currentUser={currentUser} resultCode={resultCode} childImageSrc={childImageSrc} />;
    }

    // Default: Show Test Result
    return <ResultView
        result={result}
        onStartEggit={() => setAnimState('egg')}
        hasExistingAvatar={hasExistingAvatar}
    />;
};


export default DeveloperTest;
