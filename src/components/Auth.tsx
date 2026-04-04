import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Bot, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import styles from './Auth.module.css';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Terjadi kesalahan saat otentikasi. Silakan coba lagi.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        
        <div className={styles.authHeader}>
          <div className={styles.logoIcon}>
            <Bot size={36} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className={styles.authTitle}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className={styles.authSubtitle}>
              {isLogin ? 'Log in to continue to AI-HAM Chat.' : 'Sign up to continue to AI-HAM Chat.'}
            </p>
          </div>
        </div>

        <form className={styles.authForm} onSubmit={handleAuth}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="email">Email address</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="e.g. boss@ilhmndn.site"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div className={styles.errorMsg}>
              <AlertCircle size={18} className={styles.errorIcon} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isLogin ? 'Continue' : 'Sign up'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className={styles.toggleMsg}>
          {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>

      </div>
    </div>
  );
};
