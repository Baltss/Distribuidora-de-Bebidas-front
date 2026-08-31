import { useState, useMemo, useEffect } from 'react';

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
      <label className="block text-sm font-medium text-gray-700">
        Contraseña
      </label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nueva contraseña (dejar vacío para no cambiar)"
          autoComplete="new-password"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 pr-36 sm:pr-28"
        />
        <div className="hidden sm:flex items-center gap-3 absolute inset-y-0 right-2">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-xs text-indigo-600 hover:underline"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={genPassword}
            className="text-xs text-gray-600 hover:underline"
          >
            Generar
          </button>
        </div>
      </div>

      <div className="flex sm:hidden items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-indigo-600 hover:underline"
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
        <span className="text-slate-600">·</span>
        <button
          type="button"
          onClick={genPassword}
          className="text-gray-600 hover:underline"
        >
          Generar
        </button>
      </div>

      {/* Fuerza */}
      <div className="h-1 w-full bg-gray-200 rounded">
        <div
          className={`h-1 rounded ${
            [
              'bg-red-500',
              'bg-yellow-500',
              'bg-yellow-500',
              'bg-green-500',
              'bg-green-600'
            ][score]
          }`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Usá 12+ caracteres, mayúsculas, minúsculas, números y símbolos.
      </p>

      {showConfirm && (
        <>
          <label className="block text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <input
            type={show ? 'text' : 'password'}
            value={confirmValue}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="Repetir contraseña"
            autoComplete="new-password"
            className={`w-full px-4 py-2 rounded-lg border ${
              mismatch ? 'border-rose-400' : 'border-gray-300'
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
