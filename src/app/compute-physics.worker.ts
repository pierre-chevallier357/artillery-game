/// <reference lib="webworker" />

import { COMMAND, COORDINATE, EVENT, Game, Missile, Planet, Player, Ship } from './definitions';

function sendMessage(m: EVENT): void {
  postMessage(m);
}

let abo: any;
let coords: COORDINATE[][] = [];
addEventListener('message', ({data}: MessageEvent<COMMAND>) => {
  switch (data.cmd) {
    case 'START':
      console.log( data.game );
      const {missiles, coords: C, step} = compute(data.game);
      coords = C;
      clearInterval(abo);
      console.log('START', abo);
      abo = setInterval( () => {
        if (!step()) {
          clearInterval(abo);
          abo = undefined;
        }
       }, 4 );

      break;
    case 'STOP':
      if (abo !== undefined) {
          console.log('STOP', abo);
          clearInterval(abo);
          abo = undefined;
      }
      break;
    case 'GET':
      sendMessage( {type: 'TRAJECTORIES', L: coords} );
      if (abo === undefined) {
        sendMessage( {type: 'ENDING'} );
      }
      coords.forEach( L => L.length = 0 );
      break;
  }
});

function compute(g: Game): {missiles: Missile[], coords: COORDINATE[][], step: () => boolean} {
  // Initialise missiles
  const LPS: [Player, Ship][] = Object.values(g.players).reduce( (L, P) => [
    ...L,
    ...Object.values(P.ships).map( S => [P, S] as [Player, Ship] )
  ], [] as [Player, Ship][]);

  sendMessage( {type: 'STARTING', colors: LPS.map( ([P]) => P.color) } );

  const ships = LPS.map( ([P, S]) => S );
  const missiles: Missile[] = LPS.map( ([p, s]) => {
                                          const rad = s.angle * Math.PI / 180;
                                          const V: COORDINATE = [Math.cos(rad), Math.sin(rad)];
                                          return {
                                            p: s.p.map( (c, i) => c + (s.radius + 1) * V[i] ),
                                            v: V.map( (v, i) => v * s.force )
                                          } as Missile;
                                       });
  console.log('missiles:', missiles.map( m => ({p: m.p.slice(), v: m.v.slice()}) ) );
  // steps
  const pCoords: COORDINATE[][] = missiles.map( () => []);
  return {coords: pCoords, missiles, step: () => {
    // console.log("step");
    let LC: Undefinable<COORDINATE>[] = [];
    for (let n = 0; n < 100; n++) {
      LC = STEP(g.planets, ships, missiles, 0.01);
      for (let i = 0; i < coords.length; i++) {
        const C = LC[i];
        if (!!C) {
          coords[i].push(C);
        }
      }
    }
    return !!LC ? !!LC.find( C => !!C ) : false;
  } };
}

type Undefinable<T> = T | undefined;
// __________________________________________________________
function STEP(planets: Planet[], ships: Ship[], missiles: Undefinable<Missile>[], dt: number): Undefinable<COORDINATE>[] {
  const Lres: (COORDINATE | undefined)[] = [];

  for (let iM = 0; iM < missiles.length; iM++) {
    const m = missiles[iM];
    if (m !== undefined) {
      // Compute acceleration
      const a = computeAcceleration(planets, m.p);

      // Integrate velocity
      m.v[0] += dt * a[0];
      m.v[1] += dt * a[1];

      // Integrate position
      m.p[0] += dt * m.v[0];
      m.p[1] += dt * m.v[1];

      let toBeRemoved = false;
      // Compute collisions with ships
      for (let iS = 0; iS < ships.length; iS++) {
        const ship = ships[iS];
        const dx = ship.p[0] - m.p[0];
        const dy = ship.p[1] - m.p[1];
        if ( dx * dx + dy * dy <= ship.radius * ship.radius ) {
          toBeRemoved = true;
          ships.splice(iS, 1);
          sendMessage({type: 'DESTROY', shipUIDs: [ship.uid]})
          break;
        }
      }

      // Compute collisions with planets
      if (!toBeRemoved) {
        for (const planet of planets) {
          const dx = planet.p[0] - m.p[0];
          const dy = planet.p[1] - m.p[1];
          if ( dx * dx + dy * dy <= planet.radius * planet.radius ) {
            toBeRemoved = true;
            break;
          }
        }
      }

      // Append coordinate
      Lres.push( m.p.map( v => Math.round(10 * v) / 10 ) as COORDINATE );

      // Remove missile ?
      if (toBeRemoved) {
        missiles[iM] = undefined;
      }
    } else {
      Lres.push(undefined);
    }
  }

  return Lres;
}

const G = 1;
function computeAcceleration(planets: Planet[], pt: COORDINATE): COORDINATE {
  let ax = 0;
  let ay = 0;

  for (const planet of planets) {
    const dx = planet.p[0] - pt[0];
    const dy = planet.p[1] - pt[1];
    const dist2 = dx * dx + dy * dy;
    const A = G * planet.m / dist2;

    const dist = Math.sqrt(dist2);
    const vectPP: COORDINATE = [dx / dist, dy / dist]; // Unitary Vector Pt -> Planet

    ax += A * vectPP[0];
    ay += A * vectPP[1];
  }

  return [ax, ay];
}
