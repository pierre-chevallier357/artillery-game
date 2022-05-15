import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, Observable, of, Subscription } from 'rxjs';
import { endWith, filter, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { COORDINATE, Game, getUID, PhysicalObject, Planet, Player, Ship } from '../definitions';
import { PlaymapService } from '../playmap.service';
import { getCoordFromEvent } from '../utils';

type MODE = 'Move' | 'AddPlanet' | 'Delete';
interface GameHCI extends Game {
  mode: MODE;
  edition: boolean;
  selectedShip: Ship | undefined;
}

@Component({
  selector: 'app-playmap',
  templateUrl: './playmap.component.html',
  styleUrls: ['./playmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaymapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('svgE') svgE!: ElementRef<HTMLElement>;
  @ViewChild('root') root!: ElementRef<SVGGraphicsElement>;
  readonly mode = new BehaviorSubject<MODE>('AddPlanet');
  readonly editionSubj = new BehaviorSubject<boolean>(true);
  readonly trajectoriesObs: Observable<string[]>;
  readonly selectedShipUIDSubj = new BehaviorSubject<number>(-1);

  readonly gameObs: Observable<GameHCI>;
  newPlanetSubj = new BehaviorSubject<Planet | undefined>(undefined);
  private subInteraction: Subscription | undefined = undefined;

  constructor(private GS: PlaymapService) {
    this.trajectoriesObs = this.GS.trajectoriesObs.pipe(
      map( LLC => LLC.map( LC => LC.map(c => c.join()).join(' ') ) )
    );

    // All we need about the game and the HCI
    this.gameObs = combineLatest([this.GS.gameObs, this.mode, this.editionSubj, this.selectedShipUIDSubj]).pipe(
      map( ([g, mode, edition, selectedShipId]) => ({
        ...g,
        mode, edition,
        selectedShip: g.players.reduce( (L, S) => [...L, ...S.ships], [] as Ship[])
                               .find( S => S.uid === selectedShipId)
      }))
    );
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    const ptrD = fromEvent<PointerEvent>(this.svgE.nativeElement, 'pointerdown');
    const ptrM = fromEvent<PointerEvent>(window, 'pointermove');
    const ptrU = fromEvent<PointerEvent>(window, 'pointerup'  );

    const obsNewPlanet: Observable<Planet> = ptrD.pipe(
      switchMap( evtD => {
        const uid = getUID();
        const p = getCoordFromEvent(evtD, this.svgE.nativeElement, this.root.nativeElement);
        const f = filter( (e: PointerEvent) => e.pointerId === evtD.pointerId );
        return ptrM.pipe(
          f,
          map( evtM => {
            const p2 = getCoordFromEvent(evtM, this.svgE.nativeElement, this.root.nativeElement);
            const [dx, dy] = p.map( (x, i) => x - p2[i] );
            const radius = Math.sqrt(dx * dx + dy * dy);
            const P: Planet = {uid, p, radius, m: radius * radius * 4};
            this.newPlanetSubj.next( P );
            return P;
          }),
          takeUntil( ptrU.pipe(f, tap( () => {
            const P = this.newPlanetSubj.value as Planet;
            if (!!P) {
              this.GS.appendPlanet(P);
            }
            this.newPlanetSubj.next(undefined);
          })) )
        );
      })
    );

    this.subInteraction = this.mode.pipe(
      switchMap( m => {
        switch (m) {
          case 'AddPlanet': return obsNewPlanet;
          default: return of();
        }
      })
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.subInteraction?.unsubscribe();
  }

  endDragPlanet(P: Planet, C: Element, M: DOMMatrix): void {
    // console.log('endDragPlanet', P, M);
    const pt0 = new DOMPoint(0, 0);
    const pt = pt0.matrixTransform(M);
    C.setAttribute('transform', '');
    this.GS.updatePlanet(P, {p: [P.p[0] + pt.x, P.p[1] + pt.y].map(
      x => Math.round(1000 * x) / 1000
    ) as COORDINATE });
  }

  load(): void {
    this.GS.load();
  }

  start(): void {
    this.GS.start();
  }

  stop(): void {
    this.GS.stop();
  }

  get colors(): string[] {
    return this.GS.colors;
  }

  isSelected(S: Ship): boolean {
    return S.uid === this.selectedShipUIDSubj.value;
  }

  updateShipFire(S: Ship, p: {angle: number, force: number}): void {
    this.GS.updateShip(S, p);
  }

  trackByUID(i: number, e: PhysicalObject): number {
    return e.uid;
  }

  trackByIndex(i: number): number {
    return i;
  }

}
