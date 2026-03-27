import LandingInteractivity from './LandingInteractivity';

const css = `
:root{--bg:#ECECEC;--bg-card:#E2E2E0;--bg-dark:#492828;--text:#1A0E0E;--text-mid:#3D2A2A;--text-muted:#6B5858;--accent:#84934A;--accent-dark:#656D3F;--border:rgba(73,40,40,0.1);--border-dark:rgba(255,255,255,0.08);--fd:'Instrument Serif',Georgia,serif;--fb:'Outfit',sans-serif;--fm:'JetBrains Mono',monospace;--shadow-sm:0 2px 8px rgba(73,40,40,0.06);--shadow-md:0 8px 24px rgba(73,40,40,0.08);--shadow-lg:0 16px 48px rgba(73,40,40,0.12);--shadow-card:0 1px 3px rgba(73,40,40,0.04),0 8px 24px rgba(73,40,40,0.06);--shadow-glow:0 0 40px rgba(132,147,74,0.15)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}
.lp-root{background:var(--bg);color:var(--text);font-family:var(--fb);font-weight:400;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;position:relative}
.lp-root::before{content:'';position:fixed;inset:0;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");pointer-events:none;z-index:0}
.hr,.sl{display:none}
.lp-root.lang-hr .en{display:none}.lp-root.lang-hr .hr{display:inline}.lp-root.lang-hr p.hr,.lp-root.lang-hr h1.hr,.lp-root.lang-hr h2.hr,.lp-root.lang-hr h3.hr,.lp-root.lang-hr div.hr,.lp-root.lang-hr span.hr,.lp-root.lang-hr a.hr{display:block}.lp-root.lang-hr a.hr.ib{display:inline-block}
.lp-root.lang-sl .en{display:none}.lp-root.lang-sl .sl{display:inline}.lp-root.lang-sl p.sl,.lp-root.lang-sl h1.sl,.lp-root.lang-sl h2.sl,.lp-root.lang-sl h3.sl,.lp-root.lang-sl div.sl,.lp-root.lang-sl span.sl,.lp-root.lang-sl a.sl{display:block}.lp-root.lang-sl a.sl.ib{display:inline-block}

/* ─── NAV ─── */
.lp-root nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:22px 48px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);background:rgba(236,236,236,0.8);border-bottom:1px solid rgba(73,40,40,0.06);transition:padding 0.3s ease,box-shadow 0.3s ease,background 0.3s ease}
.lp-root .logo{text-decoration:none;display:flex;align-items:center}.lp-root .logo img{height:250px;width:auto;margin:-90px 0;transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),filter 0.3s ease}.lp-root .logo:hover img{transform:scale(1.04);filter:brightness(1.05)}
.lp-root .nr{display:flex;gap:28px;align-items:center}
.lp-root .nl{display:flex;gap:32px;align-items:center}
.lp-root .nl a{color:var(--text-mid);text-decoration:none;font-size:0.95rem;font-weight:500;position:relative;transition:color 0.25s ease}.lp-root .nl a:not(.bs)::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent-dark));border-radius:1px;transition:width 0.35s cubic-bezier(0.16,1,0.3,1)}.lp-root .nl a:not(.bs):hover{color:var(--text)}.lp-root .nl a:not(.bs):hover::after{width:100%}
.lp-root .bs{background:var(--bg-dark);color:#FFF !important;padding:11px 26px;border-radius:100px;font-weight:600;font-size:0.92rem;text-decoration:none;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);box-shadow:0 2px 12px rgba(73,40,40,0.15);position:relative;overflow:hidden}.lp-root .bs::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.5s ease}.lp-root .bs:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(73,40,40,0.25)}.lp-root .bs:hover::before{left:100%}
.lp-root .ls{position:relative}.lp-root .lb{display:flex;align-items:center;gap:6px;background:0;border:1px solid var(--border);border-radius:8px;padding:7px 12px;font-family:var(--fb);font-size:0.85rem;font-weight:500;color:var(--text-mid);cursor:pointer;transition:all 0.2s ease}.lp-root .lb:hover{border-color:rgba(73,40,40,0.2);background:rgba(73,40,40,0.03)}.lp-root .lb svg{width:14px;height:14px;opacity:0.5;transition:transform 0.25s ease}.lp-root .ls.open .lb svg{transform:rotate(180deg)}
.lp-root .ld{position:absolute;top:calc(100% + 6px);right:0;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:140px;box-shadow:var(--shadow-lg);opacity:0;visibility:hidden;transform:translateY(-8px);transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}.lp-root .ls.open .ld{opacity:1;visibility:visible;transform:translateY(0)}
.lp-root .lo{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:7px;font-size:0.88rem;font-weight:500;color:var(--text-mid);cursor:pointer;border:0;background:0;width:100%;font-family:var(--fb);text-align:left;transition:all 0.15s ease}.lp-root .lo:hover{background:var(--bg-card);transform:translateX(2px)}.lp-root .lo.ac{color:var(--accent-dark);font-weight:600}

/* ─── HERO ─── */
.lp-root .hero{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:170px 24px 110px;overflow:hidden}
.lp-root .hero::before{content:'';position:absolute;top:-180px;right:-120px;width:650px;height:650px;background:radial-gradient(circle,rgba(132,147,74,0.14) 0%,rgba(132,147,74,0.05) 40%,transparent 70%);border-radius:50%;pointer-events:none;animation:float 14s ease-in-out infinite}
.lp-root .hero::after{content:'';position:absolute;bottom:-80px;left:-140px;width:550px;height:550px;background:radial-gradient(circle,rgba(73,40,40,0.09) 0%,rgba(73,40,40,0.03) 40%,transparent 70%);border-radius:50%;pointer-events:none;animation:float 18s ease-in-out infinite reverse}
.lp-root .hero-orb{position:absolute;width:300px;height:300px;border-radius:50%;pointer-events:none;filter:blur(80px);opacity:0.4;animation:drift 20s ease-in-out infinite}
.lp-root .hero-orb-1{top:10%;left:15%;background:rgba(132,147,74,0.2);animation-delay:-5s}
.lp-root .hero-orb-2{bottom:20%;right:10%;background:rgba(73,40,40,0.12);animation-delay:-10s}
.lp-root .hl{font-family:var(--fm);font-size:0.78rem;font-weight:500;color:var(--accent-dark);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:32px;padding:8px 20px;border:1px solid rgba(101,109,63,0.25);border-radius:100px;animation:scale-in 0.6s cubic-bezier(0.16,1,0.3,1) both;position:relative;background:rgba(132,147,74,0.06);backdrop-filter:blur(8px)}
.lp-root .hero h1{font-family:var(--fd);font-size:clamp(3.4rem,8.5vw,7.5rem);line-height:0.92;letter-spacing:-0.05em;max-width:850px;animation:fu 0.8s cubic-bezier(0.16,1,0.3,1) 0.12s both}
.lp-root .hero h1 em{font-style:italic;color:var(--bg-dark);position:relative;display:inline-block}.lp-root .hero h1 em::after{content:'';position:absolute;bottom:2px;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent),var(--accent-dark));border-radius:2px;opacity:0.7;animation:grow-width 0.8s ease 0.7s both}
.lp-root .hs{color:var(--text-mid);font-size:1.18rem;line-height:1.8;max-width:500px;margin-top:32px;animation:fu 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both}
.lp-root .ha{display:flex;gap:16px;margin-top:48px;animation:fu 0.8s cubic-bezier(0.16,1,0.3,1) 0.28s both}
.lp-root .bp{background:var(--bg-dark);color:var(--bg);padding:16px 36px;border-radius:100px;font-family:var(--fb);font-weight:600;font-size:1rem;border:0;cursor:pointer;text-decoration:none;transition:all 0.4s cubic-bezier(0.16,1,0.3,1);display:inline-block;box-shadow:0 4px 16px rgba(73,40,40,0.2);position:relative;overflow:hidden}.lp-root .bp::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);transition:left 0.6s ease}.lp-root .bp:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 10px 36px rgba(73,40,40,0.3)}.lp-root .bp:hover::before{left:100%}.lp-root .bp:active{transform:translateY(0) scale(0.98);box-shadow:0 2px 8px rgba(73,40,40,0.2)}
.lp-root .bg{background:0;color:var(--text);padding:16px 36px;border-radius:100px;font-family:var(--fb);font-weight:500;font-size:1rem;border:1px solid rgba(73,40,40,0.15);text-decoration:none;cursor:pointer;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);display:inline-block;backdrop-filter:blur(4px)}.lp-root .bg:hover{border-color:rgba(73,40,40,0.3);background:rgba(73,40,40,0.04);transform:translateY(-2px);box-shadow:0 4px 16px rgba(73,40,40,0.06)}
.lp-root .hm{display:flex;gap:56px;margin-top:88px;padding-top:44px;border-top:1px solid var(--border);animation:fu 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both}
.lp-root .metric{position:relative;text-align:center}.lp-root .metric h3{font-family:var(--fd);font-size:2.8rem;color:var(--bg-dark);transition:all 0.4s cubic-bezier(0.16,1,0.3,1);letter-spacing:-0.02em}.lp-root .metric:hover h3{transform:scale(1.08);color:var(--accent-dark)}.lp-root .metric p{color:var(--text-muted);font-size:0.82rem;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px}

/* ─── SECTIONS SHARED ─── */
.lp-root section{position:relative;z-index:1}
.lp-root .container{max-width:1040px;margin:0 auto}
.lp-root .sl2{font-family:var(--fm);font-size:0.76rem;font-weight:500;color:var(--accent-dark);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px}
.lp-root .st{font-family:var(--fd);font-size:clamp(2rem,3.8vw,3rem);line-height:1.08;letter-spacing:-0.04em}
.lp-root .sd{color:var(--text-mid);font-size:1.05rem;line-height:1.7;margin-top:12px;max-width:440px}

/* ─── INDUSTRIES ─── */
.lp-root .industries{padding:120px 48px;border-top:1px solid var(--border);position:relative;overflow:hidden}
.lp-root .industries::before{content:'';position:absolute;top:40px;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(132,147,74,0.07) 0%,transparent 70%);pointer-events:none}
.lp-root .industries::after{content:'';position:absolute;bottom:-200px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(73,40,40,0.04) 0%,transparent 70%);pointer-events:none;border-radius:50%}
.lp-root .industries .sh{text-align:center;margin-bottom:56px}.lp-root .industries .sh .sd{margin:12px auto 0}
.lp-root .ig{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.lp-root .ii{background:var(--bg);padding:40px 32px;transition:all 0.4s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}.lp-root .ii::before{content:'';position:absolute;top:0;left:0;width:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent-dark));transition:width 0.5s cubic-bezier(0.16,1,0.3,1)}.lp-root .ii::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(132,147,74,0.06) 0%,transparent 60%);opacity:0;transition:opacity 0.4s ease}.lp-root .ii:hover{background:var(--bg-card);transform:translateY(-2px)}.lp-root .ii:hover::before{width:100%}.lp-root .ii:hover::after{opacity:1}.lp-root .ii h3{font-size:1.05rem;font-weight:600;margin-bottom:8px;transition:color 0.3s ease}.lp-root .ii:hover h3{color:var(--accent-dark)}.lp-root .ii p{color:var(--text-muted);font-size:0.92rem;line-height:1.6}

/* ─── FEATURES ─── */
.lp-root .features{padding:120px 48px;border-top:1px solid var(--border);position:relative;overflow:hidden}
.lp-root .features::before{content:'';position:absolute;bottom:60px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(73,40,40,0.05) 0%,transparent 70%);border-radius:50%;pointer-events:none}
.lp-root .features::after{content:'';position:absolute;top:100px;left:-150px;width:300px;height:300px;background:radial-gradient(circle,rgba(132,147,74,0.05) 0%,transparent 70%);border-radius:50%;pointer-events:none}
.lp-root .fg{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}.lp-root .ffl .sd{margin-bottom:48px}
.lp-root .fi{padding:22px 0;border-bottom:1px solid var(--border);transition:all 0.35s cubic-bezier(0.16,1,0.3,1);position:relative}.lp-root .fi:first-child{border-top:1px solid var(--border)}.lp-root .fi:hover{padding-left:16px}.lp-root .fi::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:0;height:60%;background:var(--accent);border-radius:2px;transition:width 0.3s ease;opacity:0.5}.lp-root .fi:hover::before{width:3px}.lp-root .fi h3{font-size:1.02rem;font-weight:600;margin-bottom:6px;transition:color 0.25s ease}.lp-root .fi:hover h3{color:var(--accent-dark)}.lp-root .fi p{color:var(--text-muted);font-size:0.92rem;line-height:1.65}

/* ─── MOCK UI CARD ─── */
.lp-root .mu{background:var(--bg-dark);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:28px;color:var(--bg);box-shadow:var(--shadow-lg),0 0 0 1px rgba(255,255,255,0.03);transition:transform 0.5s cubic-bezier(0.16,1,0.3,1),box-shadow 0.5s ease;position:relative;overflow:hidden}.lp-root .mu::before{content:'';position:absolute;top:-50%;right:-50%;width:100%;height:100%;background:radial-gradient(circle,rgba(132,147,74,0.08) 0%,transparent 60%);pointer-events:none}.lp-root .mu:hover{transform:translateY(-6px) rotate(0.5deg);box-shadow:0 24px 64px rgba(73,40,40,0.2),var(--shadow-glow)}
.lp-root .mt2{display:flex;align-items:center;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--border-dark);margin-bottom:20px}
.lp-root .md2{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-dark));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.72rem;color:#fff;box-shadow:0 2px 8px rgba(132,147,74,0.3)}
.lp-root .mi2 h4{font-size:0.95rem;font-weight:600;color:var(--bg)}.lp-root .mi2 p{font-size:0.78rem;color:rgba(236,236,236,0.5)}
.lp-root .mc{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:18px}
.lp-root .dy{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.76rem;font-weight:500;color:rgba(236,236,236,0.35);background:rgba(255,255,255,0.04);transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}.lp-root .dy.on{color:rgba(236,236,236,0.75);border:1px solid rgba(255,255,255,0.1)}.lp-root .dy.on:hover{background:rgba(255,255,255,0.1);transform:scale(1.05)}.lp-root .dy.sel{background:var(--accent);color:#fff;font-weight:700;box-shadow:0 2px 12px rgba(132,147,74,0.4);animation:pulse-subtle 2s ease-in-out infinite}
.lp-root .ms{display:flex;gap:6px;flex-wrap:wrap}.lp-root .mx{padding:9px 16px;border-radius:8px;font-family:var(--fm);font-size:0.76rem;font-weight:500;background:rgba(255,255,255,0.04);color:rgba(236,236,236,0.4);border:1px solid transparent;transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}.lp-root .mx:hover{background:rgba(255,255,255,0.08);transform:translateY(-1px)}.lp-root .mx.pk{border-color:var(--accent);color:var(--accent);background:rgba(132,147,74,0.12);box-shadow:0 0 16px rgba(132,147,74,0.2)}

/* ─── HOW IT WORKS ─── */
.lp-root .how{padding:130px 48px;background:var(--bg-dark);color:var(--bg);position:relative;overflow:hidden}
.lp-root .how::before{content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(132,147,74,0.12) 0%,transparent 55%);border-radius:50%;pointer-events:none;animation:drift 25s ease-in-out infinite}
.lp-root .how::after{content:'';position:absolute;bottom:-150px;left:-150px;width:500px;height:500px;background:radial-gradient(circle,rgba(236,236,236,0.05) 0%,transparent 55%);border-radius:50%;pointer-events:none;animation:drift 30s ease-in-out infinite reverse}
.lp-root .how .sh{text-align:center;margin-bottom:80px;position:relative;z-index:1}.lp-root .how .sl2{color:#A8B85E;font-size:0.82rem}.lp-root .how .st{color:#FFF;font-size:clamp(2.2rem,4.5vw,3.4rem);letter-spacing:-0.04em}.lp-root .how .sd{color:rgba(236,236,236,0.75);margin:12px auto 0;font-size:1.1rem}
.lp-root .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-dark);border-radius:20px;overflow:hidden;max-width:1040px;margin:0 auto;position:relative;z-index:1}
.lp-root .step{background:var(--bg-dark);padding:52px 36px;transition:all 0.4s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}.lp-root .step::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(132,147,74,0.06) 0%,transparent 60%);opacity:0;transition:opacity 0.4s ease}.lp-root .step:hover{background:rgba(73,40,40,0.85)}.lp-root .step:hover::after{opacity:1}.lp-root .step-top{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}
.lp-root .sn{font-family:var(--fd);font-size:3.6rem;color:var(--accent);opacity:0.5;line-height:1;transition:all 0.4s cubic-bezier(0.16,1,0.3,1)}.lp-root .step:hover .sn{opacity:0.9;transform:scale(1.1);text-shadow:0 0 30px rgba(132,147,74,0.3)}
.lp-root .step h3{font-family:var(--fd);font-size:1.55rem;font-weight:400;color:#FFF;line-height:1.2}
.lp-root .step p{color:rgba(236,236,236,0.82);font-size:1.02rem;line-height:1.75;max-width:300px}
.lp-root .stag{display:inline-block;margin-top:18px;font-family:var(--fm);font-size:0.78rem;font-weight:500;color:var(--accent);letter-spacing:0.08em;padding:6px 16px;border:1px solid rgba(132,147,74,0.35);border-radius:100px;transition:all 0.35s cubic-bezier(0.16,1,0.3,1)}.lp-root .step:hover .stag{background:rgba(132,147,74,0.12);border-color:rgba(132,147,74,0.6);box-shadow:0 0 20px rgba(132,147,74,0.1)}

/* ─── PRICING ─── */
.lp-root .pricing{padding:120px 48px;border-top:1px solid var(--border);position:relative;overflow:hidden}
.lp-root .pricing::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;height:500px;background:radial-gradient(ellipse,rgba(132,147,74,0.06) 0%,transparent 65%);pointer-events:none}
.lp-root .pricing .sh{text-align:center;margin-bottom:56px}.lp-root .pricing .sh .sd{margin:12px auto 0}
.lp-root .pg{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;max-width:900px;margin:0 auto}
.lp-root .pc{background:var(--bg-dark);color:var(--bg);border-radius:20px;padding:44px;display:flex;flex-direction:column;gap:22px;box-shadow:var(--shadow-lg);transition:all 0.5s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}.lp-root .pc::before{content:'';position:absolute;top:0;right:0;width:250px;height:250px;background:radial-gradient(circle,rgba(132,147,74,0.14) 0%,transparent 65%);pointer-events:none}.lp-root .pc::after{content:'';position:absolute;bottom:-50px;left:-50px;width:200px;height:200px;background:radial-gradient(circle,rgba(236,236,236,0.04) 0%,transparent 70%);pointer-events:none}.lp-root .pc:hover{transform:translateY(-6px);box-shadow:0 24px 64px rgba(73,40,40,0.22),var(--shadow-glow)}
.lp-root .pm{display:flex;align-items:baseline;gap:6px}.lp-root .pm h3{font-family:var(--fd);font-size:3.8rem;color:#fff;line-height:1;letter-spacing:-0.03em}.lp-root .pm span{font-size:1rem;color:rgba(236,236,236,0.6)}
.lp-root .pe{font-size:0.95rem;color:rgba(236,236,236,0.7);padding:10px 16px;background:rgba(255,255,255,0.06);border-radius:8px;border:1px solid rgba(255,255,255,0.04)}
.lp-root .pfl{list-style:none;display:flex;flex-direction:column;gap:10px}.lp-root .pfl li{font-size:0.95rem;color:rgba(236,236,236,0.8);padding-left:24px;position:relative;transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}.lp-root .pfl li:hover{transform:translateX(4px);color:rgba(236,236,236,0.95)}.lp-root .pfl li::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:16px;height:16px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13.5 4.5l-7 7L3 8' stroke='%2384934A' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat}
.lp-root .roi{display:flex;flex-direction:column;gap:20px;justify-content:center}
.lp-root .rs{padding:28px;border:1px solid var(--border);border-radius:14px;background:var(--bg-card);transition:all 0.4s cubic-bezier(0.16,1,0.3,1);box-shadow:var(--shadow-sm);position:relative;overflow:hidden}.lp-root .rs::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 50%,rgba(132,147,74,0.05) 0%,transparent 60%);opacity:0;transition:opacity 0.3s ease}.lp-root .rs:hover{transform:translateY(-3px) scale(1.01);box-shadow:var(--shadow-md);border-color:rgba(73,40,40,0.15)}.lp-root .rs:hover::before{opacity:1}.lp-root .rs h3{font-family:var(--fd);font-size:2.5rem;color:var(--bg-dark);transition:all 0.4s cubic-bezier(0.16,1,0.3,1);letter-spacing:-0.02em}.lp-root .rs:hover h3{transform:scale(1.06);color:var(--accent-dark)}.lp-root .rs p{color:var(--text-muted);font-size:0.82rem;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px}

/* ─── CTA ─── */
.lp-root .cta{padding:150px 48px;text-align:center;border-top:1px solid var(--border);position:relative;overflow:hidden}
.lp-root .cta::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(73,40,40,0.05) 0%,rgba(132,147,74,0.05) 50%,transparent 70%);pointer-events:none;animation:drift 20s ease-in-out infinite}
.lp-root .cta h2{font-family:var(--fd);font-size:clamp(2.2rem,5vw,3.8rem);letter-spacing:-0.04em;max-width:600px;margin:0 auto 16px;line-height:1.05}.lp-root .cta h2 em{font-style:italic;color:var(--accent-dark);position:relative}.lp-root .cta h2 em::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent-dark));border-radius:2px;opacity:0.5}.lp-root .cta p{color:var(--text-mid);font-size:1.05rem;max-width:440px;margin:0 auto 40px;line-height:1.7}

/* ─── FOOTER ─── */
.lp-root footer{padding:48px 48px 36px;border-top:1px solid var(--border);position:relative}.lp-root .fti{max-width:1040px;margin:0 auto;display:flex;justify-content:space-between;align-items:start;gap:40px}.lp-root .ftb p{color:var(--text-muted);font-size:0.85rem;margin-top:8px;max-width:240px;line-height:1.6}
.lp-root .ftc h4{font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:var(--text-muted);margin-bottom:14px}.lp-root .ftc a{display:block;color:var(--text-muted);text-decoration:none;font-size:0.9rem;margin-bottom:10px;transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}.lp-root .ftc a:hover{color:var(--text);transform:translateX(4px)}
.lp-root .ftm{max-width:1040px;margin:36px auto 0;padding-top:20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted)}

/* ─── ANIMATIONS ─── */
@keyframes fu{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-20px)}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-15px) scale(1.05)}66%{transform:translate(-20px,10px) scale(0.95)}}
@keyframes grow-width{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}
@keyframes pulse-subtle{0%,100%{box-shadow:0 2px 12px rgba(132,147,74,0.4)}50%{box-shadow:0 2px 20px rgba(132,147,74,0.6)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}

/* ─── SCROLL REVEALS ─── */
.lp-root .rv{opacity:0;transform:translateY(32px);transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1)}.lp-root .rv.v{opacity:1;transform:translateY(0)}
.lp-root .rv-left{opacity:0;transform:translateX(-32px);transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1)}.lp-root .rv-left.v{opacity:1;transform:translateX(0)}
.lp-root .rv-right{opacity:0;transform:translateX(32px);transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1)}.lp-root .rv-right.v{opacity:1;transform:translateX(0)}

/* ─── STAGGERED CHILDREN ─── */
.lp-root .ig .ii{transition:all 0.4s cubic-bezier(0.16,1,0.3,1)}
.lp-root .rv.v .ii:nth-child(1){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0s both}.lp-root .rv.v .ii:nth-child(2){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0.07s both}.lp-root .rv.v .ii:nth-child(3){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0.14s both}.lp-root .rv.v .ii:nth-child(4){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0.21s both}.lp-root .rv.v .ii:nth-child(5){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s both}.lp-root .rv.v .ii:nth-child(6){animation:fu 0.55s cubic-bezier(0.16,1,0.3,1) 0.35s both}
.lp-root .rv.v .step:nth-child(1){animation:fu 0.65s cubic-bezier(0.16,1,0.3,1) 0s both}.lp-root .rv.v .step:nth-child(2){animation:fu 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s both}.lp-root .rv.v .step:nth-child(3){animation:fu 0.65s cubic-bezier(0.16,1,0.3,1) 0.24s both}
.lp-root .rv.v .fi:nth-child(1){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0s both}.lp-root .rv.v .fi:nth-child(2){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.08s both}.lp-root .rv.v .fi:nth-child(3){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.16s both}.lp-root .rv.v .fi:nth-child(4){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.24s both}
.lp-root .rv.v .rs:nth-child(1){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0s both}.lp-root .rv.v .rs:nth-child(2){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.08s both}.lp-root .rv.v .rs:nth-child(3){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.16s both}.lp-root .rv.v .rs:nth-child(4){animation:fu 0.5s cubic-bezier(0.16,1,0.3,1) 0.24s both}

/* ─── MOBILE ─── */
@media(max-width:900px){
.lp-root nav{padding:14px 20px}
.lp-root .logo img{height:160px;margin:-55px 0}
.lp-root .nl a:not(.bs){display:none}
.lp-root .bs{padding:9px 20px;font-size:0.85rem}
.lp-root .hero{padding:110px 20px 64px}
.lp-root .hero h1{font-size:clamp(2.6rem,7vw,4rem);line-height:0.95}
.lp-root .hs{font-size:1.02rem;line-height:1.65;margin-top:24px}
.lp-root .ha{flex-direction:column;align-items:center;gap:12px;margin-top:36px;width:100%}
.lp-root .bp,.lp-root .bg{width:100%;max-width:300px;text-align:center;padding:15px 32px}
.lp-root .hero::before,.lp-root .hero::after{width:250px;height:250px}
.lp-root .hero-orb{width:150px;height:150px}
.lp-root .hm{gap:20px;flex-wrap:wrap;justify-content:center;margin-top:56px;padding-top:32px}
.lp-root .metric h3{font-size:2.2rem}
.lp-root .metric p{font-size:0.75rem}
.lp-root .ig,.lp-root .steps{grid-template-columns:1fr}
.lp-root .fg{grid-template-columns:1fr}
.lp-root .industries,.lp-root .features,.lp-root .how,.lp-root .cta,.lp-root .pricing{padding-left:20px;padding-right:20px}
.lp-root .industries,.lp-root .features,.lp-root .pricing{padding-top:80px;padding-bottom:80px}
.lp-root .how{padding-top:80px;padding-bottom:80px}
.lp-root .how .sh{margin-bottom:48px}
.lp-root .step{padding:36px 24px}
.lp-root .cta{padding-top:80px;padding-bottom:80px}
.lp-root .st{font-size:clamp(1.8rem,5vw,2.4rem)}
.lp-root .sd{font-size:0.95rem}
.lp-root .pc{padding:32px 24px}
.lp-root .pg{gap:32px}
.lp-root .pg{grid-template-columns:1fr}
.lp-root footer{padding-left:20px;padding-right:20px}
.lp-root .fti{flex-direction:column;gap:32px}
.lp-root .ftm{flex-direction:column;gap:8px;text-align:center}
}
`;

