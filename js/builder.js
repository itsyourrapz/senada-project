import { formatIDR, getCharmHTML } from './utils.js';
import { charmsData } from './charms-data.js';

export let braceletState = {
    slots: 18,
    sizeLabel: 'M (16 cm)',
    placedCharms: [],
    basePrice: 149000,
    totalPrice: 149000
};

export function initBuilder() {
    const braceletTrack = document.getElementById('bracelet-track');
    if (!braceletTrack) return;

    const sizeBtns = document.querySelectorAll('.size-btn:not(.custom-btn)');
    const customBtn = document.querySelector('.custom-btn');
    const recCharmsEl = document.getElementById('rec-charms');
    const totalSlotsEl = document.getElementById('total-slots');
    const usedCharmsEl = document.getElementById('used-charms');
    const shuffleCharmsBtn = document.getElementById('shuffle-charms-btn');
    const resetCharmsBtn = document.getElementById('reset-charms-btn');
    
    // Summary Card Elements
    const summarySizeEl = document.getElementById('summary-size');
    const summaryCountEl = document.getElementById('summary-count');
    const summaryPriceEl = document.getElementById('summary-price');
    
    // Story Summary Elements
    const storySummaryCard = document.getElementById('story-summary-card');
    const storySummaryGrid = document.getElementById('story-summary-grid');
    
    const preview3dContainer = document.getElementById('preview-3d-container');
    const bracelet3d = document.getElementById('bracelet-3d');
    const modeCraftingBtn = document.getElementById('mode-crafting');
    const mode3dPreviewBtn = document.getElementById('mode-3d-preview');

    // Custom Modal Elements
    const memoryOverlay = document.getElementById('memory-modal-overlay');
    const memoryInput = document.getElementById('memory-input');
    const cancelMemoryBtn = document.getElementById('cancel-memory-btn');
    const saveMemoryBtn = document.getElementById('save-memory-btn');

    // Custom Size Modal Elements
    const customSizeOverlay = document.getElementById('custom-size-modal-overlay');
    const customSizeInput = document.getElementById('custom-size-input');
    const cancelCustomSizeBtn = document.getElementById('cancel-custom-size-btn');
    const saveCustomSizeBtn = document.getElementById('save-custom-size-btn');
    const customSizeError = document.getElementById('custom-size-error');

    const BASE_PRICE = 149000;
    
    let currentSlots = 18;
    let placedCharms = []; // Array of { slotIndex, charm, memoryName }
    let selectedSlotIndex = null;
    let activeMemorySlotIndex = null;
    let currentAnimatedPrice = 149000;

    // Single tooltip instance created dynamically
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'charm-tooltip';
    document.body.appendChild(tooltipEl);

    // Hide tooltip on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.placed-charm') && !e.target.closest('.charm-tooltip')) {
            tooltipEl.classList.remove('active');
        }
    });

    // Close modals
    if (cancelMemoryBtn) {
        cancelMemoryBtn.addEventListener('click', () => {
            memoryOverlay.classList.remove('active');
            activeMemorySlotIndex = null;
            if (typeof isRotationPaused !== 'undefined') isRotationPaused = false;
        });
    }
    if (saveMemoryBtn) {
        saveMemoryBtn.addEventListener('click', () => {
            if (activeMemorySlotIndex !== null) {
                const pc = placedCharms.find(p => p.slotIndex === activeMemorySlotIndex);
                if (pc) {
                    pc.memoryName = memoryInput.value.trim();
                    saveState();
                    // Re-render
                    generateSlots(currentSlots);
                }
            }
            memoryOverlay.classList.remove('active');
            activeMemorySlotIndex = null;
            if (typeof isRotationPaused !== 'undefined') isRotationPaused = false;
        });
    }
    if (memoryOverlay) {
        memoryOverlay.addEventListener('click', (e) => {
            if (e.target === memoryOverlay) {
                memoryOverlay.classList.remove('active');
                activeMemorySlotIndex = null;
                if (typeof isRotationPaused !== 'undefined') isRotationPaused = false;
            }
        });
    }

    function saveState() {
        braceletState.slots = currentSlots;
        braceletState.sizeLabel = summarySizeEl.textContent;
        braceletState.placedCharms = placedCharms;
        const totalCharmPrice = placedCharms.reduce((sum, pc) => sum + pc.charm.price, 0);
        braceletState.totalPrice = BASE_PRICE + totalCharmPrice;
        
        try {
            localStorage.setItem('senada-bracelet-state', JSON.stringify(braceletState));
        } catch (e) {
            console.warn("Could not save to localStorage (quota exceeded?)", e);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem('senada-bracelet-state');
            if (saved) {
                const parsed = JSON.parse(saved);
                currentSlots = parsed.slots || 18;
                placedCharms = parsed.placedCharms || [];
                
                sizeBtns.forEach(b => b.classList.remove('active'));
                if (customBtn) customBtn.classList.remove('active');
                
                let matchedBtn = Array.from(sizeBtns).find(b => b.dataset.label + ' (' + b.dataset.size + ' cm)' === parsed.sizeLabel);
                if (matchedBtn) {
                    matchedBtn.classList.add('active');
                } else if (parsed.sizeLabel.startsWith('Custom') && customBtn) {
                    customBtn.classList.add('active');
                }
                
                summarySizeEl.textContent = parsed.sizeLabel || 'M (16 cm)';
                if (recCharmsEl) recCharmsEl.textContent = currentSlots;
                if (totalSlotsEl) totalSlotsEl.textContent = currentSlots;
                return true;
            }
        } catch(e) {
            console.error("Error loading state", e);
        }
        return false;
    }

    // Initialize Slots
    function generateSlots(count) {
        currentSlots = count;
        braceletTrack.innerHTML = '';
        
        // Filter out charms that exceed new slot count
        placedCharms = placedCharms.filter(pc => pc.slotIndex < count);
        
        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'magnet-slot';
            slot.dataset.index = i;
            
            // Check selection state
            if (selectedSlotIndex === i) {
                slot.classList.add('selected');
            }
            
            // Render charm if present
            const existingCharm = placedCharms.find(pc => pc.slotIndex === i);
            if (existingCharm) {
                slot.classList.add('has-charm');
                renderCharmInSlot(slot, existingCharm.charm, i);
            }
            
            // Click to select/handle tap-and-tap
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                handleSlotClick(i);
            });
            
            setupDropzone(slot, i);
            braceletTrack.appendChild(slot);
        }
        
        updateMetrics();
    }

    function handleSlotClick(index) {
        if (selectedSlotIndex !== null) {
            const prevIndex = selectedSlotIndex;
            if (prevIndex === index) {
                // Clicked the same slot twice: deselect it
                selectedSlotIndex = null;
                const prevSlot = braceletTrack.children[prevIndex];
                if (prevSlot) prevSlot.classList.remove('selected');
            } else {
                // Check if the source slot had a charm
                const sourceCharm = placedCharms.find(p => p.slotIndex === prevIndex);
                if (sourceCharm) {
                    const targetCharm = placedCharms.find(p => p.slotIndex === index);
                    
                    if (targetCharm) {
                        // SWAP
                        const tempMemory = sourceCharm.memoryName;
                        sourceCharm.slotIndex = index;
                        sourceCharm.memoryName = targetCharm.memoryName;
                        
                        targetCharm.slotIndex = prevIndex;
                        targetCharm.memoryName = tempMemory;
                    } else {
                        // MOVE
                        sourceCharm.slotIndex = index;
                    }
                    
                    saveState();
                    generateSlots(currentSlots);
                    
                    // Clear selection
                    selectedSlotIndex = null;
                } else {
                    // Source slot was empty. Select the new slot!
                    selectedSlotIndex = index;
                    document.querySelectorAll('.magnet-slot').forEach(s => s.classList.remove('selected'));
                    const targetSlot = braceletTrack.children[index];
                    if (targetSlot) targetSlot.classList.add('selected');
                }
            }
        } else {
            // Nothing was selected. Select the clicked slot!
            selectedSlotIndex = index;
            document.querySelectorAll('.magnet-slot').forEach(s => s.classList.remove('selected'));
            const targetSlot = braceletTrack.children[index];
            if (targetSlot) targetSlot.classList.add('selected');
        }
    }

    function renderCharmInSlot(slot, charm, index) {
        slot.innerHTML = ''; // Clear slot content
        
        const charmEl = document.createElement('div');
        charmEl.className = 'placed-charm';
        charmEl.draggable = true;
        charmEl.innerHTML = `
            ${getCharmHTML(charm.image, '', charm.name)}
            <button class="remove-charm-btn" aria-label="Remove">&times;</button>
        `;
        
        // Single click: View details tooltip and handle tap-and-tap
        charmEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = charmEl.getBoundingClientRect();
            const pc = placedCharms.find(p => p.slotIndex === index);
            
            tooltipEl.innerHTML = `
                <div class="charm-tooltip-title">${charm.name}</div>
                <div class="charm-tooltip-price">${formatIDR(charm.price)}</div>
                <div class="charm-tooltip-desc">${pc && pc.memoryName ? `"${pc.memoryName}"` : 'No memory named yet.'}</div>
                <div class="charm-tooltip-help">
                    <span>💡 Double-click to remove</span>
                    <span>✍️ Right-click to edit story memory</span>
                </div>
            `;
            
            tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
            tooltipEl.style.top = `${rect.top + window.scrollY - 10}px`;
            tooltipEl.classList.add('active');
            
            handleSlotClick(index);
        });

        // Double-click to remove
        charmEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            tooltipEl.classList.remove('active');
            removeCharm(index);
        });

        // Remove button click
        const removeBtn = charmEl.querySelector('.remove-charm-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltipEl.classList.remove('active');
            removeCharm(index);
        });

        // Right-click to Name Memory
        charmEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            tooltipEl.classList.remove('active');
            
            const pc = placedCharms.find(p => p.slotIndex === index);
            if (pc) {
                activeMemorySlotIndex = index;
                memoryInput.value = pc.memoryName || '';
                memoryOverlay.classList.add('active');
                setTimeout(() => memoryInput.focus(), 100);
            }
        });

        // Drag start (reordering)
        charmEl.addEventListener('dragstart', (e) => {
            window.draggedCharm = charm; // Track globally for ghost preview
            window.draggedSourceSlot = index;
            e.dataTransfer.setData('application/json', JSON.stringify({
                sourceSlot: index,
                charm: charm
            }));
            // Hide element temporarily while dragging
            setTimeout(() => charmEl.style.opacity = '0', 0);
        });

        charmEl.addEventListener('dragend', () => {
            window.draggedCharm = null;
            window.draggedSourceSlot = null;
            charmEl.style.opacity = '1';
            // Clear all ghost previews on drag end
            document.querySelectorAll('.magnet-slot').forEach(s => {
                s.classList.remove('drag-over');
                if (!s.classList.contains('has-charm')) {
                    s.innerHTML = '';
                }
            });
        });
        
        // Touch support for reordering
        let isTouchDragging = false;
        let touchClone = null;
        let startX, startY;

        charmEl.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            isTouchDragging = true;
        }, { passive: true });

        charmEl.addEventListener('touchmove', (e) => {
            if (!isTouchDragging) return;
            const touch = e.touches[0];
            
            if (!touchClone) {
                if (Math.abs(touch.clientX - startX) > 5 || Math.abs(touch.clientY - startY) > 5) {
                    e.preventDefault(); 
                    
                    window.draggedCharm = charm;
                    window.draggedSourceSlot = index;
                    
                    charmEl.style.opacity = '0.4';
                    
                    touchClone = charmEl.cloneNode(true);
                    touchClone.classList.add('flying-charm');
                    touchClone.style.position = 'fixed';
                    touchClone.style.pointerEvents = 'none';
                    touchClone.style.zIndex = '9999';
                    touchClone.style.opacity = '0.8';
                    touchClone.style.margin = '0';
                    touchClone.style.transform = 'scale(1.1)';
                    document.body.appendChild(touchClone);
                } else {
                    return; 
                }
            } else {
                e.preventDefault(); 
            }
            
            touchClone.style.left = `${touch.clientX - 19}px`;
            touchClone.style.top = `${touch.clientY - 25}px`;
            
            const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const slotUnder = elUnder ? elUnder.closest('.magnet-slot') : null;
            
            document.querySelectorAll('.magnet-slot').forEach(s => {
                if (s !== slotUnder) s.classList.remove('drag-over');
            });
            
            if (slotUnder && parseInt(slotUnder.dataset.index) !== index) {
                slotUnder.classList.add('drag-over');
            }
        }, { passive: false });

        const endTouchDrag = (e) => {
            if (!isTouchDragging) return;
            isTouchDragging = false;
            charmEl.style.opacity = '1';
            
            if (touchClone) {
                const touch = e.changedTouches ? e.changedTouches[0] : null;
                touchClone.remove();
                touchClone = null;
                
                document.querySelectorAll('.magnet-slot').forEach(s => s.classList.remove('drag-over'));
                
                if (touch) {
                    const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                    const slotUnder = elUnder ? elUnder.closest('.magnet-slot') : null;
                    
                    if (slotUnder) {
                        const targetIndex = parseInt(slotUnder.dataset.index);
                        if (targetIndex !== index) {
                            moveCharm(index, targetIndex);
                        }
                    }
                }
                
                window.draggedCharm = null;
                window.draggedSourceSlot = null;
            }
        };

        charmEl.addEventListener('touchend', endTouchDrag);
        charmEl.addEventListener('touchcancel', endTouchDrag);
        
        slot.appendChild(charmEl);
    }

    function setupDropzone(slot, index) {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            // Allow drop if dragging from another slot (swapping) OR if slot is empty
            if (slot.classList.contains('has-charm') && window.draggedSourceSlot == null) return;
            
            // If dragging something new or swapping, show ghost preview or glow
            if (window.draggedCharm && window.draggedSourceSlot !== index) {
                slot.classList.add('drag-over');
                
                // Show ghost preview if it's an empty slot
                if (!slot.classList.contains('has-charm') && !slot.querySelector('.placed-charm')) {
                    slot.innerHTML = `
                        <div class="placed-charm" style="opacity: 0.4; pointer-events: none;">
                            ${getCharmHTML(window.draggedCharm.image)}
                        </div>
                    `;
                }
            }
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
            // Clean up ghost preview only if empty
            if (!slot.classList.contains('has-charm')) {
                slot.innerHTML = '';
            }
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            // Clean up ghost preview only if empty
            if (!slot.classList.contains('has-charm')) {
                slot.innerHTML = '';
            }
            
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            
            const data = JSON.parse(dataStr);
            
            if (data.sourceSlot !== undefined) {
                // Dragging from another slot
                moveCharm(data.sourceSlot, index);
            } else {
                // Dragging from drawer
                if (slot.classList.contains('has-charm')) return;
                addCharmToSlot(data, index);
            }
        });
    }

    function addCharmToSlot(charm, index, memoryName = '') {
        // Clear selected slot highlight
        if (selectedSlotIndex === index) {
            selectedSlotIndex = null;
        }

        // Remove existing charm in slot
        placedCharms = placedCharms.filter(pc => pc.slotIndex !== index);
        placedCharms.push({ slotIndex: index, charm, memoryName });
        
        const slot = braceletTrack.children[index];
        slot.classList.add('has-charm');
        renderCharmInSlot(slot, charm, index);
        
        // Sparkle and Bounce animations
        triggerSparkles(slot);
        triggerBounce();
        
        updateMetrics();

        // Celebration on completion
        if (placedCharms.length === currentSlots) {
            triggerCelebration();
        }
    }

    function moveCharm(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        const charmToMove = placedCharms.find(pc => pc.slotIndex === fromIndex);
        const existingAtTarget = placedCharms.find(pc => pc.slotIndex === toIndex);
        
        // Swap slots
        placedCharms = placedCharms.filter(pc => pc.slotIndex !== fromIndex && pc.slotIndex !== toIndex);
        
        if (charmToMove) placedCharms.push({ slotIndex: toIndex, charm: charmToMove.charm, memoryName: charmToMove.memoryName });
        if (existingAtTarget) placedCharms.push({ slotIndex: fromIndex, charm: existingAtTarget.charm, memoryName: existingAtTarget.memoryName });
        
        // Localized DOM update
        const fromSlot = braceletTrack.children[fromIndex];
        const toSlot = braceletTrack.children[toIndex];
        
        if (existingAtTarget) {
            fromSlot.classList.add('has-charm');
            renderCharmInSlot(fromSlot, existingAtTarget.charm, fromIndex);
        } else {
            fromSlot.classList.remove('has-charm');
            fromSlot.innerHTML = '';
        }
        
        if (charmToMove) {
            toSlot.classList.add('has-charm');
            renderCharmInSlot(toSlot, charmToMove.charm, toIndex);
            triggerSparkles(toSlot);
        } else {
            toSlot.classList.remove('has-charm');
            toSlot.innerHTML = '';
        }
        
        triggerBounce();
        updateMetrics(); // to save state
    }

    function removeCharm(index) {
        placedCharms = placedCharms.filter(pc => pc.slotIndex !== index);
        const slot = braceletTrack.children[index];
        slot.innerHTML = '';
        slot.classList.remove('has-charm');
        
        triggerBounce();
        updateMetrics();
    }

    // Flying animation and Quick Add click listener
    document.addEventListener('add-charm', (e) => {
        const charm = e.detail.charm;
        let targetIndex = null;
        
        // Use selected empty slot if valid
        if (selectedSlotIndex !== null && !placedCharms.find(pc => pc.slotIndex === selectedSlotIndex)) {
            targetIndex = selectedSlotIndex;
        } else {
            // Find first empty slot
            for (let i = 0; i < currentSlots; i++) {
                if (!placedCharms.find(pc => pc.slotIndex === i)) {
                    targetIndex = i;
                    break;
                }
            }
        }
        
        if (targetIndex !== null) {
            const targetSlot = braceletTrack.children[targetIndex];
            const drawerCard = document.querySelector(`.charm-card[data-id="${charm.id}"]`);
            const startRect = drawerCard ? drawerCard.getBoundingClientRect() : null;
            
            if (startRect) {
                animateFlyingCharm(charm, startRect, targetSlot, () => {
                    addCharmToSlot(charm, targetIndex);
                    targetSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                });
            } else {
                addCharmToSlot(charm, targetIndex);
            }
        } else {
            alert('Your bracelet is full! Please choose a larger size or remove some charms.');
        }
    });

    function animateFlyingCharm(charm, startRect, targetSlotEl, onComplete) {
        const targetRect = targetSlotEl.getBoundingClientRect();
        
        const flyer = document.createElement('div');
        flyer.className = 'flying-charm';
        flyer.innerHTML = getCharmHTML(charm.image);
        
        // Initial coordinates
        flyer.style.left = `${startRect.left + startRect.width/2 - 19}px`;
        flyer.style.top = `${startRect.top + startRect.height/2 - 25}px`;
        flyer.style.transform = 'scale(1.2)';
        flyer.style.opacity = '1';
        
        document.body.appendChild(flyer);
        
        // Animate
        requestAnimationFrame(() => {
            flyer.style.left = `${targetRect.left + targetRect.width/2 - 19}px`;
            flyer.style.top = `${targetRect.top + targetRect.height/2 - 25}px`;
            flyer.style.transform = 'scale(1) rotate(360deg)';
        });
        
        flyer.addEventListener('transitionend', () => {
            flyer.remove();
            onComplete();
        });
    }

    function triggerSparkles(slotEl) {
        const rect = slotEl.getBoundingClientRect();
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'sparkle-particle';
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2 + window.scrollY}px`;
            particle.style.width = `${Math.random() * 6 + 4}px`;
            particle.style.height = particle.style.width;
            particle.style.background = 'radial-gradient(circle, #ffffff 10%, #E6C25B 80%)';
            particle.style.borderRadius = '50%';
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 30 + 15;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 650);
        }
    }

    function triggerBounce() {
        braceletTrack.style.animation = 'none';
        // Trigger reflow
        void braceletTrack.offsetWidth;
        braceletTrack.style.animation = 'bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    function updateMetrics() {
        const count = placedCharms.length;
        const totalCharmPrice = placedCharms.reduce((sum, pc) => sum + pc.charm.price, 0);
        const totalPrice = BASE_PRICE + totalCharmPrice;
        
        if (usedCharmsEl) usedCharmsEl.textContent = count;
        if (summaryCountEl) summaryCountEl.textContent = `${count}/${currentSlots}`;
        
        // Animate price count-up/down
        animatePriceCount(totalPrice);
        
        // Progress percentage calculation
        const percent = Math.round((count / currentSlots) * 100);
        
        // Feedback texts
        function getProgressText(p) {
            if (p === 0) return "Your Story Begins";
            if (p <= 25) return "Your Story Begins";
            if (p <= 50) return "Building Your Story";
            if (p <= 75) return "Almost Complete";
            return "Your Bracelet Is Ready";
        }
        const feedbackText = getProgressText(percent);
        
        const wsFeedback = document.getElementById('workspace-feedback');
        if (wsFeedback) wsFeedback.textContent = feedbackText;
        
        const sumFeedback = document.getElementById('summary-feedback');
        if (sumFeedback) sumFeedback.textContent = feedbackText;
        
        const sumCompletion = document.getElementById('summary-completion');
        if (sumCompletion) sumCompletion.textContent = `${percent}%`;
        
        const sumProgressBar = document.getElementById('summary-progress-bar');
        if (sumProgressBar) sumProgressBar.style.width = `${percent}%`;
        
        updateStorySummary();
        saveState();
    }

    function updateStorySummary() {
        if (!storySummaryCard || !storySummaryGrid) return;
        
        const count = placedCharms.length;
        if (count === 0) {
            storySummaryCard.style.display = 'none';
            return;
        }
        
        storySummaryCard.style.display = 'flex';
        storySummaryGrid.innerHTML = '';
        
        const sortedCharms = [...placedCharms].sort((a, b) => a.slotIndex - b.slotIndex);
        
        sortedCharms.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'story-item-card';
            
            const hasMemory = pc.memoryName && pc.memoryName.trim() !== '';
            const memoryText = hasMemory ? pc.memoryName.trim() : 'Tulis kenanganmu di sini...';
            const memoryClass = hasMemory ? 'story-item-story' : 'story-item-story empty';
            
            card.innerHTML = `
                <div class="story-item-charm-wrapper">
                    ${getCharmHTML(pc.charm.image, '', pc.charm.name)}
                </div>
                <div class="story-item-content">
                    <div class="story-item-title">${pc.charm.name}</div>
                    <div class="${memoryClass}">${memoryText}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                activeMemorySlotIndex = pc.slotIndex;
                memoryInput.value = pc.memoryName || '';
                memoryOverlay.classList.add('active');
                setTimeout(() => memoryInput.focus(), 100);
            });
            
            storySummaryGrid.appendChild(card);
        });
    }

    function animatePriceCount(targetPrice) {
        const duration = 500; // ms
        const startPrice = currentAnimatedPrice;
        const startTime = performance.now();
        
        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const ease = progress * (2 - progress); // easeOutQuad
            currentAnimatedPrice = Math.floor(startPrice + (targetPrice - startPrice) * ease);
            
            if (summaryPriceEl) summaryPriceEl.textContent = formatIDR(currentAnimatedPrice);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                currentAnimatedPrice = targetPrice;
                if (summaryPriceEl) summaryPriceEl.textContent = formatIDR(targetPrice);
            }
        }
        requestAnimationFrame(update);
    }

    // Size Button Listeners
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            if (customBtn) customBtn.classList.remove('active');
            btn.classList.add('active');
            
            const size = parseInt(btn.dataset.size);
            const label = btn.dataset.label;
            
            let slots = 18;
            if (size === 14) slots = 14;
            else if (size === 15) slots = 16;
            else if (size === 16) slots = 18;
            else if (size === 17) slots = 20;
            else if (size === 18) slots = 22;

            if (recCharmsEl) recCharmsEl.textContent = slots;
            if (totalSlotsEl) totalSlotsEl.textContent = slots;
            summarySizeEl.textContent = `${label} (${size} cm)`;
            
            generateSlots(slots);
        });
    });

    if (customBtn) {
        customBtn.addEventListener('click', () => {
            if (customSizeOverlay) {
                customSizeInput.value = '';
                if (customSizeError) customSizeError.style.display = 'none';
                customSizeOverlay.classList.add('active');
                setTimeout(() => customSizeInput.focus(), 100);
            }
        });
    }

    if (cancelCustomSizeBtn) {
        cancelCustomSizeBtn.addEventListener('click', () => {
            customSizeOverlay.classList.remove('active');
        });
    }

    if (saveCustomSizeBtn) {
        saveCustomSizeBtn.addEventListener('click', () => {
            const val = parseInt(customSizeInput.value);
            if (val && val >= 10 && val <= 25) {
                sizeBtns.forEach(b => b.classList.remove('active'));
                customBtn.classList.add('active');
                
                const slots = val > 12 ? val + 2 : val;
                
                if (recCharmsEl) recCharmsEl.textContent = slots;
                if (totalSlotsEl) totalSlotsEl.textContent = slots;
                summarySizeEl.textContent = `Custom (${val} cm)`;
                
                generateSlots(slots);
                customSizeOverlay.classList.remove('active');
                if (customSizeError) customSizeError.style.display = 'none';
            } else {
                if (customSizeError) customSizeError.style.display = 'block';
            }
        });
    }

    if (customSizeOverlay) {
        customSizeOverlay.addEventListener('click', (e) => {
            if (e.target === customSizeOverlay) {
                customSizeOverlay.classList.remove('active');
            }
        });
    }

    // Modes Toggle (Crafting Mode and Interactive 3D Preview Mode)
    modeCraftingBtn.addEventListener('click', () => {
        modeCraftingBtn.classList.add('active');
        if (mode3dPreviewBtn) mode3dPreviewBtn.classList.remove('active');
        braceletTrack.style.display = 'flex';
        if (preview3dContainer) preview3dContainer.style.display = 'none';
    });

    if (mode3dPreviewBtn) {
        mode3dPreviewBtn.addEventListener('click', () => {
            mode3dPreviewBtn.classList.add('active');
            modeCraftingBtn.classList.remove('active');
            if (preview3dContainer) preview3dContainer.style.display = 'flex';
            braceletTrack.style.display = 'none';
            
            render3DPreviewMode();
        });
    }

    // Interactive Drag-to-Rotate 3D Preview handling
    let rotationY = 0;
    let isDragging3D = false;
    let startX = 0;
    let startRotationY = 0;
    let animationFrameId = null;
    let lastTime = 0;
    let isRotationPaused = false;
    const rotationSpeed = 0.02; // degrees per ms

    function animate3D(time) {
        if (!lastTime) lastTime = time;
        const delta = time - lastTime;
        lastTime = time;

        if (!isDragging3D && !isRotationPaused && mode3dPreviewBtn && mode3dPreviewBtn.classList.contains('active')) {
            rotationY = (rotationY + rotationSpeed * delta) % 360;
            if (bracelet3d) {
                bracelet3d.style.transform = `rotateY(${rotationY}deg)`;
            }
        }
        animationFrameId = requestAnimationFrame(animate3D);
    }
    
    // Start the 3D rotation animation loop
    animationFrameId = requestAnimationFrame(animate3D);

    if (preview3dContainer) {
        const startDrag = (clientX) => {
            isDragging3D = true;
            startX = clientX;
            startRotationY = rotationY;
        };

        const moveDrag = (clientX) => {
            if (!isDragging3D) return;
            const deltaX = clientX - startX;
            rotationY = startRotationY + deltaX * 0.5; // Drag sensitivity
            if (bracelet3d) {
                bracelet3d.style.transform = `rotateY(${rotationY}deg)`;
            }
        };

        const endDrag = () => {
            if (isDragging3D) {
                isDragging3D = false;
                lastTime = performance.now(); // Reset animation timer to avoid jump
            }
        };

        // Mouse events
        preview3dContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX);
        });

        document.addEventListener('mousemove', (e) => {
            moveDrag(e.clientX);
        });

        document.addEventListener('mouseup', () => {
            endDrag();
        });

        // Touch events
        preview3dContainer.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            moveDrag(e.touches[0].clientX);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            endDrag();
        });
    }

    function render3DPreviewMode() {
        if (!bracelet3d) return;
        bracelet3d.innerHTML = '';
        
        const count = currentSlots;
        const slotWidth = 46; // 44px width + 2px gap (making 3D circle larger as requested)
        // Calculate radius to form a perfect circle
        const radius = Math.max(90, (slotWidth / 2) / Math.tan(Math.PI / count)) + 5;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 360;
            
            const slot3d = document.createElement('div');
            slot3d.className = 'slot-3d';
            // Rotate around Y axis, then translate outward along Z axis
            slot3d.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
            
            const pc = placedCharms.find(p => p.slotIndex === i);
            if (pc) {
                slot3d.innerHTML = getCharmHTML(pc.charm.image, '', pc.charm.name);
                slot3d.classList.add('has-charm');
                
                // Clicking on a 3D charm launches the memory edit overlay!
                slot3d.addEventListener('click', (e) => {
                    e.stopPropagation();
                    activeMemorySlotIndex = i;
                    memoryInput.value = pc.memoryName || '';
                    memoryOverlay.classList.add('active');
                    isRotationPaused = true; // Pause auto rotation
                    setTimeout(() => memoryInput.focus(), 100);
                });
            }
            
            bracelet3d.appendChild(slot3d);
        }
    }

    function triggerCelebration() {
        const overlay = document.getElementById('celebration-overlay');
        if (!overlay) return;
        
        overlay.innerHTML = '';
        overlay.style.display = 'block';
        
        // Spawn particles
        const particleCount = 60;
        const colors = ['#FF6F91', '#FFB3C1', '#ffd1dc', '#E6C25B', '#ffffff'];
        
        for (let i = 0; i < particleCount; i++) {
            const isHeart = Math.random() > 0.5;
            const particle = document.createElement('div');
            
            if (isHeart) {
                particle.className = 'heart-particle';
                particle.innerHTML = Math.random() > 0.5 ? '❤️' : '✨';
            } else {
                particle.className = 'confetti-particle';
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.width = `${Math.random() * 8 + 6}px`;
                particle.style.height = `${Math.random() * 8 + 6}px`;
                particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
            }
            
            particle.style.left = '50%';
            particle.style.top = '50%';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 250 + 100;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const rot = Math.random() * 720 - 360;
            const scale = Math.random() * 0.8 + 0.6;
            
            particle.style.setProperty('--x', `${x}px`);
            particle.style.setProperty('--y', `${y}px`);
            particle.style.setProperty('--r', `${rot}deg`);
            particle.style.setProperty('--s', `${scale}`);
            
            overlay.appendChild(particle);
        }
        
        // Floating celebration toast message
        const toast = document.createElement('div');
        toast.className = 'celebration-toast';
        toast.innerHTML = '✨ Gelang Kenanganmu Sudah Lengkap! ✨<br><span style="font-size: 0.95rem; font-family: var(--font-primary); font-weight: 400; color: var(--text-secondary);">Your custom bracelet is fully crafted!</span>';
        document.body.appendChild(toast);
        
        // Add metallic pulse to canvas
        const canvas = document.getElementById('bracelet-canvas');
        if (canvas) {
            canvas.style.boxShadow = '0 0 25px var(--steel-glow-light)';
            setTimeout(() => {
                canvas.style.boxShadow = '';
            }, 3500);
        }
        
        // Clean up
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
            toast.remove();
        }, 3500);
    }



    // Magic Shuffle Logic
    function shuffleCharms() {
        placedCharms = [];
        
        // Add shuffle class to trigger blur/shake animation
        braceletTrack.classList.add('shuffling');
        
        // Randomly populate slots (70% probability per slot)
        for (let i = 0; i < currentSlots; i++) {
            if (Math.random() < 0.7) {
                const randomCharm = charmsData[Math.floor(Math.random() * charmsData.length)];
                placedCharms.push({
                    slotIndex: i,
                    charm: randomCharm,
                    memoryName: ''
                });
            }
        }
        
        saveState();
        
        setTimeout(() => {
            braceletTrack.classList.remove('shuffling');
            generateSlots(currentSlots);
            triggerBounce();
            
            // Check if full celebration is triggered
            if (placedCharms.length === currentSlots) {
                triggerCelebration();
            }
        }, 600);
    }

    if (shuffleCharmsBtn) {
        shuffleCharmsBtn.addEventListener('click', shuffleCharms);
    }

    let resetTimeout = null;
    if (resetCharmsBtn) {
        resetCharmsBtn.addEventListener('click', () => {
            if (placedCharms.length === 0) {
                alert('Gelangmu sudah kosong!');
                return;
            }
            
            if (!resetCharmsBtn.classList.contains('confirming')) {
                resetCharmsBtn.classList.add('confirming');
                resetCharmsBtn.innerHTML = '⚠️ Yakin Reset?';
                
                resetTimeout = setTimeout(() => {
                    resetCharmsBtn.classList.remove('confirming');
                    resetCharmsBtn.innerHTML = '🗑️ Reset Gelang';
                }, 3000);
            } else {
                clearTimeout(resetTimeout);
                resetCharmsBtn.classList.remove('confirming');
                resetCharmsBtn.innerHTML = '🗑️ Reset Gelang';
                
                placedCharms = [];
                saveState();
                generateSlots(currentSlots);
                triggerBounce();
            }
        });
    }

    // Init
    if (loadState()) {
        generateSlots(currentSlots);
    } else {
        generateSlots(18);
    }
}
