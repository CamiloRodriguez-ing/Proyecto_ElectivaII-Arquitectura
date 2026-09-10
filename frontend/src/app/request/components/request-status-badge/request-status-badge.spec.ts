import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestStatusBadge } from './request-status-badge';

describe('RequestStatusBadge', () => {
  let component: RequestStatusBadge;
  let fixture: ComponentFixture<RequestStatusBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestStatusBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestStatusBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
