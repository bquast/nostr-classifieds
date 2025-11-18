export async function onRequest(context) {
    try {
        const url = new URL(context.request.url);
        const until = url.searchParams.get('until');
        const events = await fetchClassifiedsFromNostr(until ? parseInt(until) : undefined);
        return new Response(JSON.stringify(events), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch classifieds: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function fetchClassifiedsFromNostr(until) {
    const relayUrls = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.net',
        'wss://relay.snort.social',
        'wss://nostr.wine',
        'wss://purplepag.es'
    ]; // More relays for better coverage

    const allEvents = [];
    const subId = 'classifieds_' + Math.random().toString(36).substring(2);

    for (const relayUrl of relayUrls) {
        const eventsFromRelay = await connectAndFetch(relayUrl, subId, until);
        allEvents.push(...eventsFromRelay);
    }

    // Deduplicate by event ID
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());

    // Sort by created_at descending
    uniqueEvents.sort((a, b) => b.created_at - a.created_at);

    // Limit to 20 recent ones
    return uniqueEvents.slice(0, 20);
}

function connectAndFetch(relayUrl, subId, until) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl);
        const events = [];
        let eoseReceived = false;

        ws.onopen = () => {
            const filter = { kinds: [30402], limit: 100 };
            if (until !== undefined) {
                filter.until = until;
            }
            ws.send(JSON.stringify(['REQ', subId, filter]));
        };

        ws.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data[0] === 'EVENT' && data[1] === subId) {
                events.push(data[2]);
            } else if (data[0] === 'EOSE' && data[1] === subId) {
                eoseReceived = true;
                ws.close();
            }
        };

        ws.onclose = () => {
            if (eoseReceived || events.length > 0) {
                resolve(events);
            } else {
                reject(new Error('Connection closed without EOSE or events from ' + relayUrl));
            }
        };

        ws.onerror = (error) => {
            ws.close();
            reject(error);
        };
    });
}