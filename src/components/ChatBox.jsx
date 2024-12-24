// src/components/ChatBox.jsx
import React, { useState } from 'react';
import { MessageSquare, History } from 'lucide-react';

export const ChatBox = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [inCombat, setInCombat] = useState(false);

  // If you want to simulate toggling combat or storing messages,
  // you can do it here in local state, or remove these states if not needed.

  // For example, if you want a "start combat" button, you could do:
  // const handleCombatToggle = () => setInCombat(!inCombat);

  // The rest is just UI with no external 'bridge' logic.

  return (
    <div className="fixed bottom-0 right-64 w-96 h-96 bg-white shadow-lg flex flex-col">
      {/* Chat Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-4 flex items-center justify-center ${
            activeTab === 'chat'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
        >
          <MessageSquare size={16} className="mr-2" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 flex items-center justify-center ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
        >
          <History size={16} className="mr-2" />
          Combat Log
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' ? (
          <div className="space-y-2 p-4">
            {/* Show messages or input here */}
            {messages.map((msg, i) => (
              <div key={i} className="p-2 rounded bg-gray-50">
                <span>{msg.content}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Show action history if in combat */}
            {inCombat && (
              <div className="text-sm text-red-500">
                Combat is ongoing! History length: {actionHistory.length}
              </div>
            )}
            <div className="space-y-2">
              {actionHistory.map((action, i) => (
                <div key={i} className="p-2 bg-gray-100 rounded">
                  <div className="text-sm font-medium">{action.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Only for chat */}
      {activeTab === 'chat' && (
        <div className="p-2 border-t">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full px-3 py-2 border rounded"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                setMessages(prev => [...prev, { content: e.target.value }]);
                e.target.value = '';
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
