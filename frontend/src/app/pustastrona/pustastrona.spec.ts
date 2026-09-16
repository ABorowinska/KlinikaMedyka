import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pustastrona } from './pustastrona';

describe('Pustastrona', () => {
  let component: Pustastrona;
  let fixture: ComponentFixture<Pustastrona>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pustastrona]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pustastrona);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
