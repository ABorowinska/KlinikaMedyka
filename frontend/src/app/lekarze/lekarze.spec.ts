import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lekarze } from './lekarze';

describe('Lekarze', () => {
  let component: Lekarze;
  let fixture: ComponentFixture<Lekarze>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lekarze]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Lekarze);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
