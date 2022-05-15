import { TestBed } from '@angular/core/testing';

import { PlaymapService } from './playmap.service';

describe('PlaymapService', () => {
  let service: PlaymapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlaymapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
