import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Audyt } from './audyt';

describe('Audyt', () => {
  let component: Audyt;
  let fixture: ComponentFixture<Audyt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audyt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Audyt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
