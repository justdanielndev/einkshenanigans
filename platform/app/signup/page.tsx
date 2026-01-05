'use client';

import { useState } from 'react';
import Image from 'next/image';
import { account } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ID } from 'appwrite';
import { Monitor } from 'lucide-react';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await account.create(ID.unique(), email, password, name);
            await account.createEmailPasswordSession(email, password);
            router.push('/');
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 w-96">
                <div className="flex justify-center mb-6">
                    <Image
                        src="/cloudname.png"
                        alt="openInk Cloud"
                        width={1000}
                        height={100}
                    />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-center text-zinc-100">Create Account</h1>
                <p className="text-zinc-500 text-center mb-8 text-sm">Register to manage your device(s).</p>
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                            required
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                            required
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-zinc-700 text-white p-3 rounded-lg font-medium hover:bg-zinc-600 transition-colors shadow-lg shadow-zinc-900/50 mt-2"
                    >
                        Sign Up
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-zinc-500">
                    Already have an account? <Link href="/login" className="text-zinc-300 hover:text-zinc-100 font-medium">Login</Link>
                </p>
            </div>
        </div>
    );
}
