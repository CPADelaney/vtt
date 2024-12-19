// js/components/init.jsx

console.log('Init.jsx loaded');

// Wait for VTT to be initialized
window.addEventListener('load', () => {
    // Check every 100ms for UIBridge to be available
    const checkInterval = setInterval(() => {
        if (window.vtt && window.vtt.uiBridge) {
            clearInterval(checkInterval);
            initializeReactComponents(window.vtt.uiBridge);
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
