import { braceletState } from './builder.js';
import { getCharmHTML } from './utils.js';

export function initStory() {
    const storyModalOverlay = document.getElementById('story-modal-overlay');
    if (!storyModalOverlay) return;

    const viewStoryBtn = document.getElementById('view-story-btn');
    const closeStoryBtn = document.getElementById('close-story-btn');
    
    // Slideshow elements
    const progressBar = document.getElementById('slideshow-progress-bar');
    const linkWrapper = document.getElementById('slideshow-link-wrapper');
    const charmNameEl = document.getElementById('slideshow-charm-name');
    const charmMemoryEl = document.getElementById('slideshow-charm-memory');
    
    const arrowPrev = document.getElementById('slideshow-arrow-prev');
    const arrowNext = document.getElementById('slideshow-arrow-next');
    const zonePrev = document.getElementById('story-nav-prev');
    const zoneNext = document.getElementById('story-nav-next');

    // Slideshow State
    let activeSlides = [];
    let currentSlideIndex = 0;
    const slideDuration = 4000; // 4 seconds per slide
    let elapsedTime = 0;
    let isPaused = false;
    let lastTimestamp = 0;
    let animationFrameId = null;

    function openStoryModal() {
        if (braceletState.placedCharms.length === 0) {
            alert('Belum ada charm di gelangmu! Tambahkan setidaknya satu charm untuk melihat kisahnya.');
            return;
        }

        // Sort placed charms by slotIndex to match physical layout
        activeSlides = [...braceletState.placedCharms].sort((a, b) => a.slotIndex - b.slotIndex);
        
        // Initialize Segmented Progress Bars
        progressBar.innerHTML = '';
        activeSlides.forEach(() => {
            const segment = document.createElement('div');
            segment.className = 'story-progress-segment';
            segment.innerHTML = '<div class="story-progress-fill"></div>';
            progressBar.appendChild(segment);
        });

        // Open Modal
        storyModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Load First Slide
        showSlide(0);

        // Start Loop
        lastTimestamp = 0;
        animationFrameId = requestAnimationFrame(loop);
    }

    function closeStoryModal() {
        storyModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function showSlide(index) {
        currentSlideIndex = index;
        elapsedTime = 0;

        // Reset all fills
        const fills = progressBar.querySelectorAll('.story-progress-fill');
        fills.forEach((fill, i) => {
            if (i < index) {
                fill.style.width = '100%';
            } else {
                fill.style.width = '0%';
            }
        });

        // Load content
        const slide = activeSlides[index];
        if (slide) {
            linkWrapper.innerHTML = getCharmHTML(slide.charm.image, '', slide.charm.name);
            charmNameEl.textContent = slide.charm.name;
            charmMemoryEl.textContent = slide.memoryName ? `"${slide.memoryName}"` : 'Tulis cerita kenanganmu di sini...';
        }
    }

    function nextSlide() {
        const nextIndex = (currentSlideIndex + 1) % activeSlides.length;
        showSlide(nextIndex);
    }

    function prevSlide() {
        const prevIndex = (currentSlideIndex - 1 + activeSlides.length) % activeSlides.length;
        showSlide(prevIndex);
    }

    function loop(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        if (storyModalOverlay.classList.contains('active') && activeSlides.length > 0) {
            if (!isPaused) {
                elapsedTime += delta;
                if (elapsedTime >= slideDuration) {
                    nextSlide();
                } else {
                    const fills = progressBar.querySelectorAll('.story-progress-fill');
                    if (fills[currentSlideIndex]) {
                        fills[currentSlideIndex].style.width = `${(elapsedTime / slideDuration) * 100}%`;
                    }
                }
            }
            animationFrameId = requestAnimationFrame(loop);
        }
    }

    // Event Bindings
    if (viewStoryBtn) viewStoryBtn.addEventListener('click', openStoryModal);
    if (closeStoryBtn) closeStoryBtn.addEventListener('click', closeStoryModal);

    storyModalOverlay.addEventListener('click', (e) => {
        if (e.target === storyModalOverlay) {
            closeStoryModal();
        }
    });

    // Navigation triggers
    if (arrowPrev) arrowPrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
    if (arrowNext) arrowNext.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
    if (zonePrev) zonePrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
    if (zoneNext) zoneNext.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });

    // Pause holding events (mouse + touch)
    const pauseEvents = ['mousedown', 'touchstart'];
    const resumeEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

    const container = storyModalOverlay.querySelector('.story-slideshow-modal');
    if (container) {
        pauseEvents.forEach(evt => {
            container.addEventListener(evt, () => {
                isPaused = true;
            }, { passive: true });
        });

        resumeEvents.forEach(evt => {
            container.addEventListener(evt, () => {
                isPaused = false;
            }, { passive: true });
        });
    }
}
