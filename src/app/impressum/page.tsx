'use client';

import { useState, useEffect } from 'react';

const css = `
:root{--bg:#ECECEC;--bg-card:#E2E2E0;--bg-dark:#492828;--text:#1A0E0E;--text-mid:#3D2A2A;--text-muted:#6B5858;--accent:#84934A;--accent-dark:#656D3F;--border:rgba(73,40,40,0.1);--fd:'Instrument Serif',Georgia,serif;--fb:'Outfit',sans-serif}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
.pp{background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh;display:flex;flex-direction:column}
.pp nav{padding:22px 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
.pp .logo{text-decoration:none;display:flex;align-items:center}.pp .logo img{height:150px;width:auto;margin:-40px 0}
.pp .nr{display:flex;gap:16px;align-items:center}
.pp .nb{background:var(--bg-dark);color:#FFF;padding:11px 26px;border-radius:100px;font-weight:600;font-size:0.92rem;text-decoration:none;transition:opacity 0.2s;font-family:var(--fb)}.pp .nb:hover{opacity:0.85}
.pp .ls{position:relative}.pp .lb{display:flex;align-items:center;gap:6px;background:0;border:1px solid var(--border);border-radius:8px;padding:7px 12px;font-family:var(--fb);font-size:0.85rem;font-weight:500;color:var(--text-mid);cursor:pointer}.pp .lb svg{width:14px;height:14px;opacity:0.5;transition:transform 0.2s}.pp .ls.open .lb svg{transform:rotate(180deg)}
.pp .ld{position:absolute;top:calc(100% + 6px);right:0;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:140px;box-shadow:0 8px 24px rgba(0,0,0,0.08);opacity:0;visibility:hidden;transform:translateY(-4px);transition:all 0.2s;z-index:10}.pp .ls.open .ld{opacity:1;visibility:visible;transform:translateY(0)}
.pp .lo{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:7px;font-size:0.88rem;font-weight:500;color:var(--text-mid);cursor:pointer;border:0;background:0;width:100%;font-family:var(--fb);text-align:left}.pp .lo:hover{background:var(--bg-card)}.pp .lo.ac{color:var(--accent-dark);font-weight:600}
.pp main{flex:1;max-width:780px;margin:0 auto;padding:80px 48px 120px;width:100%}
.pp h1{font-family:var(--fd);font-size:clamp(2.4rem,5vw,3.6rem);letter-spacing:-0.03em;margin-bottom:8px}
.pp .updated{font-size:0.9rem;color:var(--text-muted);font-weight:500;margin-bottom:48px}
.pp h2{font-size:1.1rem;font-weight:700;margin:36px 0 12px}
.pp p,.pp li{color:var(--text-mid);font-size:0.95rem;line-height:1.75;margin-bottom:12px}
.pp ul{padding-left:20px;margin-bottom:12px}
.pp a{color:var(--accent-dark);text-decoration:underline}
.pp footer{border-top:1px solid var(--border);padding:36px 48px}
.pp .fl{max-width:780px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}
.pp .fl a{color:var(--text-muted);text-decoration:none;font-size:0.88rem;transition:color 0.2s}.pp .fl a:hover{color:var(--text)}
.pp .fl span{color:var(--text-muted);font-size:0.82rem}
.pp .flinks{display:flex;gap:24px}
@media(max-width:600px){.pp nav,.pp main,.pp footer{padding-left:20px;padding-right:20px}}
`;

