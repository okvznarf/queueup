'use client';

import { useEffect } from 'react';

export default function LandingInteractivity() {
  useEffect(() => {
    const root = document.getElementById('lp-root');
    if (!root) return;

    function sl(l: string) {
      if (!root) return;
      root.className = 'lp-root' + (l === 'en' ? '' : ' lang-' + l);
      try { localStorage.setItem('ql', l); } catch(e) {}
    }

    const lb = document.getElementById('lb');
    const ls = document.getElementById('ls');
    const cb = document.getElementById('cb');

    if (lb && ls) lb.onclick = () => ls.classList.toggle('open');

    document.querySelectorAll('.lo').forEach(btn => {
      (btn as HTMLElement).onclick = function() {
        sl((btn as HTMLElement).getAttribute('data-l') || 'en');
        ls?.classList.remove('open');
      };
    });

    const handleDocClick = (e: MouseEvent) => {
      if (ls && !ls.contains(e.target as Node)) ls.classList.remove('open');
    };
    document.addEventListener('click', handleDocClick);

    if (cb) {
      cb.onclick = (e) => {
        e.preventDefault();
        window.location.href = 'mailto:hello@queueup.me';
      };
    }

    try {
      const s = localStorage.getItem('ql');
      if (s) sl(s);
      else {
        const b = (navigator.language || '').slice(0, 2);
        if (b === 'hr' || b === 'sl') sl(b);
      }
    } catch(e) {}

    const rv = document.querySelectorAll('.rv');
    const ob = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('v'); });
    }, { threshold: 0.1 });
    rv.forEach(el => ob.observe(el));

    return () => {
      document.removeEventListener('click', handleDocClick);
      ob.disconnect();
    };
  }, []);

  return null;
}
