import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportTableComponent } from './report-table';

describe('ReportTable', () => {
  let component: ReportTableComponent;
  let fixture: ComponentFixture<ReportTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
