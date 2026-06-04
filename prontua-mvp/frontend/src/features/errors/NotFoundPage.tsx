import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-cream text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sage/10 mb-6">
        <FileQuestion className="h-10 w-10 text-sage" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-4xl font-semibold text-ink mb-2">404</h1>
      <p className="text-lg text-muted mb-1">Página não encontrada</p>
      <p className="text-sm text-muted/70 mb-8 max-w-sm">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        to="/painel"
        className="btn-primary flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Link>
    </div>
  );
}
