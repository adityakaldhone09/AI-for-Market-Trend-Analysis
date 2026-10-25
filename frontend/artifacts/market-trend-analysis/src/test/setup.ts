import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class ResizeObserverStub {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const rect = { width: 640, height: 320 } as DOMRectReadOnly;
    this.callback(
      [{ target, contentRect: rect } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
});
