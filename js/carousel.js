export function initCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    
    // Store original slides
    const slides = Array.from(track.children);
    const N = slides.length;
    if (N === 0) return;

    const cloneCount = 3;
    let currentIndex = 0;
    let itemsPerView = 1;
    let isTransitioning = false;

    // Create and insert clones
    const firstClones = slides.slice(0, cloneCount).map(s => s.cloneNode(true));
    const lastClones = slides.slice(-cloneCount).map(s => s.cloneNode(true));

    // Append first clones
    firstClones.forEach(clone => {
        clone.classList.add('clone');
        track.appendChild(clone);
    });

    // Prepend last clones (inserting in normal order before the original first slide)
    const originalFirstSlide = slides[0];
    lastClones.forEach(clone => {
        clone.classList.add('clone');
        track.insertBefore(clone, originalFirstSlide);
    });

    function updateItemsPerView() {
        const width = window.innerWidth;
        if (width >= 1024) {
            itemsPerView = 3;
        } else if (width >= 640) {
            itemsPerView = 2;
        } else {
            itemsPerView = 1;
        }
    }

    // Generate dots (one for each original slide)
    function generateDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        for (let i = 0; i < N; i++) {
            const dot = document.createElement('div');
            dot.className = `dot ${i === currentIndex ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                moveToSlide(i);
            });
            dotsContainer.appendChild(dot);
        }
    }

    function updateDots() {
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('.dot');
        const activeIndex = (currentIndex % N + N) % N;
        dots.forEach((dot, index) => {
            if (index === activeIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function getSlideWidthAndGap() {
        const anySlide = track.querySelector('.carousel-slide');
        const slideWidth = anySlide ? anySlide.getBoundingClientRect().width : 0;
        const gap = 24; // matches gap in CSS
        return { slideWidth, gap };
    }

    function jumpToSlide(index) {
        currentIndex = index;
        const domIndex = currentIndex + cloneCount;
        const { slideWidth, gap } = getSlideWidthAndGap();
        const amountToMove = domIndex * (slideWidth + gap);
        
        track.style.transition = 'none';
        track.style.transform = `translateX(-${amountToMove}px)`;
        
        // Force reflow to ensure styles apply instantly
        track.offsetHeight;
        
        updateDots();
    }

    function moveToSlide(index) {
        if (isTransitioning) return;
        isTransitioning = true;
        
        currentIndex = index;
        const domIndex = currentIndex + cloneCount;
        const { slideWidth, gap } = getSlideWidthAndGap();
        const amountToMove = domIndex * (slideWidth + gap);
        
        track.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(-${amountToMove}px)`;
        
        updateDots();
    }

    // Handle seamless wrap on transition end
    track.addEventListener('transitionend', () => {
        isTransitioning = false;
        if (currentIndex >= N) {
            jumpToSlide(currentIndex - N);
        } else if (currentIndex < 0) {
            jumpToSlide(currentIndex + N);
        }
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            moveToSlide(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            moveToSlide(currentIndex + 1);
        });
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        updateItemsPerView();
        generateDots();
        jumpToSlide(currentIndex);
    });

    // Touch events for swipe support
    let startX = 0;
    let isSwiping = false;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isSwiping = true;
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const diffX = e.touches[0].clientX - startX;
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                moveToSlide(currentIndex - 1);
            } else {
                moveToSlide(currentIndex + 1);
            }
            isSwiping = false; // block multiple moves in single swipe
        }
    }, { passive: true });

    track.addEventListener('touchend', () => {
        isSwiping = false;
    });

    // Setup initially
    updateItemsPerView();
    generateDots();
    jumpToSlide(0);
}
