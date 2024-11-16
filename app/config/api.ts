import OpenAI from 'openai'

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable')
}

export const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  timeout: 30000,
  maxRetries: 3,
  defaultHeaders: {
    'Content-Type': 'application/json',
  }
}) 