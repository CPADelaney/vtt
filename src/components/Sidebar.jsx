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

