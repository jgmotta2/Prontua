import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Smartphone, MessageCircle, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { useMfaSetup, useMfaEnable, useMfaDisable } from '../hooks/useMfa';
import type { MfaMethod, MfaSetupAppResult } from '../api/mfa.api';

interface SecuritySectionProps {
  mfaEnabled: boolean;
  mfaMethod: MfaMethod | null;
}

type Step = 'idle' | 'choose-method' | 'app-qr' | 'app-verify' | 'whatsapp-enable' | 'disable-confirm' | 'success';

export function SecuritySection({ mfaEnabled, mfaMethod }: SecuritySectionProps) {
  const [step, setStep]             = useState<Step>('idle');
  const [appSetup, setAppSetup]     = useState<MfaSetupAppResult | null>(null);
  const [code, setCode]             = useState('');
  const [disablePwd, setDisablePwd] = useState('');
  const [error, setError]           = useState('');

  const setup   = useMfaSetup();
  const enable  = useMfaEnable();
  const disable = useMfaDisable();

  const reset = () => {
    setStep('idle');
    setCode('');
    setDisablePwd('');
    setError('');
    setAppSetup(null);
  };

  const handleSetup = async (method: MfaMethod) => {
    setError('');
    try {
      const result = await setup.mutateAsync(method);
      if (result.method === 'APP') {
        setAppSetup(result);
        setStep('app-qr');
      } else {
        setStep('whatsapp-enable');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao configurar 2FA');
    }
  };

  const handleEnableApp = async () => {
    if (!appSetup) return;
    setError('');
    try {
      await enable.mutateAsync({ method: 'APP', code, secret: appSetup.secret });
      setStep('success');
    } catch (err: any) {
      setError(err?.message ?? 'Código inválido');
    }
  };

  const handleEnableWhatsApp = async () => {
    setError('');
    try {
      await enable.mutateAsync({ method: 'WHATSAPP', code: '' });
      setStep('success');
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao ativar 2FA');
    }
  };

  const handleDisable = async () => {
    setError('');
    try {
      await disable.mutateAsync(disablePwd);
      reset();
    } catch (err: any) {
      setError(err?.message ?? 'Senha incorreta');
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-soft overflow-hidden border border-emerald-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-sage/10 bg-gradient-to-r from-emerald-50/60 to-white">
        <div className={`rounded-xl p-2 ${mfaEnabled ? 'bg-emerald-100' : 'bg-sage/10'}`}>
          {mfaEnabled
            ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
            : <Shield className="h-5 w-5 text-sage-dark" />
          }
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-ink">Segurança de Nível Bancário</h2>
          <p className="text-xs text-muted">Recomendado pelo CFP para proteção de prontuários</p>
        </div>
        {mfaEnabled && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Ativo
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Idle state */}
        {step === 'idle' && (
          <>
            {!mfaEnabled ? (
              <>
                <p className="text-sm text-muted leading-relaxed">
                  Proteja os dados sensíveis dos seus pacientes contra acessos não autorizados.
                  Com o 2FA, mesmo que sua senha seja comprometida, sua conta permanece segura.
                </p>
                <button
                  onClick={() => setStep('choose-method')}
                  className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Ativar verificação em duas etapas
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">2FA ativo via {mfaMethod === 'APP' ? 'Aplicativo Autenticador' : 'WhatsApp'}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Seus dados clínicos estão protegidos com verificação em duas etapas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep('disable-confirm')}
                  className="flex items-center gap-2 text-sm text-muted hover:text-terracotta transition"
                >
                  <ShieldOff className="h-4 w-4" /> Desativar 2FA
                </button>
              </>
            )}
          </>
        )}

        {/* Choose method */}
        {step === 'choose-method' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Escolha como receber seu código:</p>
            <button
              onClick={() => handleSetup('APP')}
              disabled={setup.isPending}
              className="flex w-full items-start gap-3 rounded-xl border-2 border-sage/20 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition"
            >
              <Smartphone className="h-5 w-5 text-sage-dark mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink">Aplicativo autenticador</p>
                <p className="text-xs text-muted">Google Authenticator, Authy, etc. Mais seguro.</p>
              </div>
            </button>
            <button
              onClick={() => handleSetup('WHATSAPP')}
              disabled={setup.isPending}
              className="flex w-full items-start gap-3 rounded-xl border-2 border-sage/20 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition"
            >
              <MessageCircle className="h-5 w-5 text-sage-dark mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink">Código via WhatsApp</p>
                <p className="text-xs text-muted">Receba um código de 6 dígitos no seu número cadastrado.</p>
              </div>
            </button>
            <button onClick={reset} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}

        {/* APP: show QR code */}
        {step === 'app-qr' && appSetup && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Escaneie o QR code com Google Authenticator ou Authy:
            </p>
            <div className="flex justify-center">
              <img src={appSetup.qrCodeDataUrl} alt="QR Code 2FA" className="h-44 w-44 rounded-xl border border-sage/20" />
            </div>
            <div className="rounded-xl bg-sage/5 p-3 text-xs text-muted break-all">
              <span className="font-medium text-ink">Código manual: </span>{appSetup.secret}
            </div>
            <button
              onClick={() => setStep('app-verify')}
              className="btn-primary w-full"
            >
              Já escaniei — digitar código
            </button>
            <button onClick={reset} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}

        {/* APP: verify code */}
        {step === 'app-verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Digite o código de 6 dígitos do aplicativo:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            {error && <p className="text-sm text-terracotta">{error}</p>}
            <button
              onClick={handleEnableApp}
              disabled={code.length !== 6 || enable.isPending}
              className="btn-primary w-full"
            >
              {enable.isPending ? 'Verificando...' : 'Confirmar e ativar 2FA'}
            </button>
            <button onClick={() => setStep('app-qr')} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              ← Voltar para o QR code
            </button>
          </div>
        )}

        {/* WhatsApp: confirm enable */}
        {step === 'whatsapp-enable' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              Ao fazer login, você receberá um código de 6 dígitos no seu WhatsApp cadastrado.
            </div>
            {error && <p className="text-sm text-terracotta">{error}</p>}
            <button
              onClick={handleEnableWhatsApp}
              disabled={enable.isPending}
              className="btn-primary w-full"
            >
              {enable.isPending ? 'Ativando...' : 'Ativar 2FA via WhatsApp'}
            </button>
            <button onClick={reset} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-ink">2FA ativado com sucesso!</p>
              <p className="text-sm text-muted mt-1">Seus prontuários agora têm proteção extra.</p>
            </div>
            <button onClick={reset} className="btn-primary w-full">Concluído</button>
          </div>
        )}

        {/* Disable confirm */}
        {step === 'disable-confirm' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              Ao desativar o 2FA, sua conta ficará protegida apenas pela senha.
            </div>
            <div>
              <label className="label">Confirme com sua senha atual</label>
              <input
                type="password"
                value={disablePwd}
                onChange={(e) => setDisablePwd(e.target.value)}
                className="input"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-terracotta">{error}</p>}
            <button
              onClick={handleDisable}
              disabled={!disablePwd || disable.isPending}
              className="w-full rounded-xl bg-terracotta/90 px-4 py-2.5 font-semibold text-sm text-white hover:bg-terracotta transition disabled:opacity-60"
            >
              {disable.isPending ? 'Desativando...' : 'Desativar 2FA'}
            </button>
            <button onClick={reset} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
