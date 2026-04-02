import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
  icon?: React.ReactNode;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onDismiss,
  duration = 2500,
  icon,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss, duration]);

  return (
    <div className={`${styles.toast} ${isVisible ? styles.visible : ''}`}>
      <span className={styles.icon}>{icon || <Check size={16} />}</span>
      <span>{message}</span>
    </div>
  );
};
