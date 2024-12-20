// components/ChatBox.jsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, History } from 'lucide-react';

export const ChatBox = ({ bridge }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [inCombat, setInCombat] = useState(false);

    useEffect(() => {
        const unsubscribe = bridge.subscribe(state => {
            setInCombat(state.inCombat);
            setActionHistory(state.actionHistory);
        });
        return unsubscribe;
    }, [bridge]);

    const handleUndo = () => {
        bridge.undoLastAction();
    };

    const handleRevertTurn = () => {
        bridge.revertToPreviousTurn();
    };

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
                        {messages.map(msg => (
                            <div key={msg.id} className="p-2 rounded bg-gray-50">
                                <span className="font-bold">{msg.sender}: </span>
                                <span>{msg.content}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {inCombat && (
                            <div className="flex justify-end space-x-2 mb-4">
                                <button 
                                    onClick={handleUndo}
                                    disabled={actionHistory.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                                >
                                    Undo
                                </button>
                                <button 
                                    onClick={handleRevertTurn}
                                    disabled={actionHistory.length === 0}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                                >
                                    Revert Turn
                                </button>
                            </div>
                        )}
                        <div className="space-y-2">
                            {actionHistory.map(action => (
                                <div key={action.id} className="p-2 bg-gray-100 rounded">
                                    <div className="text-sm font-medium">{action.type}</div>
                                    <div className="text-xs text-gray-600">
                                        {new Date(action.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area - Only shown in chat tab */}
            {activeTab === 'chat' && (
                <div className="p-2 border-t">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="w-full px-3 py-2 border rounded"
                        onKeyPress={e => {
                            if (e.key === 'Enter') {
                                setMessages(prev => [...prev, {
                                    id: Date.now(),
                                    sender: 'Player',
                                    content: e.target.value
                                }]);
                                e.target.value = '';
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
};
