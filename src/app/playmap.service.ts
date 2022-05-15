import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { COMMAND, COORDINATE, EVENT, Game, getUID, Planet, Player, Ship } from './definitions';

@Injectable({
  providedIn: 'root'
})
export class PlaymapService {
  private worker: Worker = new Worker('./compute-physics.worker', { type: 'module' });
  private gameSubj = new BehaviorSubject<Game>({
    planets: [],
    players: [],
    label: 'Empty game'
  });
  private trajectoriesSubj = new BehaviorSubject<COORDINATE[][]>([]);
  public gameObs = this.gameSubj.asObservable();
  public trajectoriesObs = this.trajectoriesSubj.asObservable();

  private startS = new Subject<void>();
  private stopS  = new Subject<void>();
  private metronome = this.startS.pipe(
    switchMap( () => timer(0, 15).pipe( takeUntil( this.stopS ) ) )
  );
  colors: string[] = [];

  constructor() {
    this.load();
    this.metronome.subscribe( {
      next: () => {
        const cmd: COMMAND = {cmd: 'GET'};
        this.worker.postMessage(cmd);
      }
    } );
  }

  start(): void {
    const cmd: COMMAND = {cmd: 'START', game: this.gameSubj.value};
    this.trajectoriesSubj.next(
      Object.values(this.gameSubj.value.players)
            .reduce( (L, P) => [
                        ...L,
                        ...Object.values(P.ships)
                      ], [] as Ship[])
            .map( s => [] )
    );
    this.worker.postMessage( cmd );
    this.worker.onmessage = ({ data }: MessageEvent<EVENT>) => {
      switch (data.type) {
        case 'STARTING':
          this.colors = data.colors;
          break;
        case 'TRAJECTORIES':
          this.trajectoriesSubj.value.forEach(
            (t, i) => {
              const D = data.L[i];
              t.push(...D.filter( (_, j) => j % 50 === 0) );
              t.splice(0, Math.max(0, t.length - 1000));
              if (D.length > 0) {
                t.push( D[D.length - 1] );
              }
          } );
          this.trajectoriesSubj.next( this.trajectoriesSubj.value );
          break;
        case 'ENDING':
          this.stopS.next();
          break;
        case 'DESTROY':
          const Luid = data.shipUIDs;
          const G = this.gameSubj.value;
          this.gameSubj.next({
            ...G,
            players: G.players.map(
              P => ({
                ...P,
                ships: P.ships.filter( s => Luid.indexOf(s.uid) === -1 )
              })
            )
          });
          break;
      }
    };
    this.startS.next();
  }

  stop(): void {
    this.worker.postMessage( {cmd: 'STOP'} as COMMAND );
    this.stopS.next();
  }

  load(): void {
    this.gameSubj.next({
      label: 'Jeu pipo',
      players: [
        {name: 'Player 1', color: 'red', ships: [
          {uid: getUID(), p: [0, 100], radius: 5, force: 29, angle: 45},
          {uid: getUID(), p: [100, 0], radius: 5, force: 25, angle: 0}
        ]},
        {name: 'Player 2', color: 'blue', ships: [
          {uid: getUID(), p: [245, 145], radius: 5, force: 15, angle: 90},
        ]}
      ],
      planets: [
        {uid: getUID(), p: [0, 0], radius: 100, m: 40000},
        {uid: getUID(), p: [200, 100], radius: 50, m: 10000},
      ]
    });
  }

  appendPlanet(P: Planet): void {
    const G = this.gameSubj.value;
    this.gameSubj.next({
      ...G,
      planets: [...G.planets, P]
    });
  }

  updatePlanet(P: Planet, u: Partial<Planet>): void {
    const G = this.gameSubj.value;
    this.gameSubj.next({
      ...G,
      planets: G.planets.map( p => p === P ? {...P, ...u} : p)
    });
  }

  updateShip(S: Ship, u: Partial<Ship>): void {
    const G  = this.gameSubj.value;
    const P: Player = G.players.find( p => p.ships.find( s => s === S) ) as Player;
    this.gameSubj.next({
      ...G,
      players: G.players.map( p => p === P ? {
        ...P,
        ships: P.ships.map( s => s === S ? {...S, ...u} : s )
      } : p)
    });
  }

}
