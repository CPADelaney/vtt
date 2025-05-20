// src/components/Sidebar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, History, Settings, Swords, ChevronLeft, ChevronRight, Dice5 } from 'lucide-react'; // Import icons
import { useDiceManager } from '../hooks/useDiceManager'; // Import the dice manager hook
import { useSystemManager } from '../hooks/useSystemManager'; // Import the system manager hook
import '../css/styles.css'; // Ensure CSS is imported

// Helper component for messages to handle different types
const ChatMessage = ({ message }) => {
    const getMessageClass = () => {
        switch (message.type) {
            case 'roll': return 'chat-message roll';
            case 'error': return 'chat-message error';
            case 'system': return 'chat-message system';
            case 'message': return 'chat-message message';
            default: return 'chat-message';
        }
    };

    return (
        <div className={getMessageClass()}>
            <span className="sender">{message.sender}:</span>
            {message.type === 'roll' ? (
                <div>
                    <div>{message.original}</div>
                    <div className="text-sm text-blue-600 mt-1">
                        ({message.details}) <span className="font-bold">Total: {message.total}</span>
                    </div>
                </div>
            ) : (
                <span>{message.text}</span>
            )}
        </div>
    );
};

export const Sidebar = ({
  isHexGrid,
  onToggleGrid,
  inCombat,
  onToggleCombat,
  undoGameState, // Prop from useStateWithHistory history object
  historyInfo // Prop from useStateWithHistory history object
}) => {
  const [activeTab, setActiveTab] = useState('dm'); // 'dm', 'chat'
  const [activeChatTab, setActiveChatTab] = useState('messages'); // 'messages', 'combat'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const messagesEndRef = useRef(null); // Ref to auto-scroll chat
  const { handleCommand } = useDiceManager('DM'); // Use DiceManager hook (assume DM for now)
  const { getAvailableSystems, setSystem } = useSystemManager(); // Use SystemManager hook

  // Auto-scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to add system messages for combat toggle
  useEffect(() => {
      setMessages(prev => [
          ...prev,
          {
              id: Date.now() + Math.random(), // Simple unique ID
              type: 'system',
              sender: 'System',
              text: inCombat ? 'Combat Initiated!' : 'Combat Ended.'
          }
      ]);
  }, [inCombat]);


  const handleMessageSend = useCallback((e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const input = chatInput.trim();
      setChatInput(''); // Clear input immediately

      let result;
      try {
         result = handleCommand(input);
         console.log('[DEBUG] handleMessageSend result:', result);
      } catch (error) {
          console.error('[ERROR] handleMessageSend failed:', error);
          result = {
              type: 'error',
              text: `Error processing command: ${error.message}`,
              sender: 'System'
          };
      }

      if (result) {
          setMessages(prev => [...prev, {
              id: Date.now() + Math.random(), // Ensure unique ID
              ...result,
              timestamp: Date.now(),
          }]);
      }
    }
  }, [chatInput, handleCommand]);

  const handleQuickRoll = useCallback((diceType) => {
      const result = handleCommand(`/roll 1${diceType}`);
      if (result) {
          setMessages(prev => [...prev, {
              id: Date.now() + Math.random(),
              ...result,
              timestamp: Date.now(),
          }]);
      }
  }, [handleCommand]);

  const handleUndoClick = useCallback(() => {
      console.log('[DEBUG] Undo button clicked. Calling undoGameState.');
      undoGameState(); // Call the undo function passed from App/VT
  }, [undoGameState]);

  const handleRevertTurnClick = useCallback(() => {
      // Placeholder for reverting to the start of the current combat turn
      // This would require more complex state management not yet fully implemented
      console.log('[DEBUG] Revert Turn button clicked (Placeholder)');
      // TODO: Implement turn-based history revert
      setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'system',
          sender: 'System',
          text: 'Revert Turn feature not yet implemented.'
      }]);
  }, []); // Add dependencies if combat state/turn logic is added

  return (
    <div className="right-sidebar">
      {/* Header/Tabs Area */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab-button ${activeTab === 'dm' ? 'active' : ''}`}
          onClick={() => setActiveTab('dm')}
        >
          <Settings size={16} className="mr-1" /> DM Tools
        </button>
        <button
          className={`sidebar-tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
           <MessageSquare size={16} className="mr-1" /> Chat / Log
        </button>
         {/* Add other tabs here later */}
      </div>

      {/* Content Area - This area scrolls */}
      <div className="sidebar-content">
          {/* DM Tools Content */}
          {activeTab === 'dm' && (
              <div className="dm-tools-area">
                   {/* System Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Game System
                        </label>
                        <select
                            className="w-full px-3 py-2 border rounded shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => setSystem(e.target.value)}
                            // Assuming SystemManager tracks currentSystemId internally
                            // Or lift currentSystemId state up to App/VirtualTabletop
                            // For now, placeholder value
                            value="5e" // Replace with actual state if lifted
                        >
                            {getAvailableSystems().map(system => (
                                <option key={system.id} value={system.id}>
                                    {system.name}
                                </option>
                            ))}
                        </select>
                    </div>

                  {/* Combat Toggle */}
                  <button
                      onClick={onToggleCombat} // Use the function from props
                      className={`w-full btn-combat-${inCombat ? 'end' : 'start'}`}
                  >
                      <Swords size={16} className="inline mr-2" />
                      {inCombat ? 'End Combat' : 'Start Combat'}
                  </button>

                  {/* Grid Toggle */}
                  <button
                      onClick={onToggleGrid} // Use the function from props
                      className="w-full btn-grid-toggle"
                  >
                      {isHexGrid ? 'Switch to Square Grid' : 'Switch to Hex Grid'}
                  </button>

                   {/* Undo/Redo (Optional DM tools or global) */}
                    <div className="flex justify-around gap-2">
                        <button
                            onClick={handleUndoClick}
                            disabled={!historyInfo?.canUndo} // Use historyInfo prop
                            className="flex-1 btn-undo"
                        >
                             <History size={16} className="inline mr-2" />
                             Undo ({historyInfo?.currentIndex ?? 0})
                        </button>
                         <button
                            onClick={handleRevertTurnClick}
                            disabled={true} // Disable until implemented
                             className="flex-1 btn-revert-turn"
                         >
                             Revert Turn
                         </button>
                    </div>

                   {/* Add other DM specific tools here */}
              </div>
          )}

          {/* Chat / Combat Log Content */}
          {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                  {/* Chat Subtabs */}
                   <div className="sidebar-tabs bg-gray-50 border-t"> {/* Added border-t for visual separation */}
                      <button
                           className={`sidebar-tab-button ${activeChatTab === 'messages' ? 'active' : ''}`}
                           onClick={() => setActiveChatTab('messages')}
                       >
                           <MessageSquare size={16} className="mr-1" /> Messages
                       </button>
                       <button
                           className={`sidebar-tab-button ${activeChatTab === 'combat' ? 'active' : ''}`}
                           onClick={() => setActiveChatTab('combat')}
                       >
                            <Swords size={16} className="mr-1" /> Combat Log
                       </button>
                   </div>

                   {/* Subtab Content Area */}
                   <div className="sidebar-content-area">
                        {activeChatTab === 'messages' ? (
                           <div className="chat-messages">
                               {messages.map(msg => (
                                   <ChatMessage key={msg.id} message={msg} />
                               ))}
                               <div ref={messagesEndRef} /> {/* Scroll target */}
                           </div>
                        ) : (
                           <div className="combat-log">
                                {/* Display action history from useStateWithHistory */}
                                {historyInfo?.history // Access history from prop
                                    .flatMap((state, index, arr) => {
                                        // Add combat log messages between states if combat is active
                                        if (!state.inCombat || index === 0) return [];
                                        // This is a simplified view; a real combat log would be more detailed
                                        // For demonstration, just show state changes
                                        const prevState = arr[index - 1];
                                        const changes = [];
                                        // Example: check if tokens changed positions
                                        if (JSON.stringify(prevState.tokens) !== JSON.stringify(state.tokens)) {
                                            changes.push(`Tokens updated`);
                                        }
                                        // Example: check if combat status changed
                                        if (prevState.inCombat !== state.inCombat) {
                                            changes.push(state.inCombat ? 'Combat Started' : 'Combat Ended');
                                        }
                                        // Add more checks for initiative changes, HP changes, etc.

                                        if (changes.length > 0) {
                                            return [{
                                                id: `history-${index}`,
                                                type: 'State Change', // Or more specific type based on diff
                                                timestamp: new Date().toLocaleTimeString(), // Placeholder
                                                details: changes.join(', ')
                                            }];
                                        }
                                        return [];
                                    })
                                    .map(item => (
                                        <div key={item.id} className="combat-log-item">
                                            <div>{item.type}</div>
                                            <div className="text-xs text-gray-600">{item.timestamp}</div>
                                            {item.details && <div className="text-xs">{item.details}</div>}
                                        </div>
                                    ))}
                                {!inCombat && historyInfo?.history.length === 1 && ( // Check history length > 0
                                     <div className="text-center text-gray-500 italic">Combat log appears here when combat is active.</div>
                                )}
                                 {inCombat && historyInfo?.history.length <= 1 && ( // Check history length > 0
                                     <div className="text-center text-gray-500 italic">No actions logged yet this combat.</div>
                                )}
                                <div ref={messagesEndRef} /> {/* Scroll target */}
                           </div>
                        )}
                   </div>


                   {/* Input and Quick Rolls (Only for chat subtab) */}
                   {activeChatTab === 'messages' && (
                       <div className="chat-input-area">
                           <input
                               type="text"
                               placeholder="Type /roll XdY or a message..."
                               className="w-full" // Use css class
                               value={chatInput}
                               onChange={e => setChatInput(e.target.value)}
                               onKeyPress={handleMessageSend}
                           />
                           <div className="chat-quick-rolls">
                               {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
                                   <button
                                       key={die}
                                       onClick={() => handleQuickRoll(die)}
                                   >
                                       <Dice5 size={12} className="inline mr-1" />{die}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}
              </div>
          )}
      </div>
    </div>
  );
};