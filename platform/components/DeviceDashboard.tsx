'use client';

import { useState, useEffect } from 'react';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { Trash2, Settings, Save, Plus, X, Monitor, Clock, Calendar, Link as LinkIcon, Activity, Wifi, WifiOff, Edit2, ExternalLink, Filter } from 'lucide-react';

const TimeInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [h, m] = (value || '00:00').split(':');
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

    const displayMinutes = minutes.includes(m) ? minutes : [...minutes, m].sort();

    return (
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1">
            <select 
                value={h}
                onChange={(e) => onChange(`${e.target.value}:${m}`)}
                className="bg-transparent text-zinc-200 text-sm p-1 font-mono focus:outline-none cursor-pointer hover:text-white appearance-none text-center w-8"
            >
                {hours.map(hour => <option key={hour} value={hour} className="bg-zinc-900">{hour}</option>)}
            </select>
            <span className="text-zinc-500 font-mono">:</span>
            <select 
                value={m}
                onChange={(e) => onChange(`${h}:${e.target.value}`)}
                className="bg-transparent text-zinc-200 text-sm p-1 font-mono focus:outline-none cursor-pointer hover:text-white appearance-none text-center w-8"
            >
                {displayMinutes.map(min => <option key={min} value={min} className="bg-zinc-900">{min}</option>)}
            </select>
        </div>
    );
};

interface Condition {
    type: 'if-user-zone' | 'day-of-week' | 'if-calendar-event';
    user?: string;
    zone?: string;
    days?: number[];
    calendar?: string;
    search?: string;
    offset?: number;
    expected_state: boolean;
}

interface Screen {
    url: string;
    duration?: number;
    starttime?: string;
    endtime?: string;
    conditions?: Condition[];
    force_show_if_conditions_match?: boolean;
}

interface Device {
    $id: string;
    deviceId: string;
    screens: string;
    randomize_screens: boolean;
    json_refresh_interval: number;
    conditions_check_interval?: number;
    first_day_of_week?: 'monday' | 'sunday';
    last_seen?: string;
    last_updated?: string;
    dev_mode?: boolean;
}

