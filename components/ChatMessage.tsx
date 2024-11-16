import { FC } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

const ChatMessage: FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

export default ChatMessage 