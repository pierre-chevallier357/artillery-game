export function getCoordFromEvent(evt: MouseEvent | PointerEvent, svg: Element, r?: SVGGraphicsElement): [number, number] {
  const box = svg.getBoundingClientRect() as DOMRect;
  const M = r?.getCTM();
  let pt = (new DOMPoint(
    evt.pageX - window.scrollX - box.x,
    evt.pageY - window.scrollY - box.y
  ) );
  if (!!M) {
    pt = pt.matrixTransform( M.inverse() );
  }
  return [pt.x, pt.y];
}
