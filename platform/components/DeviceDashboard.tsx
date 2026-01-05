'use client';

import { useState, useEffect } from 'react';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { Trash2, Settings, Save, Plus, X, Monitor, Clock, Calendar, Link as LinkIcon, Activity, Wifi, WifiOff, Edit2, ExternalLink } from 'lucide-react';

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

export default function DeviceDashboard({ device, onDelete, onUpdate }: { device: Device, onDelete: () => void, onUpdate: () => void }) {
    const [screens, setScreens] = useState<Screen[]>([]);
    const [randomize, setRandomize] = useState(device.randomize_screens);
    const [devMode, setDevMode] = useState(device.json_refresh_interval === 2);
    const [deviceName, setDeviceName] = useState(device.deviceId);
    const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);

    useEffect(() => {
        try {
            setScreens(JSON.parse(device.screens));
        } catch {
            setScreens([]);
        }
        setRandomize(device.randomize_screens);
        setDevMode(device.json_refresh_interval === 2);
        setDeviceName(device.deviceId);
    }, [device]);

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

    const removeScreen = (index: number) => {
        setScreens(screens.filter((_, i) => i !== index));
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
                            <button onClick={handleSave} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500">Save Playlist</button>
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
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-zinc-500" />
                                            <input
                                                type="number"
                                                value={screen.duration || 20}
                                                onChange={(e) => updateScreen(idx, 'duration', parseInt(e.target.value))}
                                                className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200"
                                            />
                                            <span className="text-xs text-zinc-500">min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={addScreen} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Add Screen
                        </button>
                    </div>
                ) : (
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
                                        <span className="flex items-center gap-1"><Clock size={12} /> {screen.duration || 20}m</span>
                                        <a href={screen.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400"><ExternalLink size={12} /></a>
                                    </div>
                                </div>
                            </div>
                        ))}
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
