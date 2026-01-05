import { databases, APPWRITE_CONFIG } from '@/lib/server/appwrite';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;
    const { searchParams } = new URL(request.url);
    const lastUpdatedStr = searchParams.get('lastupdated');

    if (!lastUpdatedStr) {
        return NextResponse.json({ status: 'ignored', message: 'Missing lastupdated parameter' });
    }

    try {
        const updateData: any = {
            last_seen: new Date().toISOString(),
            last_updated: lastUpdatedStr
        };

        await databases.updateDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTION_ID,
            deviceId,
            updateData
        );

        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('Error updating health:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
