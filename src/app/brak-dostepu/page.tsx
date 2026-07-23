export default function BrakDostepu() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="material-symbols-rounded notranslate text-[44px] text-amber-ink">
          lock
        </span>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink-strong">
          Brak dostepu
        </h1>
        <p className="mt-2 text-sm text-muted">
          To konto Google nie znajduje sie na liscie pracownikow Stowarzyszenia
          Pomost. Administrator musi najpierw dodac jego adres e-mail.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button type="submit" className="btn-primary">
            Wyloguj sie i wybierz inne konto
          </button>
        </form>
      </div>
    </div>
  );
}