export default function DeviceDashboard({ device, onDelete, onUpdate }: { device: Device, onDelete: () => void, onUpdate: () => void }) {
    const [screens, setScreens] = useState<Screen[]>([]);
    const [randomize, setRandomize] = useState(device.randomize_screens);
    const [firstDay, setFirstDay] = useState<'monday' | 'sunday'>(device.first_day_of_week || 'monday');
    const [conditionsInterval, setConditionsInterval] = useState(device.conditions_check_interval || 5);
    const [devMode, setDevMode] = useState(device.json_refresh_interval === 2);
    const [deviceName, setDeviceName] = useState(device.deviceId);
    const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [editingConditionsIndex, setEditingConditionsIndex] = useState<number | null>(null);

    useEffect(() => {
        try {
            setScreens(JSON.parse(device.screens));
        } catch {
            setScreens([]);
        }
        setRandomize(device.randomize_screens);
        setFirstDay(device.first_day_of_week || 'monday');
        setConditionsInterval(device.conditions_check_interval || 5);
        setDevMode(device.json_refresh_interval === 2);
        setDeviceName(device.deviceId);
    }, [device]);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const deviceUrl = `${baseUrl}/api/${device.$id}/device.json`;
    const healthUrl = `${baseUrl}/api/${device.$id}/health`;

    const isOnline = device.last_seen && (new Date().getTime() - new Date(device.last_seen).getTime() < 7 * 60 * 1000);

    const handleSave = async () => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.COLLECTION_ID,
                device.$id,
                {
                    screens: JSON.stringify(screens),
                    randomize_screens: randomize,
                    first_day_of_week: firstDay,
                    conditions_check_interval: conditionsInterval,
                    json_refresh_interval: devMode ? 2 : 15,
                    deviceId: deviceName,
                    last_edited: new Date().toISOString()
                }
            );
            setIsEditingPlaylist(false);
            setIsEditingSettings(false);
            onUpdate();
        } catch (e) {
            alert('Failed to save device');
            console.error(e);
        }
    };

    const addScreen = () => {
        setScreens([...screens, { url: '', duration: 20 }]);
    };

    const updateScreen = (index: number, field: keyof Screen, value: any) => {
        const newScreens = [...screens];
        newScreens[index] = { ...newScreens[index], [field]: value };
        setScreens(newScreens);
    };

    const toggleScreenMode = (index: number, mode: 'duration' | 'schedule') => {
        const newScreens = [...screens];
        const screen = newScreens[index];
        
        if (mode === 'schedule') {
            if (!screen.starttime) {
                screen.starttime = '08:00';
                screen.endtime = '20:00';
                delete screen.duration; 
            }
        } else {
            delete screen.starttime;
            delete screen.endtime;
            if (!screen.duration) screen.duration = 20;
        }
        setScreens(newScreens);
    };

    const removeScreen = (index: number) => {
        if (screens.length <= 1) {
            alert('You must have at least one screen.');
            return;
        }
        setScreens(screens.filter((_, i) => i !== index));
    };

    const addCondition = (screenIndex: number) => {
        const newScreens = [...screens];
        const screen = newScreens[screenIndex];
        if (!screen.conditions) screen.conditions = [];
        screen.conditions.push({ type: 'if-user-zone', user: '', zone: '', expected_state: true });
        setScreens(newScreens);
    };

    const updateCondition = (screenIndex: number, conditionIndex: number, field: keyof Condition, value: any) => {
        const newScreens = [...screens];
        const screen = newScreens[screenIndex];
        if (screen.conditions) {
            let newCondition = { ...screen.conditions[conditionIndex], [field]: value };
            
            if (field === 'type') {
                if (value === 'if-user-zone') {
                    newCondition = { 
                        type: 'if-user-zone', 
                        user: '', 
                        zone: '', 
                        expected_state: newCondition.expected_state 
                    };
                } else if (value === 'day-of-week') {
                    newCondition = { 
                        type: 'day-of-week', 
                        days: [], 
                        expected_state: newCondition.expected_state 
                    };
                } else if (value === 'if-calendar-event') {
                    newCondition = {
                        type: 'if-calendar-event',
                        calendar: '',
                        search: '',
                        offset: 0,
                        expected_state: newCondition.expected_state
                    };
                }
            }
            
            screen.conditions[conditionIndex] = newCondition;
            setScreens(newScreens);
        }
    };

    const removeCondition = (screenIndex: number, conditionIndex: number) => {
        const newScreens = [...screens];
        const screen = newScreens[screenIndex];
        if (screen.conditions) {
            screen.conditions = screen.conditions.filter((_, i) => i !== conditionIndex);
            setScreens(newScreens);
        }
    };

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Invalid URL';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-zinc-100">Screens</h3>
                    {isEditingPlaylist ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditingPlaylist(false)} className="text-sm text-zinc-400 hover:text-zinc-300 px-3 py-1.5">Cancel</button>
                            <button onClick={handleSave} className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-500">Save Screens</button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsEditingPlaylist(true)}
                            className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                            <Edit2 size={12} /> Edit Screens
                        </button>
                    )}
                </div>

                {isEditingPlaylist ? (
                    <div className="grid grid-cols-1 gap-4">
                        {screens.map((screen, idx) => (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 relative group">
                                <button onClick={() => removeScreen(idx)} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400"><X size={16} /></button>
                                <div className="space-y-3 pr-8">
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={screen.url}
                                        onChange={(e) => updateScreen(idx, 'url', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 font-mono"
                                    />
                                    
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        <button 
                                            onClick={() => toggleScreenMode(idx, 'duration')}
                                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${!screen.starttime ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            Duration
                                        </button>
                                        <button 
                                            onClick={() => toggleScreenMode(idx, 'schedule')}
                                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${screen.starttime ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            Schedule
                                        </button>
                                        <button 
                                            onClick={() => setEditingConditionsIndex(editingConditionsIndex === idx ? null : idx)}
                                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded flex items-center gap-1 ${screen.conditions && screen.conditions.length > 0 ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <Filter size={10} /> Conditions {screen.conditions && screen.conditions.length > 0 && `(${screen.conditions.length})`}
                                        </button>
                                    </div>

                                    {!screen.starttime ? (
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock size={14} className="text-zinc-500" />
                                            <input
                                                type="number"
                                                value={screen.duration || 20}
                                                onChange={(e) => updateScreen(idx, 'duration', parseInt(e.target.value))}
                                                className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200"
                                            />
                                            <span className="text-xs text-zinc-500">min</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar size={14} className="text-zinc-500" />
                                            <TimeInput
                                                value={screen.starttime || '08:00'}
                                                onChange={(val) => updateScreen(idx, 'starttime', val)}
                                            />
                                            <span className="text-xs text-zinc-500">to</span>
                                            <TimeInput
                                                value={screen.endtime || '20:00'}
                                                onChange={(val) => updateScreen(idx, 'endtime', val)}
                                            />
                                        </div>
                                    )}

                                    {editingConditionsIndex === idx && (
                                        <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Conditions (All must match)</span>
                                                <button onClick={() => addCondition(idx)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={12} /> Add</button>
                                            </div>
                                            
                                            {screen.conditions?.map((condition, cIdx) => (
                                                <div key={cIdx} className="flex flex-wrap gap-2 items-center bg-zinc-900 p-2 rounded border border-zinc-800">
                                                    <span className="text-xs text-zinc-500 font-mono">IF</span>
                                                    
                                                    <select 
                                                        value={condition.type}
                                                        onChange={(e) => updateCondition(idx, cIdx, 'type', e.target.value)}
                                                        className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1"
                                                    >
                                                        <option value="if-user-zone">User Zone</option>
                                                        <option value="day-of-week">Day of Week</option>
                                                        <option value="if-calendar-event">Calendar Event</option>
                                                    </select>

                                                    <button 
                                                        onClick={() => updateCondition(idx, cIdx, 'expected_state', !condition.expected_state)}
                                                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${condition.expected_state ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-red-900/20 text-red-400 border-red-800'}`}
                                                    >
                                                        {condition.expected_state ? 'IS TRUE' : 'IS FALSE'}
                                                    </button>

                                                    {condition.type === 'if-user-zone' ? (
                                                        <>
                                                            <input 
                                                                placeholder="person.name" 
                                                                value={condition.user || ''}
                                                                onChange={(e) => updateCondition(idx, cIdx, 'user', e.target.value)}
                                                                className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1 w-24"
                                                            />
                                                            <span className="text-xs text-zinc-500 font-mono">IN</span>
                                                            <input 
                                                                placeholder="zone.home" 
                                                                value={condition.zone || ''}
                                                                onChange={(e) => updateCondition(idx, cIdx, 'zone', e.target.value)}
                                                                className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1 w-24"
                                                            />
                                                        </>
                                                    ) : condition.type === 'day-of-week' ? (
                                                        <div className="flex gap-1">
                                                            {(firstDay === 'monday' 
                                                                ? [['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0]] 
                                                                : [['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]]
                                                            ).map(([day, dIdx]) => (
                                                                <button
                                                                    key={dIdx}
                                                                    onClick={() => {
                                                                        const currentDays = condition.days || [];
                                                                        const newDays = currentDays.includes(dIdx as number) 
                                                                            ? currentDays.filter(d => d !== dIdx)
                                                                            : [...currentDays, dIdx as number];
                                                                        updateCondition(idx, cIdx, 'days', newDays);
                                                                    }}
                                                                    className={`w-6 h-6 rounded text-[10px] flex items-center justify-center border ${condition.days?.includes(dIdx as number) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 items-center">
                                                            <input 
                                                                placeholder="calendar.entity" 
                                                                value={condition.calendar || ''}
                                                                onChange={(e) => updateCondition(idx, cIdx, 'calendar', e.target.value)}
                                                                className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1 w-32"
                                                            />
                                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Search</span>
                                                            <input 
                                                                placeholder="Title/Tag" 
                                                                value={condition.search || ''}
                                                                onChange={(e) => updateCondition(idx, cIdx, 'search', e.target.value)}
                                                                className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1 w-24"
                                                            />
                                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Next</span>
                                                            <div className="flex items-center gap-1">
                                                                <input 
                                                                    type="number"
                                                                    placeholder="0" 
                                                                    value={condition.offset || 0}
                                                                    onChange={(e) => updateCondition(idx, cIdx, 'offset', parseInt(e.target.value) || 0)}
                                                                    className="bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 px-2 py-1 w-12"
                                                                />
                                                                <span className="text-[10px] text-zinc-500">min</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <button onClick={() => removeCondition(idx, cIdx)} className="text-zinc-600 hover:text-red-400 ml-auto"><X size={12} /></button>
                                                </div>
                                            ))}

                                            <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-zinc-800/50">
                                                <input 
                                                    type="checkbox" 
                                                    checked={screen.force_show_if_conditions_match || false}
                                                    onChange={(e) => updateScreen(idx, 'force_show_if_conditions_match', e.target.checked)}
                                                    className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0 w-3 h-3"
                                                />
                                                <span className="text-xs text-zinc-400">Force show if conditions match (overrides schedule)</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button onClick={addScreen} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Add Screen
                        </button>
                    </div>
                ) : (
                    <div className="w-full overflow-hidden">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {screens.length === 0 && (
                                <div className="w-full py-8 text-center text-zinc-500 text-sm bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                    No screens added.
                                </div>
                            )}
                            {screens.map((screen, idx) => (
                                <div key={idx} className="flex-shrink-0 w-64 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group">
                                    <div className="h-32 bg-zinc-950 flex items-center justify-center border-b border-zinc-800 relative">
                                        <span className="text-4xl font-bold text-zinc-800 select-none">{idx + 1}</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent opacity-60" />
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <p className="text-xs font-mono text-zinc-400 truncate">{getDomain(screen.url)}</p>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-center text-xs text-zinc-500">
                                            {screen.starttime ? (
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {screen.starttime} - {screen.endtime}</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><Clock size={12} /> {screen.duration || 20}m</span>
                                            )}
                                            <a href={screen.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400"><ExternalLink size={12} /></a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded-xl p-6 text-white shadow-lg shadow-indigo-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-1">{device.deviceId}</h3>
                        <p className="text-indigo-200 text-xs font-mono mb-4">{device.$id}</p>
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isOnline ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-100'}`}>
                                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold mb-2">Last Seen</span>
                    <span className="text-2xl font-mono text-zinc-100">
                        {device.last_seen ? new Date(device.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">
                        {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Never'}
                    </span>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold mb-2">Refresh Rate</span>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-mono text-zinc-100">{devMode ? '2m' : '15m'}</span>
                        {devMode && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">DEV</span>}
                    </div>
                    <span className="text-xs text-zinc-500 mt-1">
                        {devMode ? 'Fast refresh enabled' : 'Standard battery saver'}
                    </span>
                </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Settings size={14} /> Device Configuration
                    </h3>
                    {!isEditingSettings ? (
                        <button onClick={() => setIsEditingSettings(true)} className="text-xs text-blue-400 hover:text-blue-300">Edit Settings</button>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditingSettings(false)} className="text-xs text-zinc-400 hover:text-zinc-300">Cancel</button>
                            <button onClick={handleSave} className="text-xs text-blue-400 hover:text-blue-300 font-bold">Save Changes</button>
                        </div>
                    )}
                </div>
                
                <div className="p-6 space-y-6">
                    {isEditingSettings ? (
                        <div className="space-y-4 max-w-xl">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Device Name</label>
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0" />
                                    <span className="text-sm text-zinc-300">Dev Mode (2m refresh)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0" />
                                    <span className="text-sm text-zinc-300">Randomize Screens</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-2">First Day of Week</label>
                                    <div className="flex gap-2">
                                        {['monday', 'sunday'].map((day) => (
                                            <button
                                                key={day}
                                                onClick={() => setFirstDay(day as 'monday' | 'sunday')}
                                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border ${firstDay === day ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-2">Conditions Update (min)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="15" 
                                        value={conditionsInterval}
                                        onChange={(e) => setConditionsInterval(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-zinc-800">
                                <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2">
                                    <Trash2 size={14} /> Delete Device
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <span className="text-xs font-medium text-zinc-500 mb-2 block">Connection URLs</span>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Config JSON</span>
                                        <code className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 block break-all select-all">{deviceUrl}</code>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Health Check</span>
                                        <code className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 block break-all select-all">{healthUrl}</code>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-zinc-500 mb-2 block">Current Settings</span>
                                <ul className="space-y-2 text-sm text-zinc-400">
                                    <li className="flex justify-between border-b border-zinc-800/50 pb-1">
                                        <span>Randomize</span>
                                        <span className={randomize ? 'text-green-400' : 'text-zinc-600'}>{randomize ? 'Enabled' : 'Disabled'}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-zinc-800/50 pb-1">
                                        <span>Refresh Interval</span>
                                        <span>{devMode ? '2 min' : '15 min'}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-zinc-800/50 pb-1">
                                        <span>First Day</span>
                                        <span className="capitalize">{firstDay}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-zinc-800/50 pb-1">
                                        <span>Conditions Check</span>
                                        <span>{conditionsInterval} min</span>
                                    </li>
                                    <li className="flex justify-between border-b border-zinc-800/50 pb-1">
                                        <span>Screens</span>
                                        <span>{screens.length}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
