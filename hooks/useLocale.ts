'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Locale } from '@/lib/i18n';

const LOCALE_KEY = 'medical-network-locale';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  }, []);

  const isRTL = locale === 'ar';

  return { locale, setLocale, isRTL };
}
