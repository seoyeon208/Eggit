import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Play, Terminal, FileJson, FileCode, GitBranch, Activity,
  Clock, RefreshCw, User, Globe, Calendar, FileText, Layers,
  ScanFace
} from 'lucide-react';
import useRepoStore from '../../store/useRepoStore';
import useNotificationStore from '../../store/useNotificationStore';

const AiDebugConsole = () => {
  // --- State ---
  const [formData, setFormData] = useState({
    target_repo: '',
    branch: 'main',
    period_days: 3,
    user_intent: 'Debug Mode Analysis'
  });

  const [repoMode, setRepoMode] = useState('select');
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('raw');
  const logEndRef = useRef(null);

  // [핵심] 스토어에서 상태와 함수 가져오기
  const { repos, fetchRepos, isLoading: isRepoLoading } = useRepoStore();
  const { notify } = useNotificationStore();

  // --- Effects ---
  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Handlers ---
  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePeriodChange = (days) => {
    setFormData(prev => ({ ...prev, period_days: days }));
  };

  const handleModeChange = (mode) => {
    setRepoMode(mode);
    setFormData(prev => ({ ...prev, target_repo: '' }));
  };

  // --- Analysis Logic ---
  const handleRun = async () => {
    if (!formData.target_repo) {
      notify("Target Repository를 선택하거나 입력해주세요.", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    setLogs([]);
    setActiveTab('logs');

    addLog(`🚀 분석 시작: ${formData.target_repo} (${formData.period_days}일 간)`, 'info');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const REQUEST_URL = `${API_BASE_URL}/debug/github/analyze`;
      const STATUS_URL = `${API_BASE_URL}/debug/tasks`;

      const token = localStorage.getItem('access_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        target_repo: formData.target_repo,
        branch: formData.branch,
        period_days: formData.period_days,
        user_intent: formData.user_intent,
        include: ["tree", "diffs", "prs", "tech", "readme", "features"]
      };

      addLog(`📡 API 요청 전송 중...`, 'info');

      // 1. Task Trigger
      const triggerRes = await axios.post(REQUEST_URL, payload, config);
      const { task_id } = triggerRes.data;

      addLog(`✅ 작업 큐 등록 완료. (ID: ${task_id})`, 'success');

      // 2. Polling
      const intervalId = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${STATUS_URL}/${task_id}`, config);
          const { status, result: taskResult, error } = statusRes.data;

          if (status === 'SUCCESS') {
            clearInterval(intervalId);
            setResult(taskResult);
            addLog("🎉 데이터 수집 및 정제 완료!", 'success');
            setLoading(false);

            if (taskResult.project_structure) setActiveTab('tree');
            else setActiveTab('raw');

          } else if (status === 'FAILURE') {
            clearInterval(intervalId);
            addLog(`❌ 작업 실패: ${error}`, 'error');
            setLoading(false);
          } else {
            addLog(`🔄 진행 상태: ${status}...`, 'info');
          }
        } catch (pollErr) {
          clearInterval(intervalId);
          addLog(`⚠️ 폴링 에러: ${pollErr.message}`, 'error');
          setLoading(false);
        }
      }, 2000);

    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.detail || err.message;
      addLog(`❌ 요청 실패: ${errMsg}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Github Context Debugger</h1>
            <p className="text-gray-500 text-sm">기능별 수집 데이터를 검증하는 디버그 콘솔입니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* --- Left: Settings Panel --- */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Terminal size={18} /> Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Target Repository</label>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => handleModeChange('select')}
                        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${repoMode === 'select' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <User size={12} /> My Repos
                      </button>
                      <button
                        onClick={() => handleModeChange('manual')}
                        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${repoMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <Globe size={12} /> Custom
                      </button>
                    </div>
                  </div>

                  {repoMode === 'select' ? (
                    <div className="relative">
                      <select
                        name="target_repo"
                        value={formData.target_repo}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm appearance-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>Select a repository</option>
                        {isRepoLoading ? (
                          <option disabled>Loading...</option>
                        ) : (
                          repos.map((repo) => (
                            <option key={repo.id} value={repo.full_name}>
                              {repo.name} {repo.private ? '(Private)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={() => fetchRepos()}
                        className={`absolute right-3 top-2.5 text-gray-400 hover:text-indigo-500 ${isRepoLoading ? 'animate-spin' : ''}`}
                        disabled={isRepoLoading}
                        title="Refresh List"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text" name="target_repo"
                      value={formData.target_repo} onChange={handleChange}
                      placeholder="owner/repo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Analyze Period
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 3, 7].map((day) => (
                      <button
                        key={day}
                        onClick={() => handlePeriodChange(day)}
                        className={`py-2 text-sm font-bold rounded-lg border transition-all
                          ${formData.period_days === day
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-600 ring-1 ring-indigo-500'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }
                        `}
                      >
                        {day} Day{day > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRun}
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-bold text-white shadow transition-all flex items-center justify-center gap-2
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                  `}
                >
                  {loading ? <Clock className="animate-spin" size={18} /> : <Play size={18} />}
                  {loading ? 'Analyzing...' : 'Fetch & Build Context'}
                </button>
              </div>
            </div>

            {/* Logs Panel */}
            <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-4 h-64 overflow-hidden flex flex-col">
              <h3 className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <Terminal size={14} /> System Logs
              </h3>
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-500 shrink-0">[{log.time}]</span>
                    <span className={
                      log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                    }>
                      {log.msg}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* --- Right: Results Panel --- */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-8rem)]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
              <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                {[
                  { id: 'tree', icon: GitBranch, label: 'Tree' },
                  { id: 'diff', icon: FileCode, label: 'Diffs' },
                  { id: 'features', icon: ScanFace, label: 'Features' },
                  { id: 'docs', icon: FileText, label: 'Docs' },
                  { id: 'pr', icon: Activity, label: 'PR' },
                  { id: 'tech', icon: Layers, label: 'Tech' },
                  { id: 'raw', icon: FileJson, label: 'JSON' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors
                                ${activeTab === tab.id
                        ? 'bg-white border-t-2 border-indigo-500 text-indigo-600'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }
                            `}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto bg-[#1e1e1e] text-gray-300 p-4 font-mono text-sm leading-relaxed">
                {!result ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p>분석 버튼을 눌러 데이터를 수집하세요.</p>
                  </div>
                ) : (
                  <>
                    {activeTab === 'tree' && (
                      <pre className="whitespace-pre text-green-300">
                        {result.project_structure || "No tree data."}
                      </pre>
                    )}
                    {activeTab === 'diff' && (
                      <pre className="whitespace-pre-wrap text-blue-200">
                        {result.detailed_changes || "No code changes."}
                      </pre>
                    )}
                    {activeTab === 'features' && (
                      <pre className="whitespace-pre-wrap text-orange-200">
                        {result.feature_summary || "No features extracted."}
                      </pre>
                    )}
                    {activeTab === 'docs' && (
                      <pre className="whitespace-pre-wrap text-gray-100">
                        {result.readme_summary || "No README found."}
                      </pre>
                    )}
                    {activeTab === 'pr' && (
                      <pre className="whitespace-pre-wrap text-purple-200">
                        {result.pr_background || "No PR data."}
                      </pre>
                    )}
                    {activeTab === 'tech' && (
                      <pre className="whitespace-pre-wrap text-yellow-200">
                        {result.tech_stack || "No tech info."}
                      </pre>
                    )}
                    {activeTab === 'raw' && (
                      <pre className="whitespace-pre-wrap text-xs text-gray-500">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiDebugConsole;