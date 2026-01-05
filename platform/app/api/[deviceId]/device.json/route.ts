import { databases, APPWRITE_CONFIG } from '@/lib/server/appwrite';
import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    try {
        const device = await databases.getDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTION_ID,
            deviceId
        );

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        let screens = [];
        try {
            screens = typeof device.screens === 'string' ? JSON.parse(device.screens) : device.screens;
        } catch (e) {
            console.error('Error parsing screens JSON', e);
            screens = [];
        }

        let refreshInterval = device.json_refresh_interval || 15;
        
        if (refreshInterval === 2) {
            const lastEdited = device.last_edited ? new Date(device.last_edited) : null;
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            
            if (!lastEdited || lastEdited < fifteenMinutesAgo) {
                refreshInterval = 15;
                
                databases.updateDocument(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.COLLECTION_ID,
                    deviceId,
                    { json_refresh_interval: 15 }
                ).catch(err => console.error('Failed to revert dev mode:', err));
            }
        }

        const response = {
            screens: screens,
            randomize_screens: device.randomize_screens,
            json_refresh_interval: refreshInterval
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Error fetching device config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
