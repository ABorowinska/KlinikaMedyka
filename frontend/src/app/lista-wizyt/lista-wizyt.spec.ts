import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaWizytComponent }from './lista-wizyt';

describe('ListaWizyt', () => {
  let component: ListaWizytComponent;
  let fixture: ComponentFixture<ListaWizytComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaWizytComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaWizytComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
