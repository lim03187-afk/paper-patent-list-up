import React, { useState } from 'react';
import { Database, Key, Lock, Mail, User, ArrowRight, Loader2, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const config = getSupabaseConfig();
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [isConfigured, setIsConfigured] = useState(Boolean(config.url && config.anonKey));
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setErrorMsg('Supabase URL과 Anon Key를 모두 입력해주세요.');
      return;
    }
    saveSupabaseConfig(url, anonKey);
    setErrorMsg('');
    setIsConfigured(true);
    setSuccessMsg('Supabase 설정이 저장되었습니다. 이제 로그인해주세요.');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg('Supabase 클라이언트가 초기화되지 않았습니다. 설정을 확인해주세요.');
      setIsConfigured(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim()
        });
        if (error) throw error;
        
        // Save login data / user record if table exists or just notify success
        if (data.user) {
          try {
            await supabase.from('user_logins').insert([
              { user_id: data.user.id, email: data.user.email, logged_in_at: new Date().toISOString() }
            ]);
          } catch (logErr) {
            // table might not exist yet, ignore or log
            console.log("Optional user_logins table insert skipped:", logErr);
          }
        }

        setSuccessMsg('회원가입이 완료되었습니다! 이메일 인증이 필요할 수 있습니다. 로그인해주세요.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        if (error) throw error;

        if (data.user) {
          try {
            await supabase.from('user_logins').insert([
              { user_id: data.user.id, email: data.user.email, logged_in_at: new Date().toISOString() }
            ]);
          } catch (logErr) {
            console.log("Optional user_logins table insert skipped:", logErr);
          }
          onLoginSuccess(data.user);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-indigo-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Auth</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/30">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Research Vault Pro</h1>
          <p className="text-xs text-indigo-200 mt-1">
            보안 연구 아카이브 시스템 • Supabase 로그인 전용
          </p>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Supabase Config Section */}
          {!isConfigured ? (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <span>Supabase 연결 설정</span>
                </span>
                <span className="text-[10px] text-slate-400">필수 단계</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Supabase 프로젝트 대시보드(Project Settings &gt; API)에서 발급받은 <strong className="text-slate-700">Project URL</strong>과 <strong className="text-slate-700">anon public API key</strong>를 입력해주세요. 로그인 데이터가 Supabase에 안전하게 저장됩니다.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supabase Anon Key</label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                <span>설정 저장 및 계속하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs text-slate-600 truncate font-mono">{url}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigured(false)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline shrink-0 ml-2"
                >
                  설정 변경
                </button>
              </div>

              {/* Tabs for Sign In / Sign Up */}
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    !isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  로그인 (Sign In)
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  회원가입 (Sign Up)
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>이메일 주소</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@university.ac.kr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>비밀번호</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>처리 중...</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Supabase 계정 생성하기' : 'Supabase 로그인'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
