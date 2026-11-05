const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const i18next = require('i18next')
const code = ts.transpileModule(fs.readFileSync('components/CategoryOrganizationReview.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText
const nodes = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)]

async function harness(lang, ok = true) {
  const i18n = i18next.createInstance()
  await i18n.init({ lng: lang, resources: { [lang]: { translation: JSON.parse(fs.readFileSync(`public/locales/${lang}/common.json`)) } } })
  const states = [], requests = []
  let index = 0, loads = 0
  const ref = { current: { open: false, scrollIntoView() {}, querySelector() { return { focus() {} } } } }
  const react = { useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], v => states[i] = typeof v === 'function' ? v(states[i]) : v] },
    useRef: () => ref, useEffect() {} }
  const jsx = (type, props) => ({ type, props })
  const ctx = { exports: {}, process: { env: { NEXT_PUBLIC_API_URL: 'http://test' } },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok } },
    require(name) {
      if (name === 'react') return { default: react }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'react-i18next') return { useTranslation: () => ({ t: i18n.t.bind(i18n) }) }
      if (name === '../lib/supabase') return { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } } }
      throw Error(name)
    }
  }
  vm.runInNewContext(code, ctx)
  const props = { projectId: 'p', ready: true, loadTopics: async () => { loads++ }, topics: [
    { id: 'a', topic: 'Example', system_category: 'to_organize', review_categories: ['Empty category'] }
  ] }
  return { render: () => { index = 0; return ctx.exports.default(props) }, props, requests, ref, loads: () => loads }
}

for (const lang of ['en', 'it']) test(`${lang}: exact count, navigation, reassignment and empty review removal`, async () => {
  const h = await harness(lang)
  const all = nodes(h.render())
  const notice = all.find(n => n.props?.role === 'status').props.children
  assert.ok(notice.includes('1'))
  assert.ok(!notice.includes('categoryReview'))
  all.find(n => n.type === 'button').props.onClick()
  assert.equal(h.ref.current.open, true)
  assert.equal(all.find(n => n.type === 'option' && n.props.value === 'Empty category').props.children, 'Empty category')
  all.find(n => n.type === 'select').props.onChange({ target: { value: 'Empty category' } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.requests[0].options.method, 'PATCH')
  assert.equal(JSON.parse(h.requests[0].options.body).category, 'Empty category')
  assert.equal(h.loads(), 1)
  assert.equal(h.render(), null)
})
test('failure keeps topic visible and shows localized error; processing hides completion', async () => {
  const h = await harness('en', false)
  nodes(h.render()).find(n => n.type === 'select').props.onChange({ target: { value: 'Empty category' } })
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(nodes(h.render()).some(n => n.props?.role === 'alert'))
  assert.ok(nodes(h.render()).some(n => n.type === 'select'))
  h.props.ready = false
  assert.equal(h.render(), null)
})
test('Study Mode disables reassignment', async () => {
  const h = await harness('en')
  h.props.topics[0].taxonomy_locked = true
  assert.equal(nodes(h.render()).find(n => n.type === 'select').props.disabled, true)
})
for (const lang of ['en', 'it']) test(`${lang}: plural count is exact`, async () => {
  const h = await harness(lang)
  h.props.topics = ['a','b','c','d'].map(id => ({ ...h.props.topics[0], id }))
  const message = nodes(h.render()).find(n => n.props?.role === 'status').props.children
  assert.ok(message.includes('4'))
  assert.ok(!message.includes('categoryReview'))
})
