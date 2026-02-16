
import React, { useState } from 'react';

export interface TodoItem {
    id: string;
    text: string;
    done: boolean;
}

export interface TodoSection {
    title: string;
    color: string;
    tasks: TodoItem[];
}

export interface TodoData {
    title: string;
    sections: TodoSection[];
}

interface InteractiveTodoProps {
    data: TodoData;
    onUpdate: (newData: TodoData) => void;
    theme: string;
}

const COLORS: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
};

// Encouraging phrases
const PHRASES = ["Tuyệt vời!", "Làm tốt lắm!", "Tiếp tục phát huy!", "Quá đỉnh!", "Siêu năng suất!", "Cố lên!", "Hoàn hảo!"];

export const InteractiveTodo: React.FC<InteractiveTodoProps> = ({ data, onUpdate, theme }) => {
    const [encouragement, setEncouragement] = useState<string | null>(null);

    const handleToggle = (sectionIndex: number, taskId: string) => {
        const newData = { ...data };
        const section = newData.sections[sectionIndex];
        const task = section.tasks.find(t => t.id === taskId);
        if (task) {
            task.done = !task.done;
            onUpdate(newData);

            if (task.done) {
                const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
                setEncouragement(phrase);
                setTimeout(() => setEncouragement(null), 2000);
            }
        }
    };

    const handleRename = (sectionIndex: number, taskId: string, newText: string) => {
        const newData = { ...data };
        const section = newData.sections[sectionIndex];
        const task = section.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = newText;
            onUpdate(newData);
        }
    };

    return (
        <div className="mt-2 mb-4 w-full">
            <div className="space-y-6">
                <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{data.title}</h2>
                
                {data.sections.map((section, sIdx) => (
                    <div key={sIdx} className={`rounded-xl overflow-hidden border ${theme === 'light' ? 'border-gray-200 bg-white shadow-sm' : 'border-gray-800 bg-[#1a1a1f]'} transition-all`}>
                        <div className={`px-4 py-2 text-sm font-bold text-white flex items-center gap-2 ${COLORS[section.color] || 'bg-blue-600'}`}>
                            <span>{section.title}</span>
                            <span className="ml-auto bg-black/20 px-2 py-0.5 rounded-full text-xs">
                                {section.tasks.filter(t => t.done).length}/{section.tasks.length}
                            </span>
                        </div>
                        <div className="p-2">
                            {section.tasks.map((task) => (
                                <div key={task.id} className={`group flex items-center gap-3 p-2 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}>
                                    <button 
                                        onClick={() => handleToggle(sIdx, task.id)}
                                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            task.done 
                                            ? 'bg-emerald-500 border-emerald-500' 
                                            : (theme === 'light' ? 'border-gray-300' : 'border-gray-600')
                                        }`}
                                    >
                                        {task.done && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                    <input 
                                        type="text"
                                        value={task.text}
                                        onChange={(e) => handleRename(sIdx, task.id, e.target.value)}
                                        className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm ${
                                            task.done 
                                            ? 'text-gray-500 line-through decoration-gray-500' 
                                            : (theme === 'light' ? 'text-gray-800' : 'text-gray-200')
                                        }`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {encouragement && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-2xl animate-fade-up z-50">
                    {encouragement}
                </div>
            )}
        </div>
    );
};
