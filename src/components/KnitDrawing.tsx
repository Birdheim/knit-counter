import { useId, useLayoutEffect, useRef, useState } from "react";
import { profile, type Segment } from "../lib/pattern";
import type { Project } from "../lib/types";

/** En strikkepinne fra knotten (x1,y1) til spissen (x2,y2). */
function Needle({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = x2 - ux * 16;
  const by = y2 - uy * 16;
  const px = -uy * 4;
  const py = ux * 4;
  return (
    <g>
      <line className="needle" x1={x1} y1={y1} x2={bx} y2={by} />
      <polygon className="needle-tip" points={`${bx + px},${by + py} ${bx - px},${by - py} ${x2},${y2}`} />
      <circle className="needle-end" cx={x1} cy={y1} r={7.5} />
    </g>
  );
}

/** Arbeidet som henger på pinnen. Bredden følger antall masker og lengden følger radene,
    så det får formen til det du har strikket så langt. */
export function KnitDrawing({ project, segs }: { project: Project; segs: Segment[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const patternId = useId();
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { w: W, h: H } = size;
  if (W < 60 || H < 50) return <svg className="knit" ref={ref} aria-hidden="true" />;

  const count = project.count;
  const maxSt = segs.reduce((m, s) => Math.max(m, s.start, s.end), project.castOn);
  const cx = W / 2;
  const top = H >= 150 ? 42 : 32;
  const rise = top - 9;
  const widest = Math.max(60, Math.min(W - 112, 250));
  const perStitch = Math.min(13, widest / maxSt);
  const half = (st: number) => Math.max(12, (st * perStitch) / 2);
  const pts = profile(project, segs);
  const hw = half(pts[pts.length - 1][1]);
  const rowH = count ? Math.min(6, (H - top - 10) / count) : 0;
  const needleLen = Math.min(W - 16, widest + 96);

  let shape = "";
  if (count) {
    const left: string[] = [];
    const right: string[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const y = (top + (count - pts[i][0]) * rowH).toFixed(1);
      const h = half(pts[i][1]);
      left.push(`${(cx - h).toFixed(1)},${y}`);
      right.unshift(`${(cx + h).toFixed(1)},${y}`);
    }
    shape = [...left, ...right].join(" ");
  }
  const loops = Math.max(2, Math.round((hw * 2) / 11));
  const step = (hw * 2) / loops;

  return (
    <svg className="knit" ref={ref} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <Needle x1={cx - needleLen / 2} y1={top} x2={cx + needleLen / 2} y2={top} />
      {shape && (
        <>
          <defs>
            <pattern id={patternId} width="12" height="10" patternUnits="userSpaceOnUse" patternTransform={`translate(${cx % 12} ${top})`}>
              <path className="vv" d="M1.5 1.5 L6 8 L10.5 1.5" />
            </pattern>
          </defs>
          <polygon className="cloth" points={shape} />
          <polygon className="cloth-knit" points={shape} fill={`url(#${patternId})`} />
        </>
      )}
      {Array.from({ length: loops }, (_, j) => (
        <rect key={j} className="loop" x={cx - hw + (j + 0.5) * step - 4} y={top - 7} width="8" height="14" rx="4" />
      ))}
      {/* arbeidspinnen, på vei inn i den siste masken */}
      <Needle x1={cx + hw + 44} y1={top - rise} x2={cx + hw - 30} y2={top + rise * 0.58} />
    </svg>
  );
}
