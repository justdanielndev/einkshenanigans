'use client';

import { useState } from 'react';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { Trash2, Settings, Save, Plus, X, Monitor, Clock, Calendar, Link as LinkIcon, Activity, Wifi, WifiOff } from 'lucide-react';

interface Screen {
    url: string;
    duration?: number;
    starttime?: string;
    endtime?: string;
}

interface Device {
    $id: string;
    deviceId: string;
    screens: string;
    randomize_screens: boolean;
    json_refresh_interval: number;
    last_seen?: string;
    last_updated?: string;
    dev_mode?: boolean;
}

export default function DeviceCard({ device, onDelete, onUpdate }: { device: Device, onDelete: () => void, onUpdate: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [screens, setScreens] = useState<Screen[]>(() => {
        try {
            return JSON.parse(device.screens);
        } catch {
            return [];
        }
    });
    const [randomize, setRandomize] = useState(device.randomize_screens);
    const [devMode, setDevMode] = useState(device.json_refresh_interval === 2);
    const [deviceName, setDeviceName] = useState(device.deviceId);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const deviceUrl = `${baseUrl}/api/${device.$id}/device.json`;
    const healthUrl = `${baseUrl}/api/${device.$id}/health`;

    const isOnline = device.last_updated && (new Date().getTime() - new Date(device.last_updated).getTime() < 7 * 60 * 1000);

    const handleSave = async () => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.COLLECTION_ID,
                device.$id,
                {
                    screens: JSON.stringify(screens),
                    randomize_screens: randomize,
                    json_refresh_interval: devMode ? 2 : 15,
                    deviceId: deviceName,
                    last_edited: new Date().toISOString()
                }
            );
            setIsEditing(false);
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

    const removeScreen = (index: number) => {
        setScreens(screens.filter((_, i) => i !== index));
    };

    return (
        <div className={`bg-zinc-900 border rounded-xl overflow-hidden shadow-lg transition-all ${isEditing ? 'border-blue-500/30 ring-1 ring-blue-500/30' : 'border-zinc-800 hover:border-zinc-700'}`}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-100">{device.deviceId}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">{device.$id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsEditing(!isEditing)} 
                            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
                            title="Configure Device"
                        >
                            <Settings size={18} />
                        </button>
                        {!isEditing && (
                            <button 
                                onClick={onDelete} 
                                className="p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                                title="Delete Device"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                            <span className="text-zinc-500 text-xs block mb-1">Last Seen</span>
                            <span className={`font-medium ${device.last_seen ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                            </span>
                        </div>
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                            <span className="text-zinc-500 text-xs block mb-1">Active Screens</span>
                            <span className="text-zinc-300 font-medium">
                                {screens.length} screens in rotation
                            </span>
                        </div>
                    </div>
                )}

                {isEditing && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 border-t border-zinc-800/50 mt-4">
                        
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <LinkIcon size={12} /> Connection Details
                            </h4>
                            <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50 space-y-3">
                                <div>
                                    <span className="text-xs font-medium text-zinc-500 mb-1 block">Configuration URL</span>
                                    <code className="text-xs text-blue-400 break-all font-mono select-all block bg-zinc-900/50 p-2 rounded border border-zinc-800/50">{deviceUrl}</code>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-zinc-500 mb-1 block">Health Check URL</span>
                                    <code className="text-xs text-emerald-400 break-all font-mono select-all block bg-zinc-900/50 p-2 rounded border border-zinc-800/50">{healthUrl}</code>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Activity size={12} /> Settings
                            </h4>
                            <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-2">Device Name</label>
                                    <input
                                        type="text"
                                        value={deviceName}
                                        onChange={(e) => setDeviceName(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-zinc-900/50 transition-colors">
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${devMode ? 'bg-blue-600 border-blue-600' : 'border-zinc-700 bg-zinc-950'}`}>
                                            {devMode && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={devMode}
                                            onChange={(e) => setDevMode(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 block">Dev Mode</span>
                                            <span className="text-[10px] text-zinc-500 block">Fast refresh (2m). Auto-disables after 15m.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-zinc-900/50 transition-colors">
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${randomize ? 'bg-blue-600 border-blue-600' : 'border-zinc-700 bg-zinc-950'}`}>
                                            {randomize && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={randomize}
                                            onChange={(e) => setRandomize(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 block">Randomize Screens</span>
                                            <span className="text-[10px] text-zinc-500 block">Shuffle screens order on every fetch.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    Screens
                                </h4>
                                <button 
                                    onClick={addScreen} 
                                    className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20"
                                >
                                    <Plus size={14} /> Add Screen
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {screens.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-lg">
                                        <p className="text-zinc-500 text-sm">No screens configured.</p>
                                    </div>
                                )}
                                {screens.map((screen, idx) => (
                                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 relative group hover:border-zinc-700 transition-colors">
                                        <button 
                                            onClick={() => removeScreen(idx)}
                                            className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            title="Remove Screen"
                                        >
                                            <X size={16} />
                                        </button>
                                        
                                        <div className="mb-3 pr-6">
                                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Content URL</label>
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value={screen.url}
                                                onChange={(e) => updateScreen(idx, 'url', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 font-mono"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1"><Clock size={10}/> Duration (m)</label>
                                                <input
                                                    type="number"
                                                    value={screen.duration || 20}
                                                    onChange={(e) => updateScreen(idx, 'duration', parseInt(e.target.value))}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1"><Calendar size={10}/> Start Time</label>
                                                <input
                                                    type="time"
                                                    value={screen.starttime || ''}
                                                    onChange={(e) => updateScreen(idx, 'starttime', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1"><Calendar size={10}/> End Time</label>
                                                <input
                                                    type="time"
                                                    value={screen.endtime || ''}
                                                    onChange={(e) => updateScreen(idx, 'endtime', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                            <button 
                                onClick={onDelete} 
                                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={16} /> Delete Device
                            </button>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="text-zinc-400 hover:text-zinc-300 text-sm px-4 py-2"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-500 transition-colors text-sm font-medium shadow-lg shadow-blue-900/20"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
