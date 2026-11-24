import { useEffect, useRef } from "react";

/* Koordinatene i tegningen (viewBox 0 0 540 440). */
const FACE = { x: 304, y: 170 };
const KNITTING = { x: 304, y: 292 };
/** så nær må pekeren være før hun ser på den, og før hun stopper å strikke */
const NEAR = 200;
const CLOSE = 78;
/** hvor langt pupillene kan flytte seg */
const REACH = 4.2;

/** Tegningen på forsiden. Hun ser ned på strikketøyet. Kommer pekeren nær, følger hun den
    med øynene, og kommer den helt oppi ansiktet, stopper hun å strikke og hever øyenbrynene. */
export function Scene() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const pupils = pupilsRef.current;
    if (!svg || !pupils) return;
    let target = KNITTING;
    const at = { x: 0, y: REACH };
    let frame = 0;
    let glance = 0;

    const toScene = (e: PointerEvent) => {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    };
    const step = () => {
      const dx = target.x - FACE.x;
      const dy = target.y - FACE.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 50) * REACH;
      const want = { x: (dx / d) * k, y: (dy / d) * k };
      at.x += (want.x - at.x) * 0.22;
      at.y += (want.y - at.y) * 0.22;
      pupils.setAttribute("transform", `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`);
      frame = Math.abs(want.x - at.x) + Math.abs(want.y - at.y) > 0.02 ? requestAnimationFrame(step) : 0;
    };
    const aim = (p: { x: number; y: number } | null) => {
      const d = p ? Math.hypot(p.x - FACE.x, p.y - FACE.y) : Infinity;
      target = p && d < NEAR ? p : KNITTING;
      svg.classList.toggle("close", d < CLOSE);
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      window.clearTimeout(glance);
      aim(toScene(e));
    };
    const onDown = (e: PointerEvent) => {
      /* på telefon finnes det ingen peker som svever: da kikker hun bort på fingeren en liten stund */
      aim(toScene(e));
      window.clearTimeout(glance);
      if (e.pointerType !== "mouse") glance = window.setTimeout(() => aim(null), 1600);
    };
    const onLeave = () => aim(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    document.documentElement.addEventListener("pointerleave", onLeave);
    aim(null);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.clearTimeout(glance);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      className="scene" ref={svgRef} viewBox="0 0 540 440" role="img"
      aria-label="En person sitter i en lenestol og strikker ved siden av en vedovn, med en kopp te på bordet og en katt som sover på gulvet."
    >
      <defs>
        <radialGradient id="stove-glow" cx="82" cy="302" r="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB45C" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
        </radialGradient>
        <pattern id="scarf-knit" width="12" height="10" patternUnits="userSpaceOnUse">
          <path d="M1.5 1.5L6 8L10.5 1.5" fill="none" stroke="#D58F1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
        </pattern>
      </defs>

      {/* en myk flekk bak, så tegningen henger sammen uten ramme */}
      <path className="blob" d="M64 252C52 130 166 44 300 50c132 6 222 92 208 212-12 100-104 148-226 142C160 398 74 352 64 252Z" />
      <ellipse className="shadow" cx="82" cy="396" rx="56" ry="9" />
      <ellipse className="shadow" cx="304" cy="397" rx="150" ry="13" />
      <ellipse className="shadow" cx="470" cy="394" rx="38" ry="7" />

      {/* vedovnen */}
      <circle className="glow" cx="82" cy="302" r="120" fill="url(#stove-glow)" />
      <rect x="72" y="92" width="20" height="150" rx="6" fill="#232046" />
      <rect x="67" y="150" width="30" height="9" rx="4" fill="#3A3768" />
      <rect x="50" y="366" width="11" height="26" rx="4" fill="#232046" />
      <rect x="103" y="366" width="11" height="26" rx="4" fill="#232046" />
      <rect x="38" y="240" width="88" height="130" rx="18" fill="#232046" />
      <rect x="32" y="232" width="100" height="15" rx="7.5" fill="#3A3768" />
      <rect x="53" y="270" width="58" height="62" rx="12" fill="#FFE9BE" />
      <g className="flames">
        <path className="flame f1" d="M82 328c-17 0-23-14-16-27 3 6 7 5 7-1 0-10 6-15 9-23 3 11 13 14 11 26 3-3 5-6 5-9 8 13 3 34-16 34z" fill="#F28B30" />
        <path className="flame f2" d="M82 328c-10 0-13-9-9-16 2 4 4 3 4-1 0-5 3-8 5-13 2 7 8 8 6 15 2-2 3-3 3-5 5 7 2 20-9 20z" fill="#F9C04A" />
      </g>
      <rect x="116" y="294" width="6" height="16" rx="3" fill="#8E8BBA" />
      <path d="M52 346h60M52 354h60" stroke="#3A3768" strokeWidth="3" strokeLinecap="round" />

      {/* katten */}
      <ellipse className="shadow" cx="170" cy="397" rx="46" ry="6" />
      <path d="M196 386q20 8-2 12-26 3-52-4" fill="none" stroke="#EBB678" strokeWidth="8" strokeLinecap="round" />
      <ellipse className="cat-body" cx="172" cy="381" rx="34" ry="15" fill="#F4C58D" />
      <path d="M162 369l3 6M174 367l1 6M186 370l-2 6" stroke="#DD9F5C" strokeWidth="3" strokeLinecap="round" />
      <circle cx="143" cy="378" r="13" fill="#F4C58D" />
      <path d="M132 371l1-12 9 7zM146 365l9-5 0 10z" fill="#F4C58D" />
      <path d="M135 379q3 2.500 6 0M146 379q3 2.500 6 0" fill="none" stroke="#7A4F2B" strokeWidth="1.800" strokeLinecap="round" />
      <path d="M141.500 383.500l2 2 2-2z" fill="#D07A66" />

      {/* lenestolen */}
      <rect x="216" y="360" width="15" height="32" rx="5" fill="#5B3A2C" />
      <rect x="377" y="360" width="15" height="32" rx="5" fill="#5B3A2C" />
      <rect x="212" y="104" width="184" height="226" rx="66" fill="#2F55B0" />
      <rect x="236" y="130" width="136" height="172" rx="46" fill="#4069C9" />
      <rect x="214" y="300" width="180" height="64" rx="20" fill="#2A4CA0" />

      {/* beina og raggsokkene */}
      <rect x="270" y="306" width="30" height="74" rx="13" fill="#232046" />
      <rect x="308" y="306" width="30" height="74" rx="13" fill="#232046" />
      <rect x="264" y="366" width="38" height="27" rx="12" fill="#FFFDF8" />
      <rect x="306" y="366" width="38" height="27" rx="12" fill="#FFFDF8" />
      <path d="M270 373h26M312 373h26" stroke="#C8365F" strokeWidth="4" strokeLinecap="round" />
      <path d="M270 381h26M312 381h26" stroke="#2F55B0" strokeWidth="3" strokeLinecap="round" />

      {/* den som strikker */}
      <rect x="262" y="204" width="84" height="108" rx="38" fill="#C8365F" />
      <rect x="294" y="194" width="20" height="18" fill="#EDBE98" />
      <circle cx="304" cy="124" r="16" fill="#4A2C2A" />
      <circle cx="304" cy="168" r="37" fill="#F5D2B3" />
      <path d="M267 170a37 37 0 0 1 74 0q-8-24-37-24t-37 24z" fill="#4A2C2A" />
      <circle cx="278" cy="186" r="6.500" fill="#EE9F8B" opacity=".5" />
      <circle cx="330" cy="186" r="6.500" fill="#EE9F8B" opacity=".5" />
      <g className="brows" stroke="#4A2C2A" strokeWidth="3.200" strokeLinecap="round" fill="none">
        <path d="M281 152q8-4.500 16-1" />
        <path d="M311 151q8-3.500 16 1" />
      </g>
      <circle cx="290" cy="171" r="8.600" fill="#fff" />
      <circle cx="318" cy="171" r="8.600" fill="#fff" />
      <g ref={pupilsRef}>
        <circle cx="290" cy="171" r="3.900" fill="#232046" />
        <circle cx="318" cy="171" r="3.900" fill="#232046" />
      </g>
      <g className="lids" fill="#F5D2B3">
        <rect x="280" y="161" width="20" height="20" rx="10" />
        <rect x="308" y="161" width="20" height="20" rx="10" />
      </g>
      <g fill="none" stroke="#232046" strokeWidth="2.800" strokeLinecap="round">
        <circle cx="290" cy="171" r="12.500" />
        <circle cx="318" cy="171" r="12.500" />
        <path d="M302.500 171h3M277.500 169l-9-3M330.500 169l9-3" />
      </g>
      <path className="mouth" d="M296 192q8 6.500 16 0" fill="none" stroke="#A8553F" strokeWidth="3" strokeLinecap="round" />

      {/* strikketøyet og garnet */}
      <path d="M236 387q22 9 46 2" fill="none" stroke="#F3B23F" strokeWidth="3" strokeLinecap="round" />
      <path d="M290 284h28l14 106q-28 7-56 0z" fill="#F3B23F" />
      <path d="M290 284h28l14 106q-28 7-56 0z" fill="url(#scarf-knit)" />
      <circle cx="224" cy="383" r="14" fill="#F3B23F" />
      <path d="M213 377q11-8 22 0M212 386q12-9 24 0M219 395q6-5 12-1" fill="none" stroke="#D58F1E" strokeWidth="2" strokeLinecap="round" />

      {/* armene, pinnene og hendene */}
      <path d="M270 228q-17 34 17 45" fill="none" stroke="#B02D53" strokeWidth="22" strokeLinecap="round" />
      <path d="M338 228q17 34-17 45" fill="none" stroke="#B02D53" strokeWidth="22" strokeLinecap="round" />
      <g className="pin pin-a">
        <path d="M262 256l72 44" stroke="#D9A66B" strokeWidth="5" strokeLinecap="round" />
        <circle cx="262" cy="256" r="5.500" fill="#B77B45" />
      </g>
      <g className="pin pin-b">
        <path d="M346 256l-72 44" stroke="#D9A66B" strokeWidth="5" strokeLinecap="round" />
        <circle cx="346" cy="256" r="5.500" fill="#B77B45" />
      </g>
      <circle cx="287" cy="272" r="10" fill="#F5D2B3" />
      <circle cx="321" cy="272" r="10" fill="#F5D2B3" />

      {/* armlenene foran */}
      <rect x="190" y="238" width="56" height="130" rx="28" fill="#24439A" />
      <rect x="362" y="238" width="56" height="130" rx="28" fill="#24439A" />

      {/* bordet med tekoppen */}
      <rect x="465" y="298" width="10" height="90" fill="#B77B45" />
      <ellipse cx="470" cy="390" rx="24" ry="6" fill="#B77B45" />
      <ellipse cx="470" cy="299" rx="42" ry="10" fill="#B77B45" />
      <ellipse cx="470" cy="294" rx="42" ry="10" fill="#D9A66B" />
      <ellipse cx="468" cy="291" rx="23" ry="5" fill="#fff" />
      <path d="M485 268q12 0 10.500 9-1.500 7-12 6" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M452 264h32v11a16 13 0 0 1-32 0z" fill="#fff" />
      <path d="M452.500 270h31v5h-31z" fill="#C8365F" />
      <ellipse cx="468" cy="264" rx="16" ry="3.600" fill="#B5651D" />
      <g fill="none" stroke="#9BB0E0" strokeWidth="3.200" strokeLinecap="round">
        <path className="steam st1" d="M462 254q-6-9 0-17t0-17" />
        <path className="steam st2" d="M475 255q6-9 0-17t0-17" />
      </g>
    </svg>
  );
}
