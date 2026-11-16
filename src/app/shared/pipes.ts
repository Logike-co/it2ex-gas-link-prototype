import { Pipe, PipeTransform } from '@angular/core';
import { formatDateTime, formatKg, formatMoney } from '../core/simulation/format';

/** `$ 1.000.000` */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : formatMoney(value);
  }
}

/** Décimas de kilo → `235,6 kg`. */
@Pipe({ name: 'kg' })
export class KgPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : formatKg(value);
  }
}

/** `mié 18 nov · 9:15 a. m.` */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDateTime(value);
  }
}
