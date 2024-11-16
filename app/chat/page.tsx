import ChatInterface from '@/components/ChatInterface'
import type { NextPage } from 'next'

const ChatPage: NextPage = () => {
  return (
    <main className="h-screen bg-gray-50">
      <ChatInterface />
    </main>
  )
}

export default ChatPage 