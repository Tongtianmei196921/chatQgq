'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Message as MessageType } from '../types/chat'
import Message from './Message'

interface ChatHistory {
  id: string
  title: string
  messages: MessageType[]
  createdAt: Date
  isStarred?: boolean
}

const ChatInterface = () => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>('')
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: '1',
      content: '你好！我是你的 AI 助手。让我们开始对话吧！',
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [inputHeight, setInputHeight] = useState('auto')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const [activeQuote, setActiveQuote] = useState<string | null>(null)

  useEffect(() => {
    const savedHistories = localStorage.getItem('chatHistories')
    if (savedHistories) {
      const histories = JSON.parse(savedHistories)
      setChatHistories(histories.map((h: any) => ({
        ...h,
        createdAt: new Date(h.createdAt)
      })))
    }
    const savedCurrentChatId = localStorage.getItem('currentChatId')
    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId)
      const currentChat = JSON.parse(savedHistories || '[]').find(
        (h: any) => h.id === savedCurrentChatId
      )
      if (currentChat) {
        setMessages(currentChat.messages)
      }
    }
  }, [])

  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      const updatedHistories = chatHistories.map(h => 
        h.id === currentChatId ? { ...h, messages } : h
      )
      localStorage.setItem('chatHistories', JSON.stringify(updatedHistories))
      setChatHistories(updatedHistories)
    }
  }, [messages, currentChatId])

  const handleNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat: ChatHistory = {
      id: newChatId,
      title: `新对话 ${chatHistories.length + 1}`,
      messages: [{
        id: '1',
        content: '你好！我是你的 AI 助手。让我们开始对话吧！',
        role: 'assistant',
        timestamp: new Date()
      }],
      createdAt: new Date()
    }
    
    setChatHistories(prev => [...prev, newChat])
    setCurrentChatId(newChatId)
    setMessages(newChat.messages)
    localStorage.setItem('currentChatId', newChatId)
  }

  const handleSelectChat = (chatId: string) => {
    const selectedChat = chatHistories.find(h => h.id === chatId)
    if (selectedChat) {
      setCurrentChatId(chatId)
      setMessages(selectedChat.messages)
      localStorage.setItem('currentChatId', chatId)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !activeQuote) return
    if (isLoading) return

    const fullContent = activeQuote 
      ? `${activeQuote}\n\n${input}`.trim()
      : input.trim()

    const userMessage: MessageType = {
      id: Date.now().toString(),
      content: fullContent,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setRetryCount(0)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const aiMessage: MessageType = {
        id: Date.now().toString(),
        content: data.content,
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
      
      if (currentChatId) {
        const updatedHistories = chatHistories.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, userMessage, aiMessage]
            }
          }
          return chat
        })
        setChatHistories(updatedHistories)
        localStorage.setItem('chatHistories', JSON.stringify(updatedHistories))
      }
    } catch (error) {
      console.error('Error:', error)
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => handleSubmit(e), 1000 * (retryCount + 1))
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: '抱歉，多次尝试后仍然失败。请检查网络连接或稍后重试。',
          role: 'assistant',
          timestamp: new Date()
        }])
        setRetryCount(0)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStar = (chatId: string) => {
    const updatedHistories = chatHistories.map(chat => 
      chat.id === chatId ? { ...chat, isStarred: !chat.isStarred } : chat
    )
    setChatHistories(updatedHistories)
    localStorage.setItem('chatHistories', JSON.stringify(updatedHistories))
  }

  const deleteChat = (chatId: string) => {
    if (window.confirm('确定要删除这个对话吗？')) {
      const updatedHistories = chatHistories.filter(chat => chat.id !== chatId)
      setChatHistories(updatedHistories)
      localStorage.setItem('chatHistories', JSON.stringify(updatedHistories))
      
      if (currentChatId === chatId) {
        const lastChat = updatedHistories[updatedHistories.length - 1]
        if (lastChat) {
          setCurrentChatId(lastChat.id)
          setMessages(lastChat.messages)
          localStorage.setItem('currentChatId', lastChat.id)
        } else {
          handleNewChat()
        }
      }
    }
  }

  const startEditing = (chatId: string, currentTitle: string) => {
    setIsEditing(chatId)
    setEditTitle(currentTitle)
  }

  const handleRename = (chatId: string) => {
    if (editTitle.trim()) {
      const updatedHistories = chatHistories.map(chat =>
        chat.id === chatId ? { ...chat, title: editTitle.trim() } : chat
      )
      setChatHistories(updatedHistories)
      localStorage.setItem('chatHistories', JSON.stringify(updatedHistories))
    }
    setIsEditing(null)
  }

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  const exportChat = (chatId: string) => {
    const chat = chatHistories.find(h => h.id === chatId)
    if (chat) {
      const content = chat.messages
        .map(m => `${m.role === 'assistant' ? 'AI' : '你'}: ${m.content}`)
        .join('\n\n')
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${chat.title}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  // 添加格式化时间的函数
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // 修改引用处理函数
  const handleQuote = (quote: string) => {
    setActiveQuote(quote)
    // 聚焦输入框
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus()
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 侧边栏 */}
      <div className="hidden md:flex md:w-64 bg-white border-r border-gray-100 p-4 flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-800">AI Assistant</h2>
          <p className="text-sm text-gray-500 mt-1">个性化的智能助手</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* 聊天历史列表 */}
          <div className="space-y-2">
            {/* 优先显示星标对话 */}
            {chatHistories
              .sort((a, b) => {
                if (a.isStarred === b.isStarred) {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                }
                return (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0)
              })
              .map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg transition-all ${
                    currentChatId === chat.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => handleSelectChat(chat.id)}
                    className="w-full px-4 py-3 text-left"
                  >
                    {isEditing === chat.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRename(chat.id)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRename(chat.id)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                    ) : (
                      <div className="space-y-2">
                        {/* 标题和时间 */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium truncate flex items-center">
                            {chat.isStarred && (
                              <span className="text-yellow-500 mr-1">★</span>
                            )}
                            {chat.title}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDateTime(chat.createdAt)}
                          </div>
                        </div>

                        {/* 消息预览 */}
                        <div className="text-xs text-gray-500 truncate">
                          {chat.messages[chat.messages.length - 1]?.content.substring(0, 50)}
                          {chat.messages[chat.messages.length - 1]?.content.length > 50 ? '...' : ''}
                        </div>

                        {/* 消息数量 */}
                        <div className="text-xs text-gray-400">
                          {chat.messages.length} 条对话
                        </div>

                        {/* 操作按钮 - 移到下方 */}
                        <div className="flex items-center justify-end space-x-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleStar(chat.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-500 transition-all"
                            title="收藏对话"
                          >
                            <svg className="w-4 h-4" fill={chat.isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(chat.id, chat.title)
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-all"
                            title="重命名"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              exportChat(chat.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500 transition-all"
                            title="导出对话"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteChat(chat.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                            title="删除对话"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>
        
        {/* 新对话按钮 */}
        <div className="mt-4">
          <button 
            onClick={handleNewChat}
            className="w-full px-4 py-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新对话</span>
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-full"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-800">AI Assistant</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleNewChat}
              className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </header>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <Message 
                key={message.id} 
                message={message} 
                onQuote={handleQuote}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-100 bg-white/80 backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6">
            {/* 引用区域 - 简化显示 */}
            {activeQuote && (
              <div className="mb-4 relative">
                <div className="bg-gray-50 rounded-xl p-4 pr-12 text-sm text-gray-600 border-l-4 border-blue-500">
                  {activeQuote}
                  <button
                    type="button"
                    onClick={() => setActiveQuote(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  adjustHeight()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder={activeQuote ? "输入你的追问..." : "输入你的问题... (Shift + Enter 换行)"}
                className="w-full px-6 py-4 pr-28 bg-white/80 border border-gray-200/80 rounded-2xl resize-none
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all
                  shadow-[0_2px_20px_rgba(0,0,0,0.02)] backdrop-blur-sm"
                style={{ height: inputHeight, maxHeight: '200px' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !activeQuote)}
                className={`absolute right-3 bottom-3 px-5 py-2.5 text-white text-sm font-medium rounded-xl
                  transition-all duration-200 transform
                  ${(isLoading || (!input.trim() && !activeQuote))
                    ? 'bg-blue-400/80 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5'
                  }`}
              >
                {isLoading ? '发送中...' : '发送'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 添加移动端侧边栏 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            {/* 侧边栏内容 */}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatInterface 