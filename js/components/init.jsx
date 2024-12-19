// js/components/init.jsx
console.log('Init.jsx loaded');

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
            {/* ... rest of your Sidebar JSX ... */}
        </div>
    );
};

// Define ChatBox component
const ChatBox = ({ bridge }) => {
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

    return (
        <div className="chatbox fixed bottom-0 right-64 w-96 h-96 bg-white shadow-lg flex flex-col">
// components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react';

export const Sidebar = ({ bridge }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inCombat, setInCombat] = useState(false);

    useEffect(() => {
        const unsubscribe = bridge.subscribe(state => {
            setInCombat(state.inCombat);
        });
        return unsubscribe;
    }, [bridge]);

    const handleCombatToggle = () => {
        bridge.toggleCombat();
    };

    return (
        <div 
            className={`fixed top-0 right-0 h-full bg-white shadow-lg transition-all duration-300 flex ${
                isExpanded ? 'w-64' : 'w-12'
            }`}
        >
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
                        onClick={handleCombatToggle}
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
