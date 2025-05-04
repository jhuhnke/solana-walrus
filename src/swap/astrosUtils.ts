export async function isAstrosGasFreeSwapAvailable(
	wsSolCoinType: string,
	walCoinType: string,
	amount: string,
	sender: string
): Promise<boolean> {
	const url = `https://aggregator.astroswap.org/route?fromCoinType=${wsSolCoinType}&toCoinType=${walCoinType}&amount=${amount}&sender=${sender}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to query Astros aggregator');

	const data = await res.json();
	return data.gasSponsored === true;
}