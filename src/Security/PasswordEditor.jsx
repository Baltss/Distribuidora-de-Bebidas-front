import { useState, useMemo, useEffect } from 'react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-600 mb-2';

export default function PasswordEditor({
  value,
  onChange,
  showConfirm = true,
  confirmValue = '', // 👈 nuevo
  onConfirmChange = () => {}, // 👈 nuevo
  onValidityChange = () => {} // 👈 opcional: notifica match/mismatch
}) {
  const [show, setShow] = useState(false);

  const score = useMemo(() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return Math.min(s, 4);
  }, [value]);

  const genPassword = () => {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
    let out = '';
    for (let i = 0; i < 12; i++)
      out += chars[Math.floor(Math.random() * chars.length)];
    onChange(out);
    onConfirmChange(''); // reset confirm
  };

  const mismatch =
    showConfirm && value && confirmValue && value !== confirmValue;

  useEffect(() => {
    onValidityChange(!mismatch);
  }, [mismatch, onValidityChange]);

  return (
    <div className="space-y-2">
      <label className={labelCls}>Contraseña</label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nueva contraseña (dejar vacío para no cambiar)"
          autoComplete="new-password"
          className={`${inputCls} pr-36 sm:pr-28`}
        />
        <div className="hidden sm:flex items-center gap-3 absolute inset-y-0 right-2">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-xs font-medium text-teal-600 hover:underline"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={genPassword}
            className="text-xs font-medium text-slate-500 hover:underline"
          >
            Generar
          </button>
        </div>
      </div>

      <div className="flex sm:hidden items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="font-medium text-teal-600 hover:underline"
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
        <span className="text-slate-300">·</span>
        <button
          type="button"
          onClick={genPassword}
          className="font-medium text-slate-500 hover:underline"
        >
          Generar
        </button>
      </div>

      {/* Fuerza */}
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all ${
            [
              'bg-red-500',
              'bg-amber-500',
              'bg-amber-500',
              'bg-emerald-500',
              'bg-emerald-600'
            ][score]
          }`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Usá 12+ caracteres, mayúsculas, minúsculas, números y símbolos.
      </p>

      {showConfirm && (
        <>
          <label className={labelCls}>Confirmar contraseña</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirmValue}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="Repetir contraseña"
            autoComplete="new-password"
            className={`${inputCls} ${
              mismatch ? 'border-rose-400 focus:ring-rose-400/40' : ''
            }`}
          />
          {mismatch && (
            <p className="text-xs text-rose-500">
              Las contraseñas no coinciden.
            </p>
          )}
        </>
      )}
    </div>
  );
}