export default function HomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: css}} />
      <LandingInteractivity />
      <div className="lp-root" id="lp-root">

        <nav>
          <a href="#" className="logo"><img src="/logo.png" alt="QueueUp" /></a>
          <div className="nr">
            <div className="nl">
              <a href="#industries"><span className="en">Industries</span><span className="hr">Industrije</span><span className="sl">Industrije</span></a>
              <a href="#features"><span className="en">Features</span><span className="hr">Značajke</span><span className="sl">Funkcije</span></a>
              <a href="#how"><span className="en">How It Works</span><span className="hr">Kako radi</span><span className="sl">Kako deluje</span></a>
              <a href="#pricing"><span className="en">Pricing</span><span className="hr">Cijene</span><span className="sl">Cene</span></a>
              <a href="#contact" className="bs"><span className="en">Get Started</span><span className="hr">Započnite</span><span className="sl">Začnite</span></a>
            </div>
            <div className="ls" id="ls">
              <button className="lb" id="lb">
                <span className="en">EN</span><span className="hr">HR</span><span className="sl">SL</span>
                <svg viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="ld">
                <button className="lo" data-l="en">English</button>
                <button className="lo" data-l="hr">Hrvatski</button>
                <button className="lo" data-l="sl">Slovenščina</button>
              </div>
            </div>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <p className="hl"><span className="en">Appointment booking, simplified</span><span className="hr">Rezervacije termina, jednostavno</span><span className="sl">Naročanje terminov, poenostavljeno</span></p>
          <h1 className="en">Stop losing clients<br/>to <em>no-shows</em></h1>
          <h1 className="hr">Prestanite gubiti klijente<br/>zbog <em>nedolazaka</em></h1>
          <h1 className="sl">Nehajte izgubljati stranke<br/>zaradi <em>nedohodov</em></h1>
          <p className="hs"><span className="en">Businesses lose 15–30% of appointments to no-shows. QueueUp cuts that by up to 70% with automated reminders — and pays for itself in under 2 months.</span><span className="hr">Biznisi gube 15–30% termina zbog nedolazaka. QueueUp to smanjuje do 70% automatskim podsjetnicima — i isplati se za manje od 2 mjeseca.</span><span className="sl">Podjetja izgubijo 15–30% terminov zaradi nedohodov. QueueUp to zmanjša do 70% s samodejnimi opomniki — in se povrne v manj kot 2 mesecih.</span></p>
          <div className="ha">
            <a href="#contact" className="bp ib"><span className="en">Get In Touch</span><span className="hr">Kontaktirajte nas</span><span className="sl">Kontaktirajte nas</span></a>
            <a href="#how" className="bg ib"><span className="en">See How It Works</span><span className="hr">Kako funkcionira</span><span className="sl">Kako deluje</span></a>
          </div>
          <div className="hm">
            <div className="metric"><h3>-70%</h3><p><span className="en">Fewer no-shows</span><span className="hr">Manje nedolazaka</span><span className="sl">Manj nedohodov</span></p></div>
            <div className="metric"><h3>+27%</h3><p><span className="en">Revenue growth</span><span className="hr">Rast prihoda</span><span className="sl">Rast prihodov</span></p></div>
            <div className="metric"><h3>&lt;2 mj.</h3><p><span className="en">ROI payback</span><span className="hr">Povrat investicije</span><span className="sl">Povrat investicije</span></p></div>
          </div>
        </section>

        <section className="industries" id="industries">
          <div className="container">
            <div className="sh rv">
              <p className="sl2"><span className="en">Industries</span><span className="hr">Industrije</span><span className="sl">Industrije</span></p>
              <h2 className="st"><span className="en">One platform, every business</span><span className="hr">Jedna platforma, svaki posao</span><span className="sl">Ena platforma, vsako podjetje</span></h2>
              <p className="sd"><span className="en">Whether you are cutting hair or fixing engines, QueueUp adapts to how you work.</span><span className="hr">Bilo da šišate kosu ili popravljate motore, QueueUp se prilagođava vašem načinu rada.</span><span className="sl">Ne glede na to, ali strižete lase ali popravljate motorje, se QueueUp prilagodi vašemu načinu dela.</span></p>
            </div>
            <div className="ig rv">
              <div className="ii"><h3><span className="en">Barbers and Salons</span><span className="hr">Frizeri i saloni</span><span className="sl">Frizerji in saloni</span></h3><p><span className="en">Clients pick their stylist, choose a service, and book in seconds.</span><span className="hr">Klijenti biraju frizera, uslugu i rezerviraju u sekundi.</span><span className="sl">Stranke izberejo frizerja, storitev in rezervirajo v sekundi.</span></p></div>
              <div className="ii"><h3><span className="en">Auto Mechanics</span><span className="hr">Automehaničari</span><span className="sl">Avtomehaniki</span></h3><p><span className="en">Schedule repairs and inspections. Real-time bay availability.</span><span className="hr">Zakazivanje popravaka i pregleda. Dostupnost u stvarnom vremenu.</span><span className="sl">Načrtovanje popravil in pregledov. Razpoložljivost v realnem času.</span></p></div>
              <div className="ii"><h3><span className="en">Restaurants and Cafes</span><span className="hr">Restorani i kafići</span><span className="sl">Restavracije in kavarne</span></h3><p><span className="en">Reservations, walk-ins, and waitlists from a single dashboard.</span><span className="hr">Rezervacije, dolasci bez najave i liste čekanja s jedne nadzorne ploče.</span><span className="sl">Rezervacije, prihodi brez najave in čakalne vrste z ene nadzorne plošče.</span></p></div>
              <div className="ii"><h3><span className="en">Healthcare and Clinics</span><span className="hr">Zdravstvo i klinike</span><span className="sl">Zdravstvo in klinike</span></h3><p><span className="en">Scheduling for doctors, dentists, and therapists with intake forms.</span><span className="hr">Zakazivanje za liječnike, stomatologe i terapeute s obrascima za prijam.</span><span className="sl">Naročanje za zdravnike, zobozdravnike in terapevte z obrazci za sprejem.</span></p></div>
              <div className="ii"><h3><span className="en">Pet Services</span><span className="hr">Usluge za kućne ljubimce</span><span className="sl">Storitve za hišne živali</span></h3><p><span className="en">Groomers, vets, and trainers with multi-pet client support.</span><span className="hr">Šišanje, veterinari i treneri s podrškom za više ljubimaca po klijentu.</span><span className="sl">Striženje, veterinarji in trenerji s podporo za več živali na stranko.</span></p></div>
              <div className="ii"><h3><span className="en">Fitness and Wellness</span><span className="hr">Fitness i wellness</span><span className="sl">Fitnes in dobro počutje</span></h3><p><span className="en">Class scheduling, personal training, and membership tracking.</span><span className="hr">Rasporedi grupnih treninga, osobni treninzi i praćenje članstva.</span><span className="sl">Urniki skupinskih treningov, osebni treningi in sledenje članstvu.</span></p></div>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="container">
            <div className="fg">
              <div className="ffl rv-left rv">
                <p className="sl2"><span className="en">Features</span><span className="hr">Značajke</span><span className="sl">Funkcije</span></p>
                <h2 className="st"><span className="en">Everything to run a booked-out business</span><span className="hr">Sve što trebate za popunjen kalendar</span><span className="sl">Vse za polno zaseden urnik</span></h2>
                <p className="sd"><span className="en">Built for speed, designed for simplicity.</span><span className="hr">Napravljeno za brzinu, dizajnirano za jednostavnost.</span><span className="sl">Zgrajeno za hitrost, oblikovano za preprostost.</span></p>
                <div className="fi"><h3><span className="en">Smart Scheduling</span><span className="hr">Pametno zakazivanje</span><span className="sl">Pametno načrtovanje</span></h3><p><span className="en">Time slot suggestions based on staff availability, service duration, and demand patterns.</span><span className="hr">Prijedlozi termina na temelju dostupnosti osoblja, trajanja usluge i obrazaca potražnje.</span><span className="sl">Predlogi terminov na podlagi razpoložljivosti osebja, trajanja storitve in vzorcev povpraševanja.</span></p></div>
                <div className="fi"><h3><span className="en">Automated Reminders</span><span className="hr">Automatski podsjetnici</span><span className="sl">Samodejni opomniki</span></h3><p><span className="en">SMS and email reminders before every appointment. Reduce no-shows by up to 70%.</span><span className="hr">SMS i email podsjetnici prije svakog termina. Smanjite nedolaske do 70%.</span><span className="sl">SMS in e-poštni opomniki pred vsakim terminom. Zmanjšajte nedohode do 70%.</span></p></div>
                <div className="fi"><h3><span className="en">Online Payments</span><span className="hr">Online plaćanja</span><span className="sl">Spletna plačila</span></h3><p><span className="en">Accept deposits or full payments upfront. Stripe, PayPal, and local providers.</span><span className="hr">Primajte kapare ili pune uplate unaprijed. Stripe, PayPal i lokalni pružatelji.</span><span className="sl">Sprejemajte are ali polna plačila vnaprej. Stripe, PayPal in lokalni ponudniki.</span></p></div>
                <div className="fi"><h3><span className="en">Team Management</span><span className="hr">Upravljanje timom</span><span className="sl">Upravljanje ekipe</span></h3><p><span className="en">Individual calendars, working hours, breaks, vacations, and service specialties.</span><span className="hr">Individualni kalendari, radno vrijeme, pauze, godišnji odmori i specijalizacije.</span><span className="sl">Individualni koledarji, delovni čas, odmori, dopusti in specializacije storitev.</span></p></div>
              </div>
              <div className="mu rv-right rv">
                <div className="mt2"><div className="md2">QU</div><div className="mi2"><h4>Urban Cuts</h4><p><span className="en">Select date and time</span><span className="hr">Odaberite datum i vrijeme</span><span className="sl">Izberite datum in čas</span></p></div></div>
                <div className="mc">
                  <div className="dy"><span className="en">Mo</span><span className="hr">Po</span><span className="sl">Po</span></div><div className="dy"><span className="en">Tu</span><span className="hr">Ut</span><span className="sl">To</span></div><div className="dy"><span className="en">We</span><span className="hr">Sr</span><span className="sl">Sr</span></div><div className="dy"><span className="en">Th</span><span className="hr">Če</span><span className="sl">Če</span></div><div className="dy"><span className="en">Fr</span><span className="hr">Pe</span><span className="sl">Pe</span></div><div className="dy"><span className="en">Sa</span><span className="hr">Su</span><span className="sl">So</span></div><div className="dy"><span className="en">Su</span><span className="hr">Ne</span><span className="sl">Ne</span></div>
                  <div className="dy">10</div><div className="dy on">11</div><div className="dy on">12</div><div className="dy sel">13</div><div className="dy on">14</div><div className="dy">15</div><div className="dy">16</div>
                  <div className="dy">17</div><div className="dy on">18</div><div className="dy on">19</div><div className="dy on">20</div><div className="dy on">21</div><div className="dy">22</div><div className="dy">23</div>
                </div>
                <div className="ms"><div className="mx">09:00</div><div className="mx">10:30</div><div className="mx pk">11:00</div><div className="mx">13:00</div><div className="mx">14:30</div><div className="mx">16:00</div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="how" id="how">
          <div className="container">
            <div className="sh rv">
              <p className="sl2"><span className="en">How it works</span><span className="hr">Kako radi</span><span className="sl">Kako deluje</span></p>
              <h2 className="st"><span className="en">We build it, you fill it</span><span className="hr">Mi gradimo, vi punite</span><span className="sl">Mi zgradimo, vi napolnite</span></h2>
              <p className="sd"><span className="en">Tell us what you need. We handle the rest.</span><span className="hr">Recite nam što trebate. Mi se brinemo za ostatak.</span><span className="sl">Povejte nam, kaj potrebujete. Mi poskrbimo za ostalo.</span></p>
            </div>
            <div className="steps rv">
              <div className="step"><div className="step-top"><div className="sn">1</div><h3><span className="en">Tell Us Your Vision</span><span className="hr">Opišite nam svoju viziju</span><span className="sl">Opišite nam svojo vizijo</span></h3></div><p><span className="en">Contact us and describe how you want your booking page to look and work. Already have a website? We can integrate directly into it.</span><span className="hr">Kontaktirajte nas i opišite kako želite da vaša stranica za rezervacije izgleda i funkcionira. Već imate web stranicu? Možemo je integrirati.</span><span className="sl">Kontaktirajte nas in opišite, kako želite, da vaša stran za naročanje izgleda in deluje. Že imate spletno stran? Lahko jo integriramo.</span></p><span className="stag"><span className="en">Free consultation</span><span className="hr">Besplatna konzultacija</span><span className="sl">Brezplačno posvetovanje</span></span></div>
              <div className="step"><div className="step-top"><div className="sn">2</div><h3><span className="en">We Build It For You</span><span className="hr">Mi to izgradimo za vas</span><span className="sl">Zgradimo za vas</span></h3></div><p><span className="en">We design and develop a custom booking system tailored to your business, your brand, and your workflow. No templates, no compromises.</span><span className="hr">Dizajniramo i razvijamo prilagođeni sustav rezervacija prema vašem poslovanju, brendu i načinu rada. Bez predložaka, bez kompromisa.</span><span className="sl">Oblikujemo in razvijemo prilagojen sistem naročanja za vaše podjetje, blagovno znamko in delovni tok. Brez predlog, brez kompromisov.</span></p><span className="stag"><span className="en">Custom-built</span><span className="hr">Prilagođeno</span><span className="sl">Po meri</span></span></div>
              <div className="step"><div className="step-top"><div className="sn">3</div><h3><span className="en">Get Booked</span><span className="hr">Primajte rezervacije</span><span className="sl">Prejmite rezervacije</span></h3></div><p><span className="en">Your clients book 24/7 from any device. You get notified instantly. Reminders go out automatically. We keep everything running.</span><span className="hr">Vaši klijenti rezerviraju 24/7 s bilo kojeg uređaja. Dobivate obavijest odmah. Podsjetnici se šalju automatski. Mi održavamo sve.</span><span className="sl">Vaše stranke naročajo 24/7 z vsakega naprave. Obveščeni ste takoj. Opomniki se pošljejo samodejno. Mi skrbimo za vse.</span></p><span className="stag"><span className="en">Ongoing support</span><span className="hr">Trajna podrška</span><span className="sl">Stalna podpora</span></span></div>
            </div>
          </div>
        </section>

        <section className="pricing" id="pricing">
          <div className="container">
            <div className="sh rv">
              <p className="sl2"><span className="en">Pricing</span><span className="hr">Cijene</span><span className="sl">Cene</span></p>
              <h2 className="st"><span className="en">Simple, transparent pricing</span><span className="hr">Jednostavne, transparentne cijene</span><span className="sl">Preproste, pregledne cene</span></h2>
              <p className="sd"><span className="en">No hidden fees. No contracts. Cancel anytime.</span><span className="hr">Bez skrivenih troškova. Bez ugovora. Otkažite bilo kada.</span><span className="sl">Brez skritih stroškov. Brez pogodb. Kadarkoli odpovejte.</span></p>
            </div>
            <div className="pg rv">
              <div className="pc">
                <div className="pm"><h3>25€</h3><span><span className="en">/month</span><span className="hr">/mj.</span><span className="sl">/mes.</span></span></div>
                <div className="pe"><span className="en">+ 5€ per employee</span><span className="hr">+ 5€ po zaposleniku</span><span className="sl">+ 5€ na zaposlenega</span></div>
                <ul className="pfl">
                  <li><span className="en">Online booking 24/7</span><span className="hr">Online rezervacije 24/7</span><span className="sl">Spletno naročanje 24/7</span></li>
                  <li><span className="en">Automated email reminders</span><span className="hr">Automatski podsjetnici</span><span className="sl">Samodejni opomniki</span></li>
                  <li><span className="en">Admin dashboard</span><span className="hr">Admin nadzorna ploča</span><span className="sl">Skrbniška nadzorna plošča</span></li>
                  <li><span className="en">Customer accounts</span><span className="hr">Korisnički računi</span><span className="sl">Računi strank</span></li>
                  <li><span className="en">30-day free trial</span><span className="hr">30 dana besplatno</span><span className="sl">30 dni brezplačno</span></li>
                </ul>
                <a href="#contact" className="bp ib"><span className="en">Start Free Trial</span><span className="hr">Počnite besplatno</span><span className="sl">Začnite brezplačno</span></a>
              </div>
              <div className="roi rv">
                <div className="rs"><h3>-70%</h3><p><span className="en">Fewer no-shows</span><span className="hr">Manje nedolazaka</span><span className="sl">Manj nedohodov</span></p></div>
                <div className="rs"><h3>+27%</h3><p><span className="en">Revenue growth</span><span className="hr">Rast prihoda</span><span className="sl">Rast prihodov</span></p></div>
                <div className="rs"><h3>+30%</h3><p><span className="en">More bookings</span><span className="hr">Više rezervacija</span><span className="sl">Več rezervacij</span></p></div>
                <div className="rs"><h3>90%</h3><p><span className="en">Stay 12+ months</span><span className="hr">Ostaju 12+ mj.</span><span className="sl">Ostanejo 12+ mes.</span></p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta" id="contact">
          <div className="rv">
            <h2><span className="en">Your next client is searching <em>right now</em></span><span className="hr">Vaš sljedeći klijent traži <em>upravo sada</em></span><span className="sl">Vaša naslednja stranka išče <em>ravno zdaj</em></span></h2>
            <p><span className="en">Start your 30-day free trial today. No credit card required. First no-show report in 7 days.</span><span className="hr">Započnite besplatnu 30-dnevnu probu danas. Bez kreditne kartice. Prvi izvještaj o nedolascima za 7 dana.</span><span className="sl">Začnite 30-dnevno brezplačno preskusno obdobje danes. Brez kreditne kartice. Prvo poročilo v 7 dneh.</span></p>
            <a href="#" className="bp ib" id="cb"><span className="en">Get In Touch</span><span className="hr">Kontaktirajte nas</span><span className="sl">Kontaktirajte nas</span></a>
          </div>
        </section>

        <footer>
          <div className="fti">
            <div className="ftb"><a href="#" className="logo"><img src="/logo.png" alt="QueueUp" /></a><p><span className="en">Smart appointment booking for every business. Built in Croatia.</span><span className="hr">Pametne rezervacije termina za svaki posao. Napravljeno u Hrvatskoj.</span><span className="sl">Pametno naročanje terminov za vsako podjetje. Narejeno na Hrvaškem.</span></p></div>
            <div className="ftc"><h4><span className="en">Product</span><span className="hr">Proizvod</span><span className="sl">Izdelek</span></h4><a href="#features"><span className="en">Features</span><span className="hr">Značajke</span><span className="sl">Funkcije</span></a><a href="#industries"><span className="en">Industries</span><span className="hr">Industrije</span><span className="sl">Industrije</span></a><a href="#how"><span className="en">How It Works</span><span className="hr">Kako radi</span><span className="sl">Kako deluje</span></a></div>
            <div className="ftc"><h4><span className="en">Company</span><span className="hr">Tvrtka</span><span className="sl">Podjetje</span></h4><a href="#"><span className="en">About</span><span className="hr">O nama</span><span className="sl">O nas</span></a><a href="#contact"><span className="en">Contact</span><span className="hr">Kontakt</span><span className="sl">Kontakt</span></a></div>
            <div className="ftc"><h4><span className="en">Legal</span><span className="hr">Pravno</span><span className="sl">Pravno</span></h4><a href="/privacy"><span className="en">Privacy Policy</span><span className="hr">Privatnost</span><span className="sl">Zasebnost</span></a><a href="/cookies"><span className="en">Cookie Policy</span><span className="hr">Kolačići</span><span className="sl">Piškotki</span></a><a href="/impressum">Impressum</a></div>
          </div>
          <div className="ftm"><span>© 2026 queueup. <span className="en">All rights reserved.</span><span className="hr">Sva prava pridržana.</span><span className="sl">Vse pravice pridržane.</span></span><span>Zagreb, Croatia</span></div>
        </footer>

      </div>
    </>
  );
}
