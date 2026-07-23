export function normalizujEmailZespolu(email: string): string {
  return email.trim().toLowerCase();
}

export function poprawnyEmailZespolu(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizujEmailZespolu(email));
}
