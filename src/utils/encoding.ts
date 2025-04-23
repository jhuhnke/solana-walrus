export async function getStorageQuote(bytes: number): Promise<number> {
    // Placeholder: fetch price from Walrus
    return 0.01 * (bytes / 1000); 
}

export async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer); 
    return Buffer.from(hashBuffer).toString('hex'); 
}