'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setProgress(Math.min((current / steps) * 100, 100));
      if (current >= steps) {
        clearInterval(timer);
        onFinish();
      }
    }, interval);
    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a1628',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '32px', zIndex: 9999,
    }}>
      <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#d4a843', borderRightColor: '#d4a843', animation: 'spin 1.5s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1.5px solid transparent', borderBottomColor: '#d4a84355', animation: 'spin 2s linear infinite reverse' }} />
        <img
          src="/logo.png"
          alt="Logo"
          width={56}
          height={56}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ color: '#d4a843', fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Medical Network</div>
        <div style={{ color: '#4a6080', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Loading your dashboard...</div>
      </div>
      <div style={{ width: 120, height: 2, background: '#1a2d4a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#d4a843', borderRadius: 2, transition: 'width 0.05s linear' }} />
      </div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
