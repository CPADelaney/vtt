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
            {/* ... rest of your ChatBox JSX ... */}
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
