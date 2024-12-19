// js/components/init.jsx

console.log('Init.jsx loaded');
import { Sidebar } from './Sidebar.jsx';
import { ChatBox } from './ChatBox.jsx';

console.log('Components imported');

window.addEventListener('load', () => {
    console.log('Checking for VTT...');
    const checkInterval = setInterval(() => {
        if (window.vtt && window.vtt.uiBridge) {
            console.log('VTT found, initializing React components...', window.vtt);
            clearInterval(checkInterval);
            try {
                initializeReactComponents(window.vtt.uiBridge);
                console.log('Components initialized');
            } catch (e) {
                console.error('Error initializing components:', e);
            }
        } else {
            console.log('VTT not found yet...');
        }
    }, 100);
});

function initializeReactComponents(bridge) {
    // Initialize Sidebar
    const sidebarRoot = ReactDOM.createRoot(document.getElementById('sidebar-root'));
    sidebarRoot.render(<Sidebar bridge={bridge} />);

    // Initialize ChatBox
    const chatRoot = ReactDOM.createRoot(document.getElementById('chat-root'));
    chatRoot.render(<ChatBox bridge={bridge} />);
}
