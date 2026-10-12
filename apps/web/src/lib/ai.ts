import { createDeepSeek } from '@ai-sdk/deepseek'
import type { LanguageModel } from 'ai'

export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

export const model: LanguageModel = deepseek('deepseek-chat')
