import { useEffect } from 'react';
import { driver } from 'driver.js';

const TOUR_KEY = 'prontua_tour_done';

export function AppTour() {
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Começar!',
      popoverClass: 'prontua-tour',
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, 'true');
        driverObj.destroy();
      },
      steps: [
        {
          popover: {
            title: 'Bem-vindo ao Prontua! 🌿',
            description: 'Seu sistema de gestão clínica. Vamos conhecer as principais funcionalidades em menos de 1 minuto.',
            side: 'over',
            align: 'center',
          },
        },
        {
          element: '#tour-nav-pacientes',
          popover: {
            title: 'Pacientes',
            description: 'Cadastre e gerencie todos os seus pacientes. Acesse prontuários, histórico de sessões e evolução de humor.',
            side: 'right',
          },
        },
        {
          element: '#tour-nav-agenda',
          popover: {
            title: 'Agenda',
            description: 'Visualize e agende sessões. Acesse prontuários diretamente da agenda com um clique.',
            side: 'right',
          },
        },
        {
          element: '#tour-nav-financeiro',
          popover: {
            title: 'Financeiro',
            description: 'Controle pagamentos, veja o que está pendente e exporte relatórios em CSV.',
            side: 'right',
          },
        },
        {
          popover: {
            title: 'Atalhos de teclado',
            description: 'Use <kbd style="background:#eee;padding:2px 6px;border-radius:4px;font-family:monospace">N</kbd> para nova sessão, <kbd style="background:#eee;padding:2px 6px;border-radius:4px;font-family:monospace">/</kbd> para buscar, <kbd style="background:#eee;padding:2px 6px;border-radius:4px;font-family:monospace">P A F</kbd> para navegar.',
            side: 'over',
            align: 'center',
          },
        },
        {
          popover: {
            title: 'Tudo pronto! 🎉',
            description: 'O Prontua salva automaticamente seus prontuários e protege todos os dados clínicos com criptografia. Qualquer dúvida, acesse Configurações.',
            side: 'over',
            align: 'center',
          },
        },
      ],
    });

    // Pequeno delay para garantir que a página carregou
    const timer = setTimeout(() => driverObj.drive(), 1000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
