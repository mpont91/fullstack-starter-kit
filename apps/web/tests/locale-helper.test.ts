import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  apiLanguageFromSite,
  languageFromPath,
  localizePath,
  pathWithoutLanguage,
  siteLanguageFromApi,
} from '../src/helpers/locale-helper'

describe('locale paths', () => {
  it('keeps English unprefixed and prefixes Spanish', () => {
    assert.equal(localizePath('/app', 'en'), '/app')
    assert.equal(localizePath('/app', 'es'), '/es/app')
    assert.equal(localizePath('/', 'es'), '/es')
  })

  it('reads the language off the first segment', () => {
    assert.equal(languageFromPath('/es/app'), 'es')
    assert.equal(languageFromPath('/app'), 'en')
    assert.equal(languageFromPath('/espresso'), 'en')
  })

  it('strips the prefix back off', () => {
    assert.equal(pathWithoutLanguage('/es/app'), '/app')
    assert.equal(pathWithoutLanguage('/es'), '/')
    assert.equal(pathWithoutLanguage('/app'), '/app')
  })

  it("maps the site's locale to the user's language and back", () => {
    assert.equal(apiLanguageFromSite('es'), 'ES')
    assert.equal(siteLanguageFromApi('EN'), 'en')
  })
})
