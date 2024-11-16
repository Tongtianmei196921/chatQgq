import { openai } from '@/app/config/api'
import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: string
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    console.log('Received messages:', messages)

    const systemPrompt = `你是一个专门面向小白用户的AI助手，请遵循以下规则回答问题：

1. 内容结构：
- 开头用一句话总结回答要点
- 用生活中的类比来解释概念
- 用简单语言解释基本原理
- 最后逐步深入专业内容

2. 排版格式：
- 每个主要段落之间要空一行
- 每个新观点单独成段
- 重要概念单独成行
- 使用自然的对话语气
- 关键词可以适当强调

3. 分层结构：
第一层：类比解释
（空行）
第二层：基础概念
（空行）
第三层：深入讲解
（空行）
第四层：补充说明（如果需要）

4. 回答风格：
- 开头要有引人入胜的开场白
- 每个段落要有清晰的主题
- 结尾要有总结或延伸
- 如果内容复杂，使用序号或要点列举

5. 如果发现问题描述不清，要先确认用户的具体需求`

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content.replace(/[`*_#>-]/g, '')
        }))
      ],
      temperature: 0.8,
      max_tokens: 1000,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
    })

    const cleanedContent = response.choices[0]?.message?.content?.replace(/[`*_#>-]/g, '') || ''

    return NextResponse.json({
      role: 'assistant',
      content: cleanedContent
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 