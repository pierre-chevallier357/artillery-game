import { AfterViewInit, OnInit } from '@angular/core';
import { Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { getCoordFromEvent } from './utils';

@Directive({
  selector: '[appSvgZoomable]'
})
export class SvgZoomableDirective implements OnInit, OnDestroy, AfterViewInit {
  // @Input () appSvgZoomable: boolean | Element = true;
  private pAppSvgZoomable: boolean | Element = true;
  @Input ()
  get appSvgZoomable(): boolean | Element {return this.pAppSvgZoomable;}
  set appSvgZoomable(v: boolean | Element) {
    this.pAppSvgZoomable = v;
    this.sub?.unsubscribe();
    this.ngOnInit();
  }

  private sub: Subscription | undefined = undefined;
  private svg: Element | null = null;

  constructor(private el: ElementRef<SVGGraphicsElement>) { }

  ngOnInit(): void {
    const src = typeof this.appSvgZoomable === 'boolean' ? this.el.nativeElement : this.appSvgZoomable;
    const wheelEvt = fromEvent<WheelEvent>( src, 'wheel' );
    this.sub = wheelEvt.subscribe( {next: evt => {
      evt.preventDefault();
      evt.stopPropagation();
      const z = evt.deltaY > 0 ? 0.9 : (1 / 0.9);
      const [x, y] = this.getCoordFromEvent(evt);
      // console.log(x, y);
      const M = (this.el.nativeElement.getCTM() as DOMMatrix)
                .translate( x - x * z, y - y * z )
                .scale(z);
      this.el.nativeElement.setAttribute(
        'transform',
        `matrix(${M.a}, ${M.b}, ${M.c}, ${M.d}, ${M.e}, ${M.f})`
      );
    } });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.svg = this.el.nativeElement;
    while (this.svg && this.svg.tagName.toUpperCase() !== 'SVG') {
      this.svg = this.svg.parentElement;
    }
  }

  private getCoordFromEvent(evt: WheelEvent): [number, number] {
    return getCoordFromEvent(evt, this.svg as Element, this.el.nativeElement);
  }

}
