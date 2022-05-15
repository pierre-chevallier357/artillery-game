import { Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';

function getCoord(e: SVGGraphicsElement, x: number, y: number): [ x: number, y: number,
                                                                  MatrixE: DOMMatrix,
                                                                  ParentMatrix: DOMMatrix,
                                                                  ParentMatrixInverse: DOMMatrix] {
  const M0 = e.getCTM() as DOMMatrix;
  const parent = e.parentNode as SVGGraphicsElement;
  const PM = parent?.getCTM?.() ?? new DOMMatrix([1, 0, 0, 1, 0, 0]);
  const PMi = PM.inverse();
  const pt = (new DOMPoint(x, y)).matrixTransform(PMi);

  return [pt.x, pt.y, M0, PM, PMi];
}

@Directive({
  selector: '[appSvgDraggable]'
})
export class SvgDraggableDirective implements OnInit, OnDestroy {
  private pAppSvgDraggable: boolean | Element = true;
  @Input ()
  get appSvgDraggable(): boolean | Element {return this.pAppSvgDraggable;}
  set appSvgDraggable(v: boolean | Element) {
    this.pAppSvgDraggable = v;
    this.sub?.unsubscribe();
    this.ngOnInit();
  }

  @Output() svgDragEnd = new EventEmitter<DOMMatrix>();

  private sub: Subscription | undefined = undefined;

  constructor(private el: ElementRef<SVGGraphicsElement>) {
  }

  ngOnInit(): void {
    const src = typeof this.appSvgDraggable === 'boolean' ? this.el.nativeElement : this.appSvgDraggable;
    const ptrDown = fromEvent<PointerEvent>(src, 'pointerdown');
    const ptrMove = fromEvent<PointerEvent>(document, 'pointermove');
    const ptrUp   = fromEvent<PointerEvent>(document, 'pointerup');

    const drag = ptrDown.pipe(
      filter( () => !!this.appSvgDraggable ),
      switchMap(
        (evtDown: PointerEvent) => {
          const filtre = filter( (evt: PointerEvent) => evt.pointerId === evtDown.pointerId );
          const [X0, Y0, M0, PM0, PM0i] = getCoord(this.el.nativeElement, evtDown.pageX, evtDown.pageY);
          const M = PM0i.multiply(M0);
          evtDown.stopPropagation();
          return ptrMove.pipe(
            filtre,
            map( evt => getCoord(this.el.nativeElement, evt.pageX, evt.pageY) ),
            tap( ([x, y]) => {
              const [dx, dy] = [x - X0, y - Y0];
              this.el.nativeElement.setAttribute(
                'transform',
                `matrix(${M.a}, ${M.b}, ${M.c}, ${M.d}, ${M.e + dx}, ${M.f + dy})`
                );
            } ),
            takeUntil( ptrUp.pipe(filtre, tap( () => {
              const Mend   = this.el.nativeElement.getCTM()   as DOMMatrix;
              const parent = this.el.nativeElement.parentNode as SVGGraphicsElement;
              const PM = parent?.getCTM?.() ?? new DOMMatrix([1, 0, 0, 1, 0, 0]);
              const PMi = PM.inverse();
              this.svgDragEnd.emit( PMi.multiply(Mend) );
            }) ) )
          );
        }
      )
    );

    this.sub = drag.subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
