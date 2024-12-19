// js/components/init.jsx
import { DiceManager } from '/js/DiceManager.js';

console.log('Init.jsx loaded');

const { useState, useEffect, useRef } = React;
console.log('React hooks imported');

// Initialize DiceManager
const diceManager = new window.DiceManager();

// Simple SVG icons
const icons = {
    chevronLeft: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
    chevronRight: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
    swords: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4 3 3 3-3-3-3-3 3"/><path d="M20 20h-5v-5"/><path d="M15 20 4 9"/><path d="M4 20v-3a3 3 0 0 1 3-3h3"/><path d="M4 9 3 8l3-3 1 1"/></svg>,
    messageSquare: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    history: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    dice: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"></rect><circle cx="8" cy="8" r="1.5"></circle><circle cx="16" cy="16" r="1.5"></circle><circle cx="8" cy="16" r="1.5"></circle><circle cx="16" cy="8" r="1.5"></circle></svg>
};

// Message component for better organization
const Message = ({ message }) => {
    const getMessageStyle = () => {
        switch (message.type) {
            case 'roll':
                return 'bg-blue-50';
            case 'error':
                return 'bg-red-50';
            default:
                return 'bg-gray-50';
        }
    };

    return (
        <div className={`p-2 rounded ${getMessageStyle()}`}>
            <span className="font-bold">{message.sender}: </span>
            {message.type === 'roll' ? (
                <div>
                    <div>{message.text}</div>
                    <div className="text-sm text-blue-600 font-bold mt-1">
                        Total: {message.total}
                    </div>
                </div>
            ) : (
                <span>{message.text}</span>
            )}
        </div>
    );
};

// Define Sidebar component
const Sidebar = ({ bridge }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inCombat, setInCombat] = useState(false);
    const [activeTab, setActiveTab] = useState('dm');
    const [messages, setMessages] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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

    const handleMessageSend = (e) => {
        if (e.key === 'Enter' && inputRef.current.value.trim()) {
            const input = inputRef.current.value;
            try {
                const result = diceManager.handleCommand(input);
                if (result) {
                    setMessages(prev => [...prev, {
                        id: Date.now(),
                        ...result
                    }]);
                }
            } catch (error) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'error',
                    sender: 'System',
                    text: 'Error processing command: ' + error.message
                }]);
            }
            inputRef.current.value = '';
        }
    };

    const handleUndo = () => {
        bridge.undoLastAction();
    };

    const handleRevertTurn = () => {
        bridge.revertToPreviousTurn();
    };

    const handleQuickRoll = (diceType) => {
        const result = diceManager.handleCommand(`/roll 1${diceType}`);
        if (result) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                ...result
            }]);
        }
    };

    return (
        <div className={`sidebar fixed top-0 right-0 h-full bg-white shadow-lg transition-all duration-300 flex flex-col
            ${isExpanded ? 'w-80' : 'w-12'}`}>
            {/* Collapse/Expand Toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute left-0 top-1/2 -translate-x-full transform bg-white p-2 rounded-l-lg shadow-lg"
            >
                {isExpanded ? icons.chevronRight : icons.chevronLeft}
            </button>

            {isExpanded && (
                <>
                    {/* Tabs */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('dm')}
                            className={`flex-1 py-2 px-4 flex items-center justify-center ${
                                activeTab === 'dm'
                                    ? 'border-b-2 border-blue-500 text-blue-500'
                                    : 'text-gray-500'
                            }`}
                        >
                            <span className="mr-2">{icons.settings}</span>
                            DM Tools
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 py-2 px-4 flex items-center justify-center ${
                                activeTab === 'chat'
                                    ? 'border-b-2 border-blue-500 text-blue-500'
                                    : 'text-gray-500'
                            }`}
                        >
                            <span className="mr-2">{icons.messageSquare}</span>
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('combat')}
                            className={`flex-1 py-2 px-4 flex items-center justify-center ${
                                activeTab === 'combat'
                                    ? 'border-b-2 border-blue-500 text-blue-500'
                                    : 'text-gray-500'
                            }`}
                        >
                            <span className="mr-2">{icons.history}</span>
                            Combat
                        </button>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto">
                        {/* DM Tools Tab */}
                        {activeTab === 'dm' && (
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

                                {/* Quick dice rolls */}
                                <div className="mt-4">
                                    <h3 className="font-bold mb-2 flex items-center">
                                        <span className="mr-2">{icons.dice}</span>
                                        Quick Rolls
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
                                            <button
                                                key={die}
                                                onClick={() => handleQuickRoll(die)}
                                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded"
                                            >
                                                {die}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Tab */}
                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {messages.map(msg => (
                                        <Message key={msg.id} message={msg} />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-2 border-t">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Type /roll XdY or a message..."
                                        className="w-full px-3 py-2 border rounded"
                                        onKeyPress={handleMessageSend}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Combat Log Tab */}
                        {activeTab === 'combat' && (
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
                </>
            )}
        </div>
    );
};


// Initialize React components
console.log('Setting up initialization...');

function initializeComponents() {
    console.log('Attempting to initialize components');
    if (window.vtt && window.vtt.uiBridge) {
        try {
            console.log('Found VTT and bridge, creating roots');
            // Initialize Sidebar with integrated chat
            const sidebarRoot = ReactDOM.createRoot(document.getElementById('sidebar-root'));
            sidebarRoot.render(<Sidebar bridge={window.vtt.uiBridge} />);
            console.log('Sidebar initialized');
        } catch (e) {
            console.error('Error initializing components:', e);
        }
    } else {
        console.log('VTT or bridge not found, retrying...');
        setTimeout(initializeComponents, 100);
    }
}

// Try both load event and immediate initialization
if (document.readyState === 'complete') {
    console.log('Document already loaded, initializing now');
    initializeComponents();
} else {
    console.log('Document not loaded, waiting for load event');
    window.addEventListener('load', () => {
        console.log('Load event fired');
        initializeComponents();
    });
}
