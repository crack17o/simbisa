import React, { createContext, useContext, useEffect, useState } from 'react'
import { getT } from '@/lib/i18n'

const LangContext = createContext({ lang: 'fr', setLang: () => {}, t: (k) => k })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem('simbisa_lang')
    return ['fr', 'en', 'ln'].includes(stored) ? stored : 'fr'
  })

  const setLang = (l) => {
    if (['fr', 'en', 'ln'].includes(l)) {
      setLangState(l)
      localStorage.setItem('simbisa_lang', l)
      document.documentElement.lang = l === 'ln' ? 'ln' : l
    }
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'ln' ? 'ln' : lang
  }, [lang])

  const t = getT(lang)

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
