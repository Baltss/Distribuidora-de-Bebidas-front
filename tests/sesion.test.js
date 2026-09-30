import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno de navegador mínimo para probar sesion.js.
function prepararNavegador({ token = 'abc' } = {}) {
  const storage = new Map(token ? [['authToken', token], ['userLevel', 'socio']] : []);
  globalThis.sessionStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    removeItem: (k) => storage.delete(k),
    setItem: (k, v) => storage.set(k, v)
  };
  const destinos = [];
  globalThis.window = { location: { assign: (u) => destinos.push(u) } };
  return { storage, destinos };
}

// Un "axios" con sólo lo que usa sesion.js: registra el manejador de errores de respuesta.
const axiosFalso = () => {
  const inst = { onError: null, interceptors: { response: { use: (ok, err) => { inst.onError = err; } } } };
  return inst;
};

test('un 401 con sesión iniciada limpia la sesión y manda al login una sola vez', async () => {
  const { storage, destinos } = prepararNavegador();
  const { instalarManejoDeSesion } = await import('../src/utils/sesion.js');
  const axios = axiosFalso();
  instalarManejoDeSesion(axios);

  await assert.rejects(() => axios.onError({ response: { status: 401 } }));
  await assert.rejects(() => axios.onError({ response: { status: 401 } }));
  assert.deepEqual(destinos, ['/login']);
  assert.equal(storage.has('authToken'), false);
  assert.equal(storage.has('userLevel'), false);
});

test('un 403 (falta de permiso) o un error de red no cierran la sesión', async () => {
  const { storage, destinos } = prepararNavegador();
  const { instalarManejoDeSesion } = await import('../src/utils/sesion.js');
  const axios = axiosFalso();
  instalarManejoDeSesion(axios);

  await assert.rejects(() => axios.onError({ response: { status: 403 } }));
  await assert.rejects(() => axios.onError({ message: 'Network Error' }));
  assert.deepEqual(destinos, []);
  assert.equal(storage.get('authToken'), 'abc');
});
