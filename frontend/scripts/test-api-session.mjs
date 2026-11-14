import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '({})')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
let requestInterceptor, responseError
let token = 'old', lookups = 0, retries = 0
const client = async (config) => { retries++; return requestInterceptor(config) }
client.interceptors = {
  request: { use(fn) { requestInterceptor = fn } },
  response: { use(ok, fail) { responseError = fail } },
}
const axios = {
  create: () => client,
  get: async () => { lookups++; return { data: { csrfToken: token } } },
  post: async () => { token = 'new'; return { data: {} } },
}
const session = { isSessionIdleExpired: () => false, refreshAuthSession() {}, clearAuthSession() {}, markSessionExpired() {} }
vm.runInNewContext(compiled, {
  exports: {}, require: (name) => name === 'axios' ? { default: axios } : session,
  window: { location: { hostname: 'localhost', pathname: '/freights', assign() { throw new Error('Unexpected redirect') } } },
  document: { cookie: '' },
})
const config = () => ({ method: 'put', url: '/operational-freights/test', headers: {} })
assert.equal((await requestInterceptor(config())).headers['X-CSRF-Token'], 'old')
const renewed = await responseError({ response: { status: 401 }, config: config() })
assert.equal(renewed.headers['X-CSRF-Token'], 'new')
assert.equal(lookups, 2, 'refresh must invalidate cached CSRF token')
token = 'other-tab'
const csrfError = { response: { status: 403, data: { detail: 'Requisicao nao autorizada' } }, config: config() }
const recovered = await responseError(csrfError)
assert.equal(recovered.headers['X-CSRF-Token'], 'other-tab')
const beforeRetry = retries
await assert.rejects(responseError(csrfError))
assert.equal(retries, beforeRetry, 'CSRF retry must happen only once')
await assert.rejects(responseError({ response: { status: 403, data: { detail: 'Sem permissao para fretes' } }, config: config() }))
assert.equal(retries, beforeRetry, 'permission denial must not be retried')
console.log('Passed: session renewal, stale CSRF recovery, retry limit, permission denial')
