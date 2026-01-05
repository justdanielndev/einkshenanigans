import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

export const databases = new Databases(client);

export const APPWRITE_CONFIG = {
    DATABASE_ID: 'inkdb',
    COLLECTION_ID: 'devices',
};
