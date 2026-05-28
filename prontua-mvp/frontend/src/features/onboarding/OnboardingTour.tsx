import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const STORAGE_KEY = 'prontua_tour_done';

export function useOnboardingTour() {
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Espera o DOM estar pintado antes de iniciar
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Próximo →',
        prevBtnText: '← Anterior',
        doneBtnText: 'Começar!',
        animate: true,
        smoothScroll: true,
        overlayColor: '#2D3B36',
        overlayOpacity: 0.55,
        popoverClass: 'prontua-tour-popover',
        onDestroyStarted: () => {
          localStorage.setItem(STORAGE_KEY, '1');
          driverObj.destroy();
        },
        steps: [
          {
            popover: {
              title: '👋 Bem-vindo ao Prontua!',
              description:
                'Este é o seu painel de controle. Vamos fazer um tour rápido para você conhecer tudo. Leva menos de 1 minuto!',
              side: 'over',
              align: 'center',
            },
          },
          {
            element: '#tour-kpis',
            popover: {
              title: '📊 Indicadores da clínica',
              description:
                'Aqui você vê em tempo real: sessões de hoje, desta semana, o que já foi faturado no mês e o que ainda está em aberto.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-chart',
            popover: {
              title: '💰 Receita mensal',
              description:
                'Gráfico com os últimos 6 meses de faturamento. Cada barra representa o total de pagamentos recebidos naquele mês.',
              side: 'top',
              align: 'start',
            },
          },
          {
            element: '#tour-agenda',
            popover: {
              title: '📅 Agenda de hoje',
              description:
                'Todas as sessões do dia aparecem aqui — com horário, paciente, modalidade e status. Clique no nome do paciente para ver o prontuário.',
              side: 'top',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-pacientes',
            popover: {
              title: '👥 Pacientes',
              description:
                'Cadastre e gerencie seus pacientes. Para cada um você define o valor por sessão, frequência e dados de contato.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-agenda',
            popover: {
              title: '🗓 Agenda',
              description:
                'Agende sessões para qualquer dia. Ao criar uma sessão, o valor é registrado automaticamente como "a receber" no Financeiro.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-financeiro',
            popover: {
              title: '💵 Financeiro',
              description:
                'Veja todos os pagamentos pendentes e recebidos. Clique em "Recebido" para confirmar o pagamento de uma sessão — escolhendo PIX, cartão ou dinheiro.',
              side: 'right',
              align: 'start',
            },
          },
          {
            popover: {
              title: '✅ Tudo pronto!',
              description:
                'Comece cadastrando seu primeiro paciente e agendando uma sessão. O tour pode ser revisitado em Configurações a qualquer momento.',
              side: 'over',
              align: 'center',
            },
          },
        ],
      });

      driverObj.drive();
    }, 800);

    return () => clearTimeout(timer);
  }, []);
}
