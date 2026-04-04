import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
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
        // Optionally tell them to check email here if email confirm is ON
        setErrorMsg('Berhasil mendaftar! Anda sekarang akan login...');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>
          {isLogin ? 'Login AI-HAM Chat' : 'Daftar AI-HAM Chat'}
        </h2>
        <form className={styles.authForm} onSubmit={handleAuth}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="nama@email.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
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
          {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Masuk' : 'Daftar'}
          </button>
        </form>
        <p className={styles.toggleMsg}>
          {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
          >
            {isLogin ? 'Daftar di sini' : 'Login di sini'}
          </button>
        </p>
      </div>
    </div>
  );
};
