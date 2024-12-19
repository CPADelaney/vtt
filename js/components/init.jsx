// js/components/init.jsx
console.log('Init.jsx loaded');

const { useState, useEffect, useRef } = React;
const { ChevronLeft, ChevronRight, Swords, MessageSquare, History } = lucide;

// Define Sidebar component
const Sidebar = ({ bridge }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inCombat, setInCombat] = useState(false);

    useEffect(() => {
        const unsubscribe = bridge.subscribe(state => {
            setInCombat(state.inCombat);
        });
        return unsubscribe;
    }, [bridge]);

    return (
        <div className={`sidebar fixed top-0 right-0 h-full bg-white shadow-lg transition-all duration-300 flex
            ${isExpanded ? 'w-64' : 'w-12'}`}>
            {/* Collapse/Expand Toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute left-0 top-1/2 -translate-x-full transform bg-white p-2 rounded-l-lg shadow-lg"
            >
                {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            {/* Main Sidebar Content */}
            <div className="w-full flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-bold text-lg flex items-center">
                        <Swords size={20} className="mr-2" /> DM Controls
                    </h2>
                </div>

                <div className="p-4 space-y-4">
                    <button 
                        onClick={() => bridge.toggleCombat()}
                        className={`w-full font-bold py-2 px-4 rounded transition-colors ${
                            inCombat 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {inCombat ? 'End Combat' : 'Start Combat'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Define ChatBox component
const ChatBox = ({ bridge }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [inCombat, setInCombat] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const unsubscribe = bridge.subscribe(state => {
            setInCombat(state.inCombat);
            setActionHistory(state.actionHistory);
        });
        return unsubscribe;
    }, [bridge]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, actionHistory]);

    const handleUndo = () => {
        bridge.undoLastAction();
    };

    const handleRevertTurn = () => {
        bridge.revertToPreviousTurn();
    };

    return (
        <div className="chatbox fixed bottom-0 right-64 w-96 h-96 bg-white shadow-lg flex flex-col">
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
                        <div ref={messagesEndRef} />
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
                            <div ref={messagesEndRef} />
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

// Initialize React components
window.addEventListener('load', () => {
    console.log('Checking for VTT...');
    const checkInterval = setInterval(() => {
        if (window.vtt && window.vtt.uiBridge) {
            console.log('VTT found, initializing React components...');
            clearInterval(checkInterval);
            try {
                // Initialize Sidebar
                const sidebarRoot = ReactDOM.createRoot(document.getElementById('sidebar-root'));
                sidebarRoot.render(<Sidebar bridge={window.vtt.uiBridge} />);

                // Initialize ChatBox
                const chatRoot = ReactDOM.createRoot(document.getElementById('chat-root'));
                chatRoot.render(<ChatBox bridge={window.vtt.uiBridge} />);
                
                console.log('Components initialized');
            } catch (e) {
                console.error('Error initializing components:', e);
            }
        } else {
            console.log('VTT not found yet...');
        }
    }, 100);
});
