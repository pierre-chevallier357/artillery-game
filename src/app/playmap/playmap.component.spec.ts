import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaymapComponent } from './playmap.component';

describe('PlaymapComponent', () => {
  let component: PlaymapComponent;
  let fixture: ComponentFixture<PlaymapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaymapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlaymapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
