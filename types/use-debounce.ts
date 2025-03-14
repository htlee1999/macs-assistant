declare module 'use-debounce' {
    export function useDebouncedValue<T>(value: T, delay: number): [T, boolean];
    export function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number): T;
  }
  