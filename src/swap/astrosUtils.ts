export async function isAstrosGasFreeSwapAvailable(
    wsSolCoinType: string,
    walCoinType: string,
    amount: string,
    sender: string
): Promise<boolean> {
    const url = `https://aggregator.astroswap.org/route?fromCoinType=${wsSolCoinType}&toCoinType=${walCoinType}&amount=${amount}&sender=${sender}`;

    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to query Astros aggregator");

        // ✅ Explicitly parse the response as JSON
		const data = (await res.json()) as Record<string, any>;

        // ✅ Ensure the response is an object
        if (typeof data !== "object" || data === null) {
            throw new Error("Invalid response from Astros API");
        }

        return data.gasFree ?? false;
    } catch (error) {
        console.error("Astros API Error:", error);
        return false;
    } finally {
        clearTimeout(timeout);
    }
}
