document.addEventListener('DOMContentLoaded', () => {
    fetchClassifieds();
});

async function fetchClassifieds() {
    try {
        const response = await fetch('/api');
        if (!response.ok) {
            throw new Error('Failed to fetch classifieds');
        }
        const events = await response.json();
        displayClassifieds(events);
    } catch (error) {
        const list = document.getElementById('classifieds-list');
        list.innerHTML = '<p>Error loading classifieds: ' + error.message + '</p>';
    }
}

function displayClassifieds(events) {
    const list = document.getElementById('classifieds-list');
    list.innerHTML = ''; // Clear loading message

    if (events.length === 0) {
        list.innerHTML = '<p>No classifieds found.</p>';
        return;
    }

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'classified-card';

        const title = getTag(event, 'title') || 'Untitled';
        const summary = getTag(event, 'summary') || event.content.substring(0, 100) + '...';
        const image = getTag(event, 'image');
        const priceTag = event.tags.find(t => t[0] === 'price');
        const price = priceTag ? `${priceTag[1]} ${priceTag[2] || ''} ${priceTag[3] || ''}`.trim() : 'Price not specified';
        const location = getTag(event, 'location') || 'Location not specified';
        const publishedAt = new Date((getTag(event, 'published_at') || event.created_at) * 1000).toLocaleString();

        card.innerHTML = `
            <h2>${title}</h2>
            ${image ? `<img src="${image}" alt="${title}">` : ''}
            <p>${summary}</p>
            <p class="price">Price: ${price}</p>
            <p class="location">Location: ${location}</p>
            <p class="published">Published: ${publishedAt}</p>
        `;

        list.appendChild(card);
    });
}

function getTag(event, name) {
    const tag = event.tags.find(t => t[0] === name);
    return tag ? tag[1] : null;
}