'use client';

import { useEffect, useState } from 'react';
import { account, databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';
import { ID, Query, Permission, Role } from 'appwrite';
import DeviceDashboard from '@/components/DeviceDashboard';
import { Plus, LogOut, RefreshCw, Monitor, Wifi, WifiOff } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const userData = await account.get();
            setUser(userData);
            fetchDevices();
        } catch (e) {
            router.push('/login');
        }
    };

    const fetchDevices = async () => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.COLLECTION_ID,
                [
                    Query.orderDesc('$createdAt')
                ]
            );
            setDevices(response.documents);
            if (response.documents.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(response.documents[0].$id);
            }
        } catch (e) {
            console.error('Error fetching devices:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            router.push('/login');
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    const createDevice = async () => {
        setCreating(true);
        try {
            const defaultScreens = [
                { url: 'https://news.ycombinator.com', duration: 60 }
            ];

            const newDevice = await databases.createDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.COLLECTION_ID,
                ID.unique(),
                {
                    deviceId: `New Device ${devices.length + 1}`,
                    ownerId: user.$id,
                    screens: JSON.stringify(defaultScreens),
                    randomize_screens: false,
                    json_refresh_interval: 15,
                    last_seen: null,
                    last_updated: null
                },
                [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id))
                ]
            );
            await fetchDevices();
            setSelectedDeviceId(newDevice.$id);
        } catch (e) {
            alert('Failed to create device');
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const deleteDevice = async (id: string) => {
        if (!confirm('Are you sure you want to delete this device?')) return;
        
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.COLLECTION_ID,
                id
            );
            const newDevices = devices.filter(d => d.$id !== id);
            setDevices(newDevices);
            if (selectedDeviceId === id) {
                setSelectedDeviceId(newDevices.length > 0 ? newDevices[0].$id : null);
            }
        } catch (e) {
            alert('Failed to delete device');
            console.error(e);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const selectedDevice = devices.find(d => d.$id === selectedDeviceId);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
            <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2">
                                 <h1 className="text-xl font-bold text-zinc-100 tracking-tight">openInk Cloud</h1>
                                 <span className="px-2 py-1 rounded-md text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/5">BETA</span>
                             </div>
                         </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-zinc-500">Logged in as</span>
                                <span className="text-sm font-medium text-zinc-300">{user?.name}</span>
                            </div>
                            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
                            <button 
                                onClick={handleLogout}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-1 w-full flex flex-col lg:flex-row">
                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 order-2 lg:order-1">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">{getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!</h2>
                        <p className="text-zinc-500 text-sm mt-1">Manage your e-ink displays and their content</p>
                    </div>

                    {selectedDevice ? (
                        <DeviceDashboard 
                            device={selectedDevice} 
                            onDelete={() => deleteDevice(selectedDevice.$id)}
                            onUpdate={fetchDevices}
                        />
                    ) : (
                        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                            <h3 className="text-lg font-medium text-zinc-300 mb-2">No devices found</h3>
                            <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Get started by creating your first device configuration to display on your e-ink screen.</p>
                            <button 
                                onClick={createDevice}
                                className="text-blue-400 font-medium hover:text-blue-300 hover:underline"
                            >
                                Create your first device
                            </button>
                        </div>
                    )}
                </main>

                <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-l border-zinc-800 bg-zinc-900/30 p-4 sm:p-6 order-1 lg:order-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Your Devices</h3>
                        <button 
                            onClick={createDevice}
                            disabled={creating}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Add Device"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {devices.map(device => {
                            const isOnline = device.last_seen && (new Date().getTime() - new Date(device.last_seen).getTime() < 7 * 60 * 1000);
                            return (
                                <button
                                    key={device.$id}
                                    onClick={() => setSelectedDeviceId(device.$id)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                                        selectedDeviceId === device.$id 
                                        ? 'bg-zinc-800 border-zinc-700 shadow-lg' 
                                        : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className={`font-medium text-sm ${selectedDeviceId === device.$id ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                {device.deviceId}
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">
                                                {device.$id}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={isOnline ? 'text-emerald-500' : 'text-zinc-700'}>
                                        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>
            </div>
        </div>
    );
}
