import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * 用于延迟执行某个值的更新，避免频繁触发操作
 */
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    console.log('🔍 useDebounce: Effect triggered:', { value, delay, currentDebouncedValue: debouncedValue });
    const handler = setTimeout(() => {
      console.log('🔍 useDebounce: Timeout fired, setting debouncedValue to:', value);
      setDebouncedValue(value);
    }, delay);

    return () => {
      console.log('🔍 useDebounce: Cleanup timeout');
      clearTimeout(handler);
    };
  }, [value, delay, debouncedValue]);

  console.log('🔍 useDebounce: Returning debouncedValue:', debouncedValue);
  return debouncedValue;
};
