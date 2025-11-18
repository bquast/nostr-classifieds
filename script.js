document.addEventListener('DOMContentLoaded', () => {
    fetchClassifieds(false);
    initInfiniteScroll();
    document.getElementById('load-more').addEventListener('click', () => {
        fetchClassifieds(true);
    });
});

let lastTimestamp = null;
let seenIds = new Set();
let loadCount = 0;
const MAX_AUTO_LOADS = 3;
const BATCH_SIZE = 20; // Assumed from API

async function fetchClassifieds(append = false) {
    try {
        let url = '/api';
        if (lastTimestamp !== null) {
            url += `?until=${lastTimestamp}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch classifieds');
        }
        const events = await response.json();
        const newEvents = events.filter(event => !seenIds.has(event.id));
        newEvents.forEach(event => seenIds.add(event.id));
        displayClassifieds(newEvents, append);
        if (newEvents.length > 0) {
            lastTimestamp = newEvents[newEvents.length - 1].created_at;
        }
        loadCount++;
        updateLoadingUI(newEvents.length);
    } catch (error) {
        const list = document.getElementById('classifieds-list');
        list.innerHTML += '<p>Error loading more classifieds: ' + error.message + '</p>';
    }
}

function displayClassifieds(events, append = false) {
    const list = document.getElementById('classifieds-list');
    if (!append) {
        list.innerHTML = ''; // Clear for initial load
    }

    if (events.length === 0 && list.innerHTML === '') {
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

function initInfiniteScroll() {
    const sentinel = document.getElementById('loading');
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && loadCount < MAX_AUTO_LOADS) {
            fetchClassifieds(true);
        }
    });
    observer.observe(sentinel);
}

function updateLoadingUI(newCount) {
    const loading = document.getElementById('loading');
    const loadMore = document.getElementById('load-more');

    if (newCount < BATCH_SIZE) {
        // Assume no more
        loading.style.display = 'none';
        loadMore.style.display = 'none';
        const list = document.getElementById('classifieds-list');
        list.insertAdjacentHTML('beforeend', '<p>No more classifieds to load.</p>');
    } else if (loadCount >= MAX_AUTO_LOADS) {
        loading.style.display = 'none';
        loadMore.style.display = 'block';
    }
    // Else, keep loading visible for auto
}