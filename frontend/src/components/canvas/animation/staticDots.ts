export function updateStaticDots(svg: SVGSVGElement, t: number, isSequence: boolean) {
  const dots = svg.querySelectorAll('.flow-dot[data-path-id]');
  dots.forEach(dot => {
    const pathId = dot.getAttribute('data-path-id');
    if (!pathId) return;
    const begin = dot.getAttribute('data-begin') || '0s';
    const path = svg.getElementById(pathId) as SVGPathElement | null;
    if (path) {
      try {
        const len = path.getTotalLength();
        if (isSequence) {
          const dur = 1.5;
          const frac = (t % dur) / dur;
          const pt = path.getPointAtLength(len * frac);
          dot.setAttribute('cx', String(pt.x));
          dot.setAttribute('cy', String(pt.y));
        } else {
          const startOffset = begin.startsWith('-1.25') ? 1.25 : 0;
          const dur = 2.5;
          const frac = ((t + startOffset) % dur) / dur;
          const pt = path.getPointAtLength(len * frac);
          dot.setAttribute('cx', String(pt.x));
          dot.setAttribute('cy', String(pt.y));
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
}
