import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FirePoint } from '../../models';

@Component({
  selector: 'app-firms-points',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './firms-points.component.html'
})
export class FirmsPointsComponent {
  private readonly api = inject(ApiService);
  readonly points = signal<FirePoint[]>([]);
  readonly error = signal(false);

  constructor() {
    this.api.getFirms().subscribe({
      next: (f) => this.points.set(f.points),
      error: () => this.error.set(true)
    });
  }

  conf(code: string): string {
    return this.api.confidenceLabel(code);
  }
}
