import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cedis } from '../lib/format';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A headline whose words rise into place one after another. */
export function Words({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span className="w" style={{ '--i': index + start } as React.CSSProperties}>
            {word}
          </span>{' '}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * A cedi amount that counts to its new value instead of jumping. Screen
 * readers get the final figure once, not every frame.
 */
export function AnimatedPrice({ value, className = '' }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value || reducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / 480);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (value - start) * eased;
      setShown(current);
      from.current = current;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={`price ${className}`.trim()}>
      <span aria-hidden="true">{cedis(Math.round(shown * 100) / 100)}</span>
      <span className="visually-hidden">{cedis(value)}</span>
    </span>
  );
}

/**
 * A little burst of the four dots, fired from a button when something goes
 * into the cart. Render `node` inside a positioned parent.
 */
export function useBurst() {
  const [bursts, setBursts] = useState<number[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const fire = useCallback(() => {
    if (reducedMotion()) return;
    const id = Date.now() + Math.random();
    setBursts((current) => [...current, id]);
    timers.current.push(window.setTimeout(() => setBursts((current) => current.filter((item) => item !== id)), 700));
  }, []);

  const node = bursts.map((id) => (
    <span className="burst" key={id} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const radius = 34 + (index % 3) * 12;
        return (
          <i
            key={index}
            style={
              {
                '--x': `${Math.round(Math.cos(angle) * radius)}px`,
                '--y': `${Math.round(Math.sin(angle) * radius)}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  ));

  return { fire, node };
}
