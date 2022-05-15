export type COORDINATE = [number, number];

let uid = 0;
export function getUID(): number {
  return uid++;
}

export interface PhysicalObject {
  p: COORDINATE; // Coordinates
  radius: number; // Radius
  uid: number;
}

export interface Planet extends PhysicalObject {
  m: number; // Mass
}

export interface Ship extends PhysicalObject {
  angle: number; // [0; 360[
  force: number;
}

export interface Player {
  name: string;
  color: string;
  ships: Ship[];
}

export interface Game {
  label: string;
  planets: Planet[];
  players: Player[];
}

export interface Missile {
  p: COORDINATE; // Coordinates
  v: COORDINATE; // Velocity
}

export type TRAJECTORY = COORDINATE[];

export type COMMAND = {cmd: 'START', game: Game} |
                      {cmd: 'STOP'} |
                      {cmd: 'GET'};

export type EVENT = {type: 'TRAJECTORIES', L: COORDINATE[][]} |
                    {type: 'STARTING', colors: string[]}      |
                    {type: 'ENDING'}                          |
                    {type: 'DESTROY', shipUIDs: number[]};
