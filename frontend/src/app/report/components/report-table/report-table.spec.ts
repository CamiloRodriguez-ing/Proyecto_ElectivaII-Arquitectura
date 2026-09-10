import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportTable } from './report-table';

describe('ReportTable', () => {
  let component: ReportTable;
  let fixture: ComponentFixture<ReportTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTable],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
