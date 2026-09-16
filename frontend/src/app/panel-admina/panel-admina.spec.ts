import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelAdminaComponent } from './panel-admina';

describe('PanelAdmina', () => {
  let component: PanelAdminaComponent;
  let fixture: ComponentFixture<PanelAdminaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelAdminaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelAdminaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
