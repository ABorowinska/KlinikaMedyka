import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pacjenci } from './pacjenci';

describe('Pacjenci', () => {
  let component: Pacjenci;
  let fixture: ComponentFixture<Pacjenci>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pacjenci]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pacjenci);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
