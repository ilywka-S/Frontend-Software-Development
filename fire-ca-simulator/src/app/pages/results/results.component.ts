import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { RunRecord } from '../../models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './results.component.html'
})
export class ResultsComponent {
  private readonly api = inject(ApiService);
  readonly runs = signal<RunRecord[]>([]);
  readonly error = signal(false);
  // останні 12 запусків у хронологічному порядку для діаграми
  readonly chart = computed(() => [...this.runs()].reverse().slice(-12));

  constructor() {
    this.api.listRuns().subscribe({
      next: (r) => this.runs.set(r),
      error: () => this.error.set(true)
    });
  }
}
