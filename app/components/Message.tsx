'use client'

import React, { useCallback } from 'react'
import { Message as MessageType } from '../types/chat'

interface MessageProps {
  message: MessageType
  onQuote?: (quote: string) => void
}

const Message: React.FC<MessageProps> = ({ message, onQuote }) => {
  const isAI = message.role === 'assistant'
  
  const formattedTime = React.useMemo(() => {
    const time = new Date(message.timestamp)
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [message.timestamp])

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString()

    if (selectedText) {
      const existingButtons = document.querySelectorAll('.selection-button')
      existingButtons.forEach(button => button.remove())

      // 创建按钮容器
      const buttonContainer = document.createElement('div')
      buttonContainer.className = 'selection-button fixed z-50 flex space-x-2'

      // 朗读按钮
      const speechButton = document.createElement('button')
      speechButton.innerHTML = '🔊'
      speechButton.className = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-2.5 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all duration-200'
      
      // 引用按钮
      const quoteButton = document.createElement('button')
      quoteButton.innerHTML = '💬'
      quoteButton.className = 'bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full p-2.5 shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-200'

      buttonContainer.appendChild(speechButton)
      buttonContainer.appendChild(quoteButton)

      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()

      if (rect) {
        buttonContainer.style.left = `${window.scrollX + rect.left + rect.width/2 - 50}px`
        buttonContainer.style.top = `${window.scrollY + rect.top - 50}px`
      }

      // 朗读功能
      let isPlaying = false
      let utterance: SpeechSynthesisUtterance | null = null

      speechButton.onclick = () => {
        if (isPlaying) {
          window.speechSynthesis.cancel()
          isPlaying = false
          speechButton.innerHTML = '🔊'
          return
        }

        const voices = window.speechSynthesis.getVoices()
        const chineseVoice = voices.find(voice => 
          voice.lang.includes('zh') && voice.name.includes('Female')
        ) || voices.find(voice => 
          voice.lang.includes('zh')
        ) || voices[0]

        utterance = new SpeechSynthesisUtterance(selectedText)
        utterance.voice = chineseVoice
        utterance.lang = 'zh-CN'
        utterance.rate = 0.9
        utterance.pitch = 1.1
        utterance.volume = 0.9

        utterance.onstart = () => {
          isPlaying = true
          speechButton.innerHTML = '⏸'
        }

        utterance.onend = () => {
          isPlaying = false
          speechButton.innerHTML = '🔊'
          setTimeout(() => buttonContainer.remove(), 1000)
        }

        utterance.onerror = () => {
          isPlaying = false
          speechButton.innerHTML = '❌'
          setTimeout(() => buttonContainer.remove(), 1000)
        }

        window.speechSynthesis.speak(utterance)
      }

      // 引用功能
      quoteButton.onclick = () => {
        if (onQuote) {
          onQuote(selectedText)
          buttonContainer.remove()
        }
      }

      document.body.appendChild(buttonContainer)

      // 点击其他地方移除按钮
      const removeButtons = (e: MouseEvent) => {
        if (!buttonContainer.contains(e.target as Node) && !isPlaying) {
          buttonContainer.remove()
          document.removeEventListener('mousedown', removeButtons)
        }
      }
      document.addEventListener('mousedown', removeButtons)
    }
  }, [onQuote])

  const formatContent = (content: string) => {
    const paragraphs = content.split(/\n\s*\n/)
    
    return paragraphs.map((paragraph, index) => {
      const lines = paragraph.split(/\n/)
      return (
        <div key={index} className="mb-6 last:mb-2">
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      )
    })
  }

  return (
    <div className={`flex items-start gap-6 mb-8 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-20 h-8 rounded-xl flex items-center justify-center text-center
        ${isAI 
          ? 'bg-gradient-to-r from-violet-500/90 to-purple-600 shadow-lg shadow-purple-500/20' 
          : 'bg-gradient-to-r from-indigo-400 to-blue-500 shadow-lg shadow-blue-500/20'}`}
      >
        <span className="text-white text-sm font-medium tracking-wide whitespace-nowrap">
          {isAI ? '智者' : '求知者'}
        </span>
      </div>
      <div 
        className={`group relative flex-1 max-w-[85%] px-8 py-6 rounded-3xl
          ${isAI 
            ? 'bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] backdrop-blur-sm' 
            : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/20'}`}
        onMouseUp={handleTextSelection}
      >
        <div className="text-[15px] leading-7 tracking-wide">
          {formatContent(message.content)}
        </div>
        <div className={`absolute -bottom-5 ${isAI ? 'left-8' : 'right-8'} text-xs
          ${isAI ? 'text-gray-400' : 'text-gray-400'} opacity-0 group-hover:opacity-100 transition-all duration-200`}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  )
}

export default Message 