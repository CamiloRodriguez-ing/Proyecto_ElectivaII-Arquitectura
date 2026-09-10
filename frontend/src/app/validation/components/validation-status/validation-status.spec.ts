import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidationStatus } from './validation-status';

describe('ValidationStatus', () => {
  let component: ValidationStatus;
  let fixture: ComponentFixture<ValidationStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationStatus],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