const content = {
  en: {
    title: "Impressum",
    subtitle: "Legal Information",
    s1t: "Company",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14<br/>10360 Sesvete, Croatia</>,
    s2t: "Registration",
    s2: <>OIB: 46603635107<br/>Registered at the Commercial Court in Zagreb</>,
    s3t: "Contact",
    s3: <>Email: <a href="mailto:info@queueup.me">info@queueup.me</a><br/>Website: <a href="https://queueup.me">queueup.me</a></>,
    s4t: "Represented By",
    s4: "Director: Franko Zovko",
    s5t: "Disclaimer",
    s5: "Despite careful content control, we assume no liability for the content of external links. The operators of the linked pages are solely responsible for their content.",
    fp: "Privacy Policy", fc: "Cookie Policy", fi: "Impressum", copy: "All rights reserved.",
  },
  hr: {
    title: "Impressum",
    subtitle: "Pravne informacije",
    s1t: "Tvrtka",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14<br/>10360 Sesvete, Hrvatska</>,
    s2t: "Registracija",
    s2: <>OIB: 46603635107<br/>Registrirano pri Trgovačkom sudu u Zagrebu</>,
    s3t: "Kontakt",
    s3: <>Email: <a href="mailto:info@queueup.me">info@queueup.me</a><br/>Web stranica: <a href="https://queueup.me">queueup.me</a></>,
    s4t: "Zastupnik",
    s4: "Direktor: Franko Zovko",
    s5t: "Izjava o odricanju odgovornosti",
    s5: "Unatoč pažljivoj kontroli sadržaja, ne preuzimamo odgovornost za sadržaj vanjskih poveznica. Operatori povezanih stranica isključivo su odgovorni za njihov sadržaj.",
    fp: "Politika privatnosti", fc: "Politika kolačića", fi: "Impressum", copy: "Sva prava pridržana.",
  },
  sl: {
    title: "Impressum",
    subtitle: "Pravne informacije",
    s1t: "Podjetje",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14<br/>10360 Sesvete, Hrvaška</>,
    s2t: "Registracija",
    s2: <>OIB: 46603635107<br/>Registrirano pri Trgovinskem sodišču v Zagrebu</>,
    s3t: "Kontakt",
    s3: <>E-pošta: <a href="mailto:info@queueup.me">info@queueup.me</a><br/>Spletna stran: <a href="https://queueup.me">queueup.me</a></>,
    s4t: "Zastopnik",
    s4: "Direktor: Franko Zovko",
    s5t: "Izjava o omejitvi odgovornosti",
    s5: "Kljub skrbnemu nadzoru vsebine ne prevzemamo odgovornosti za vsebino zunanjih povezav. Upravljavci povezanih strani so izključno odgovorni za svojo vsebino.",
    fp: "Politika zasebnosti", fc: "Politika piškotkov", fi: "Impressum", copy: "Vse pravice pridržane.",
  },
};

const flags: Record<string, string> = { en: "\ud83c\uddec\ud83c\udde7", hr: "\ud83c\udded\ud83c\uddf7", sl: "\ud83c\uddf8\ud83c\uddee" };
const labels: Record<string, string> = { en: "EN", hr: "HR", sl: "SL" };

export default function ImpressumPage() {
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ql");
    if (saved && (saved === "hr" || saved === "sl")) setLang(saved);
  }, []);

  const switchLang = (l: string) => { setLang(l); setOpen(false); localStorage.setItem("ql", l); };
  const t = content[lang as keyof typeof content];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: css}} />
      <div className="pp">
        <nav>
          <a href="/" className="logo"><img src="/logo.png" alt="QueueUp" /></a>
          <div className="nr">
            <div className={`ls${open ? " open" : ""}`}>
              <button className="lb" onClick={() => setOpen(!open)}>
                {flags[lang]} {labels[lang]}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div className="ld">
                {Object.keys(labels).map(l => (
                  <button key={l} className={`lo${lang === l ? " ac" : ""}`} onClick={() => switchLang(l)}>{flags[l]} {labels[l]}</button>
                ))}
              </div>
            </div>
            <a href="/#contact" className="nb">{lang === "hr" ? "Kontaktirajte nas" : lang === "sl" ? "Kontaktirajte nas" : "Get In Touch"}</a>
          </div>
        </nav>

        <main>
          <h1>{t.title}</h1>
          <p className="updated">{t.subtitle}</p>

          <h2>{t.s1t}</h2>
          <p>{t.s1}</p>

          <h2>{t.s2t}</h2>
          <p>{t.s2}</p>

          <h2>{t.s3t}</h2>
          <p>{t.s3}</p>

          <h2>{t.s4t}</h2>
          <p>{t.s4}</p>

          <h2>{t.s5t}</h2>
          <p>{t.s5}</p>
        </main>

        <footer>
          <div className="fl">
            <div className="flinks">
              <a href="/privacy">{t.fp}</a>
              <a href="/cookies">{t.fc}</a>
              <a href="/impressum">{t.fi}</a>
            </div>
            <span>&copy; 2026 QueueUp. {t.copy}</span>
          </div>
        </footer>
      </div>
    </>
  );
}
