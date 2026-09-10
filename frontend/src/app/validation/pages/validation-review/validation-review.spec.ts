import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidationReview } from './validation-review';

describe('ValidationReview', () => {
  let component: ValidationReview;
  let fixture: ComponentFixture<ValidationReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationReview],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
