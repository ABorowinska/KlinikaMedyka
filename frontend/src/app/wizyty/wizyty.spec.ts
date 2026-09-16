import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Wizyty } from './wizyty';

describe('Wizyty', () => {
  let component: Wizyty;
  let fixture: ComponentFixture<Wizyty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wizyty]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Wizyty);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
