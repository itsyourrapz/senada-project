import { braceletState } from './builder.js';
import { formatIDR, getCharmHTML } from './utils.js';

export function initOrder() {
    const orderModalOverlay = document.getElementById('order-modal-overlay');
    if (!orderModalOverlay) return;

    const reviewOrderBtn = document.getElementById('review-order-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Modal Elements
    const modalPreview = document.getElementById('modal-preview');
    const modalSize = document.getElementById('modal-size');
    const modalCharmCount = document.getElementById('modal-charm-count');
    const modalCharmList = document.getElementById('modal-charm-list');
    const modalTotalPrice = document.getElementById('modal-total-price');

    // Modal Action Buttons
    const modalOrderBtn = document.getElementById('modal-order-btn');

    // Direct Action Buttons from Summary Card
    const directOrderBtn = document.getElementById('direct-order-btn');

    function openModal() {
        populateModal();
        orderModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        orderModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (reviewOrderBtn) {
        reviewOrderBtn.addEventListener('click', openModal);
    }
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', openModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (orderModalOverlay) {
        orderModalOverlay.addEventListener('click', (e) => {
            if (e.target === orderModalOverlay) {
                closeModal();
            }
        });
    }

    // Auto-open review modal if query parameter is present (redirected from landing cart)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'review') {
        setTimeout(() => {
            openModal();
        }, 150);
    }

    function populateModal() {
        modalSize.textContent = braceletState.sizeLabel;
        modalCharmCount.textContent = `${braceletState.placedCharms.length} / ${braceletState.slots}`;
        modalTotalPrice.textContent = formatIDR(braceletState.totalPrice);
        
        // Populate Charms List
        modalCharmList.innerHTML = '';
        if (braceletState.placedCharms.length === 0) {
            modalCharmList.innerHTML = '<li>No charms selected.</li>';
        } else {
            // Group by charm name
            const charmCounts = {};
            braceletState.placedCharms.forEach(pc => {
                charmCounts[pc.charm.name] = (charmCounts[pc.charm.name] || 0) + 1;
            });
            
            for (const [name, count] of Object.entries(charmCounts)) {
                const li = document.createElement('li');
                li.textContent = `${count}x ${name}`;
                modalCharmList.appendChild(li);
            }
        }
        
        // Render Circular Preview
        renderMiniPreview();
    }

    let modalRotationY = 0;
    let isDraggingModal = false;
    let modalStartX = 0;
    let modalStartRotationY = 0;
    let modalAnimationFrameId = null;
    let lastTime = 0;

    function renderMiniPreview() {
        const modalBracelet3D = document.getElementById('modal-bracelet-3d');
        if (!modalBracelet3D) return;
        
        modalBracelet3D.innerHTML = '';
        
        const count = braceletState.slots;
        const slotWidth = 46;
        const radius = Math.max(90, (slotWidth / 2) / Math.tan(Math.PI / count)) + 5;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 360;
            
            const slot3d = document.createElement('div');
            slot3d.className = 'slot-3d';
            slot3d.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
            
            const pc = braceletState.placedCharms.find(p => p.slotIndex === i);
            if (pc) {
                slot3d.innerHTML = getCharmHTML(pc.charm.image, '', pc.charm.name);
                slot3d.classList.add('has-charm');
            }
            
            modalBracelet3D.appendChild(slot3d);
        }
    }

    function animateModal3D(time) {
        if (!lastTime) lastTime = time;
        const delta = time - lastTime;
        lastTime = time;

        if (orderModalOverlay.classList.contains('active') && !isDraggingModal) {
            modalRotationY = (modalRotationY + 0.02 * delta) % 360;
            const modalBracelet3D = document.getElementById('modal-bracelet-3d');
            if (modalBracelet3D) {
                modalBracelet3D.style.transform = `rotateY(${modalRotationY}deg)`;
            }
        }
        modalAnimationFrameId = requestAnimationFrame(animateModal3D);
    }
    
    modalAnimationFrameId = requestAnimationFrame(animateModal3D);

    if (modalPreview) {
        const startDrag = (clientX) => {
            isDraggingModal = true;
            modalStartX = clientX;
            modalStartRotationY = modalRotationY;
        };

        const moveDrag = (clientX) => {
            if (!isDraggingModal) return;
            const deltaX = clientX - modalStartX;
            modalRotationY = modalStartRotationY + deltaX * 0.5;
            const modalBracelet3D = document.getElementById('modal-bracelet-3d');
            if (modalBracelet3D) {
                modalBracelet3D.style.transform = `rotateY(${modalRotationY}deg)`;
            }
        };

        const endDrag = () => {
            if (isDraggingModal) {
                isDraggingModal = false;
                lastTime = performance.now();
            }
        };

        modalPreview.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX);
        });

        document.addEventListener('mousemove', (e) => {
            moveDrag(e.clientX);
        });

        document.addEventListener('mouseup', endDrag);

        modalPreview.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            moveDrag(e.touches[0].clientX);
        }, { passive: true });

        document.addEventListener('touchend', endDrag);
    }

    // Shared Google Form Order Logic
    function triggerGoogleFormOrder() {
        let charmListText = '';
        if (braceletState.placedCharms.length > 0) {
            // Group and summarize placed charms and slot indices
            braceletState.placedCharms.forEach(pc => {
                charmListText += `* Slot ${pc.slotIndex + 1}: ${pc.charm.name}${pc.memoryName ? ` ("${pc.memoryName}")` : ''}\n`;
            });
        } else {
            charmListText = "Hanya Base Polos (Tanpa Charm)\n";
        }

        const details = `Pemesanan Custom Bracelet Senada:
Ukuran Pergelangan: ${braceletState.sizeLabel}
Total Charm: ${braceletState.placedCharms.length}
Estimasi Harga: ${formatIDR(braceletState.totalPrice)}

Susunan Charm & Cerita Memori:
${charmListText}`;

        // Placeholder Google Form URL (Pre-filled query parameters)
        // Feel free to replace the Form ID and Entry ID when deploying
        const FORM_ID = '1FAIpQLSfZF6k0fDmdJ1z_X0k3X9X_vK92z9z9z9z9z9z9z9z9z9z9za'; // Placeholder Form ID
        const ENTRY_ID = 'entry.1000001'; // Placeholder Entry ID for Order Details
        const formUrl = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?usp=pp_url&${ENTRY_ID}=${encodeURIComponent(details)}`;
        
        window.open(formUrl, '_blank');
    }

    // Bind Modal Button
    if (modalOrderBtn) {
        modalOrderBtn.addEventListener('click', triggerGoogleFormOrder);
    }

    // Bind Direct Summary Card Button
    if (directOrderBtn) {
        directOrderBtn.addEventListener('click', triggerGoogleFormOrder);
    }
}
