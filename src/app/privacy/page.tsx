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
    title: "Privacy Policy",
    updated: "Last Updated: January 2026",
    s1t: "1. Data Controller",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14, Sesvete, Croatia<br/>OIB: 46603635107<br/>Email: <a href="mailto:info@queueup.me">info@queueup.me</a></>,
    s2t: "2. Data Collection",
    s2: "We collect data specifically to respond to your inquiries and for booking appointments. We do not sell your data. The types of data we may collect include:",
    s2l: ["Name and contact information (email, phone number)", "Appointment and booking details", "Account credentials (encrypted)", "Usage data and analytics"],
    s3t: "3. How We Use Your Data",
    s3: "Your data is used to provide and improve our booking services, send appointment confirmations and reminders, and communicate with you about your account.",
    s4t: "4. Data Sharing",
    s4: "We share your data only with the service providers (shops/businesses) you book appointments with, and with essential third-party services (e.g., email delivery via SendGrid). We never sell your personal data.",
    s5t: "5. Data Retention",
    s5: "We retain your data for as long as your account is active or as needed to provide services. You can request deletion at any time.",
    s6t: "6. Your Rights",
    s6: "Under GDPR, you have the right to:",
    s6l: ["Access your personal data", "Request correction of inaccurate data", "Request deletion of your data", "Object to or restrict processing", "Data portability"],
    s6b: <>To exercise any of these rights, contact us at <a href="mailto:info@queueup.me">info@queueup.me</a>.</>,
    s7t: "7. Security",
    s7: "We implement appropriate technical and organizational measures to protect your personal data, including encryption of sensitive information and secure authentication protocols.",
    s8t: "8. Changes",
    s8: "We may update this policy from time to time. We will notify you of any significant changes via email or through our platform.",
    fp: "Privacy Policy", fc: "Cookie Policy", fi: "Impressum", copy: "All rights reserved.",
  },
  hr: {
    title: "Politika privatnosti",
    updated: "Zadnje ažuriranje: Siječanj 2026.",
    s1t: "1. Voditelj obrade podataka",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14, Sesvete, Hrvatska<br/>OIB: 46603635107<br/>Email: <a href="mailto:info@queueup.me">info@queueup.me</a></>,
    s2t: "2. Prikupljanje podataka",
    s2: "Prikupljamo podatke isključivo za odgovaranje na vaše upite i za rezervaciju termina. Ne prodajemo vaše podatke. Vrste podataka koje možemo prikupljati uključuju:",
    s2l: ["Ime i kontakt podaci (email, broj telefona)", "Detalji o terminima i rezervacijama", "Akreditacijski podaci (šifrirano)", "Podaci o korištenju i analitika"],
    s3t: "3. Kako koristimo vaše podatke",
    s3: "Vaši podaci koriste se za pružanje i poboljšanje naših usluga rezervacije, slanje potvrda i podsjetnika za termine te komunikaciju s vama o vašem računu.",
    s4t: "4. Dijeljenje podataka",
    s4: "Vaše podatke dijelimo samo s pružateljima usluga (trgovinama/tvrtkama) kod kojih rezervirate termine i s neophodnim uslugama trećih strana (npr. dostava e-pošte putem SendGrida). Nikada ne prodajemo vaše osobne podatke.",
    s5t: "5. Zadržavanje podataka",
    s5: "Zadržavamo vaše podatke dok je vaš račun aktivan ili koliko je potrebno za pružanje usluga. Možete zatražiti brisanje u bilo kojem trenutku.",
    s6t: "6. Vaša prava",
    s6: "Prema GDPR-u, imate pravo na:",
    s6l: ["Pristup vašim osobnim podacima", "Zahtjev za ispravak netočnih podataka", "Zahtjev za brisanje vaših podataka", "Prigovor ili ograničenje obrade", "Prenosivost podataka"],
    s6b: <>Za ostvarivanje bilo kojeg od ovih prava, kontaktirajte nas na <a href="mailto:info@queueup.me">info@queueup.me</a>.</>,
    s7t: "7. Sigurnost",
    s7: "Provodimo odgovarajuće tehničke i organizacijske mjere za zaštitu vaših osobnih podataka, uključujući enkripciju osjetljivih informacija i sigurne protokole autentifikacije.",
    s8t: "8. Promjene",
    s8: "Ovu politiku možemo povremeno ažurirati. O svim značajnim promjenama obavijestit ćemo vas putem e-pošte ili putem naše platforme.",
    fp: "Politika privatnosti", fc: "Politika kolačića", fi: "Impressum", copy: "Sva prava pridržana.",
  },
  sl: {
    title: "Politika zasebnosti",
    updated: "Zadnja posodobitev: Januar 2026",
    s1t: "1. Upravljavec podatkov",
    s1: <>all.DIGITAL j.d.o.o.<br/>Jakova Gotovca 14, Sesvete, Hrvaška<br/>OIB: 46603635107<br/>E-pošta: <a href="mailto:info@queueup.me">info@queueup.me</a></>,
    s2t: "2. Zbiranje podatkov",
    s2: "Podatke zbiramo izključno za odgovarjanje na vaša vprašanja in za rezervacijo terminov. Vaših podatkov ne prodajamo. Vrste podatkov, ki jih lahko zbiramo, vključujejo:",
    s2l: ["Ime in kontaktni podatki (e-pošta, telefonska številka)", "Podrobnosti o terminih in rezervacijah", "Poverilnice računa (šifrirano)", "Podatki o uporabi in analitika"],
    s3t: "3. Kako uporabljamo vaše podatke",
    s3: "Vaši podatki se uporabljajo za zagotavljanje in izboljšanje naših storitev rezervacije, pošiljanje potrditev in opomnikov za termine ter komunikacijo z vami o vašem računu.",
    s4t: "4. Deljenje podatkov",
    s4: "Vaše podatke delimo samo s ponudniki storitev (trgovinami/podjetji), pri katerih rezervirate termine, in z nujnimi storitvami tretjih oseb (npr. dostava e-pošte prek SendGrida). Vaših osebnih podatkov nikoli ne prodajamo.",
    s5t: "5. Hramba podatkov",
    s5: "Vaše podatke hranimo, dokler je vaš račun aktiven ali kolikor je potrebno za zagotavljanje storitev. Izbris lahko zahtevate kadar koli.",
    s6t: "6. Vaše pravice",
    s6: "V skladu z GDPR imate pravico do:",
    s6l: ["Dostopa do vaših osebnih podatkov", "Zahteve za popravek netočnih podatkov", "Zahteve za izbris vaših podatkov", "Ugovora ali omejitve obdelave", "Prenosljivosti podatkov"],
    s6b: <>Za uveljavljanje katerekoli od teh pravic nas kontaktirajte na <a href="mailto:info@queueup.me">info@queueup.me</a>.</>,
    s7t: "7. Varnost",
    s7: "Izvajamo ustrezne tehnične in organizacijske ukrepe za zaščito vaših osebnih podatkov, vključno s šifriranjem občutljivih podatkov in varnimi protokoli za preverjanje pristnosti.",
    s8t: "8. Spremembe",
    s8: "To politiko lahko občasno posodobimo. O vseh pomembnih spremembah vas bomo obvestili po e-pošti ali prek naše platforme.",
    fp: "Politika zasebnosti", fc: "Politika piškotkov", fi: "Impressum", copy: "Vse pravice pridržane.",
  },
};

const flags: Record<string, string> = { en: "\ud83c\uddec\ud83c\udde7", hr: "\ud83c\udded\ud83c\uddf7", sl: "\ud83c\uddf8\ud83c\uddee" };
const labels: Record<string, string> = { en: "EN", hr: "HR", sl: "SL" };

export default function PrivacyPage() {
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
          <p className="updated">{t.updated}</p>

          <h2>{t.s1t}</h2>
          <p>{t.s1}</p>

          <h2>{t.s2t}</h2>
          <p>{t.s2}</p>
          <ul>{t.s2l.map((li, i) => <li key={i}>{li}</li>)}</ul>

          <h2>{t.s3t}</h2>
          <p>{t.s3}</p>

          <h2>{t.s4t}</h2>
          <p>{t.s4}</p>

          <h2>{t.s5t}</h2>
          <p>{t.s5}</p>

          <h2>{t.s6t}</h2>
          <p>{t.s6}</p>
          <ul>{t.s6l.map((li, i) => <li key={i}>{li}</li>)}</ul>
          <p>{t.s6b}</p>

          <h2>{t.s7t}</h2>
          <p>{t.s7}</p>

          <h2>{t.s8t}</h2>
          <p>{t.s8}</p>
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
