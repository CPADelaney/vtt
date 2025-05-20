// src/components/Sidebar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, History, Settings, Swords, ChevronLeft, ChevronRight, Dice5 } from 'lucide-react'; // Import icons
import { useDiceManager } from '../hooks/useDiceManager'; // Import the dice manager hook
import { useSystemManager } from '../hooks/useSystemManager'; // Import the system manager hook
// Corrected import path: From src/components/ to root needs ../../ then into css/
import '../../css/styles.css'; // Ensure CSS is imported - CORRECTED PATH

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
            {message.sender && <span className="sender">{message.sender}:</span>}
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
  isHexGrid, // Received as prop from parent (VirtualTabletop)
  onToggleGrid, // Received as prop from parent (VirtualTabletop)
  inCombat, // Received as prop from parent (VirtualTabletop)
  onToggleCombat, // Received as prop from parent (VirtualTabletop)
  undoGameState, // Prop from useStateWithHistory history object (passed from parent)
  historyInfo // Prop from useStateWithHistory history object (passed from parent)
}) => {
  const [activeTab, setActiveTab] = useState('dm'); // 'dm', 'chat'
  const [activeChatTab, setActiveChatTab] = useState('messages'); // 'messages', 'combat'
  const [messages, setMessages] = useState([]); // Local state for chat messages
  const [chatInput, setChatInput] = useState('');

  const messagesEndRef = useRef(null); // Ref to auto-scroll chat
  const { handleCommand } = useDiceManager('DM'); // Use DiceManager hook (assume DM for now)
  const { getAvailableSystems, setSystem } = useSystemManager(); // Use SystemManager hook

  // Auto-scroll chat messages when messages change
  useEffect(() => {
      // Only scroll if we are on the chat tab
      if (activeTab === 'chat' && activeChatTab === 'messages') {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, activeTab, activeChatTab]); // Depend on messages and active tabs

  // Auto-scroll combat log when history changes
  useEffect(() => {
       // Only scroll if we are on the combat log tab
      if (activeTab === 'chat' && activeChatTab === 'combat') {
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [historyInfo?.history.length, activeTab, activeChatTab]); // Depend on history length and active tabs


  // Effect to add system messages for combat toggle (triggered by inCombat prop change)
  useEffect(() => {
      // Only add message if inCombat prop *actually* changed
      // Check if messages array is not empty and the last message is different,
      // or if it's the very first system message.
      const lastMessage = messages[messages.length - 1];
      const newSystemMessageText = inCombat ? 'Combat Initiated!' : 'Combat Ended.';

      // Prevent adding duplicate initial messages on load or unnecessary re-adds
      if (lastMessage?.type === 'system' && lastMessage.text === newSystemMessageText) {
          return;
      }

      // Check if the inCombat prop *just changed* to trigger the message
      // This requires comparing with a previous state, which is tricky with just the prop.
      // A simpler approach is to ensure the message isn't already the last one.
      // The current check `if (lastMessage?.type === 'system' && lastMessage.text === newSystemMessageText)`
      // combined with the dependency on `messages` and `inCombat` *should* prevent duplicates
      // in most cases, although it might re-add if messages change AND inCombat is the same
      // as the *last* system message added. A ref tracking the *last* added system message text
      // would be more reliable. For now, keeping the existing logic as it seems functional.

       // Ensure we don't add the "Combat Ended" message if the component mounts with inCombat: false
       // and there's no previous state indicating combat was active.
       // A simple check for historyInfo might help, but it's complex without full state access.
       // Let's add the message only if combat just started OR just ended from a previous state.
       // This effect will run on mount. If inCombat is false, we don't want an initial "Combat Ended" message.
       // If inCombat is true on mount (from load), we want "Combat Initiated".

       // Let's simplify: just add the message whenever the `inCombat` state *changes* and it's not the very first message.
       // This effect *will* run on initial render based on the default state { inCombat: false }.
       // The current check `lastMessage?.type === 'system' && lastMessage.text === newSystemMessageText`
       // prevents adding "Combat Ended" if the initial state is false and there are no messages.
       // If initial state is true (from load), it will add "Combat Initiated". Seems mostly correct.


      setMessages(prev => [
          ...prev,
          {
              id: Date.now() + Math.random(), // Simple unique ID
              type: 'system',
              sender: 'System',
              text: newSystemMessageText
          }
      ]);
  }, [inCombat, messages]); // Depend on inCombat prop and the local messages state for the check


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
              sender: 'System' // System errors should come from System
          };
      }

      if (result) {
          setMessages(prev => [...prev, {
              id: Date.now() + Math.random(), // Ensure unique ID
              ...result,
              timestamp: Date.now(), // Add timestamp if needed later
              sender: result.sender || 'DM' // Default sender if not provided by command result
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
              sender: result.sender || 'DM'
          }]);
      }
  }, [handleCommand]);

  const handleUndoClick = useCallback(() => {
      console.log('[DEBUG] Undo button clicked. Calling undoGameState.');
      undoGameState(); // Call the undo function passed from parent
      // Need to potentially add a system message here or rely on VT to log undo
  }, [undoGameState]); // Depend on undoGameState prop

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
    <div className="right-sidebar"> {/* Keep the main sidebar class */}
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
                            // For now, placeholder value - SystemManager hook manages this
                            value={useSystemManager().currentSystemId} // Read value from hook
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
                      disabled={!onToggleCombat} // Disable if callback not provided
                  >
                      <Swords size={16} className="inline mr-2" />
                      {inCombat ? 'End Combat' : 'Start Combat'}
                  </button>

                  {/* Grid Toggle */}
                  <button
                      onClick={onToggleGrid} // Use the function from props
                      className="w-full btn-grid-toggle"
                      disabled={!onToggleGrid} // Disable if callback not provided
                  >
                      {isHexGrid ? 'Switch to Square Grid' : 'Switch to Hex Grid'}
                  </button>

                   {/* Undo/Redo (Optional DM tools or global) */}
                    <div className="flex justify-around gap-2">
                        <button
                            onClick={handleUndoClick}
                            disabled={!historyInfo?.canUndo || !undoGameState} // Use historyInfo prop and check if undo function exists
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
                                   // Use a unique key based on message id, defaulting to index if id is missing
                                   <ChatMessage key={msg.id || `msg-${messages.indexOf(msg)}`} message={msg} />
                               ))}
                               <div ref={messagesEndRef} /> {/* Scroll target */}
                           </div>
                        ) : (
                           <div className="combat-log">
                                {/* Display action history from useStateWithHistory */}
                                {historyInfo?.history // Access history from prop
                                    // Filter out the initial state or states outside combat if desired
                                    .filter((state, index) => index > 0) // Start from the first actual state change
                                    .map((state, index, filteredArr) => {
                                        // This is a simplified log showing state changes
                                        // A real combat log would track discrete events (moves, rolls, damage)
                                        const previousState = index > 0 ? filteredArr[index - 1] : historyInfo?.history[0];

                                        const changes = [];
                                        // Simplified diffing - better to log explicit events
                                        if (previousState && JSON.stringify(previousState.tokens) !== JSON.stringify(state.tokens)) {
                                            changes.push('Tokens updated (moved/added/removed)');
                                        }
                                        if (previousState && previousState.inCombat !== state.inCombat) {
                                             changes.push(state.inCombat ? 'Combat Started' : 'Combat Ended');
                                        }
                                        // Add checks for other relevant combat state changes (initiative, turn, etc.)

                                        // Only show entries where something *meaningful* changed for the log
                                        // Or log every state change if that's the desired level of detail
                                        // For this example, we'll log every history step after the initial state,
                                        // indicating what *might* have happened.
                                        // A more robust log would be explicit events.
                                        const actionDetails = changes.length > 0 ? changes.join(', ') : 'State updated';


                                        return (
                                            <div key={`history-step-${historyInfo.history.indexOf(state)}`} className="combat-log-item"> {/* Use original index */}
                                                <div>History Step {historyInfo.history.indexOf(state)}</div> {/* Use original index */}
                                                 {/* Replace with actual event type and details if logging explicit events */}
                                                <div className="text-xs">{actionDetails}</div>
                                                 <div className="text-xs text-gray-600">Time (placeholder)</div> {/* Placeholder timestamp */}
                                            </div>
                                        );
                                    })}

                                {!inCombat && (historyInfo?.history.length ?? 0) <= 1 && ( // Check history length
                                     <div className="text-center text-gray-500 italic">Combat log appears here when combat is active and actions are taken.</div>
                                )}
                                 {inCombat && (historyInfo?.history.length ?? 0) <= 1 && ( // Check history length
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