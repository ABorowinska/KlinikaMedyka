import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kalendarz } from './kalendarz';

describe('Kalendarz', () => {
  let component: Kalendarz;
  let fixture: ComponentFixture<Kalendarz>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Kalendarz]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Kalendarz);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
