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
    const modalTitle = document.getElementById('modal-title');

    // Modal Steps
    const stepReview = document.getElementById('step-review');
    const stepCheckout = document.getElementById('step-checkout');
    const stepSuccess = document.getElementById('step-success');

    // Modal Action Buttons
    const modalOrderBtn = document.getElementById('modal-order-btn');
    const checkoutBackBtn = document.getElementById('checkout-back-btn');
    const checkoutSubmitBtn = document.getElementById('checkout-submit-btn');
    const successCloseBtn = document.getElementById('success-close-btn');
    const successWhatsappBtn = document.getElementById('success-whatsapp-btn');

    // Checkout Form Elements
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutReceipt = document.getElementById('checkout-receipt');
    const receiptPreviewContainer = document.getElementById('receipt-preview-container');
    const receiptPreview = document.getElementById('receipt-preview');
    const removeReceiptBtn = document.getElementById('remove-receipt-btn');
    const fileUploadText = document.getElementById('file-upload-text');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');

    // Direct Action Buttons from Summary Card
    const directOrderBtn = document.getElementById('direct-order-btn');

    let uploadedReceiptBase64 = null;

    function showStepReview() {
        if (stepReview) stepReview.style.display = 'flex';
        if (stepCheckout) stepCheckout.style.display = 'none';
        if (stepSuccess) stepSuccess.style.display = 'none';
        if (modalTitle) modalTitle.textContent = "Review Your Order";
    }

    function showStepCheckout() {
        if (stepReview) stepReview.style.display = 'none';
        if (stepCheckout) stepCheckout.style.display = 'flex';
        if (stepSuccess) stepSuccess.style.display = 'none';
        if (modalTitle) modalTitle.textContent = "Detail Pembayaran & Pengiriman";
        if (checkoutTotalPrice) checkoutTotalPrice.textContent = formatIDR(braceletState.totalPrice);
    }

    function showStepSuccess(orderId, totalFormatted) {
        if (stepReview) stepReview.style.display = 'none';
        if (stepCheckout) stepCheckout.style.display = 'none';
        if (stepSuccess) stepSuccess.style.display = 'flex';
        if (modalTitle) modalTitle.textContent = "Pesanan Berhasil";
        
        const successOrderIdEl = document.getElementById('success-order-id');
        const successTotalPriceEl = document.getElementById('success-total-price');
        
        if (successOrderIdEl) successOrderIdEl.textContent = orderId;
        if (successTotalPriceEl) successTotalPriceEl.textContent = totalFormatted;
        
        // Admin WhatsApp setup
        const adminWhatsapp = "62895610817354"; // Ganti dengan nomor WhatsApp toko Senada Anda
        const text = `Halo Admin Senada, saya ingin konfirmasi pembayaran untuk pesanan gelang custom saya.\n\n*ID Pesanan*: ${orderId}\n*Total Pembayaran*: ${totalFormatted}\n\nMohon bantuannya untuk memverifikasi. Terima kasih!`;
        if (successWhatsappBtn) {
            successWhatsappBtn.href = `https://api.whatsapp.com/send?phone=${adminWhatsapp}&text=${encodeURIComponent(text)}`;
        }
    }

    function openModal() {
        showStepReview();
        populateModal();
        orderModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        orderModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset checkout form and uploaded file data when modal is closed
        if (checkoutForm) checkoutForm.reset();
        uploadedReceiptBase64 = null;
        if (receiptPreview) receiptPreview.src = '';
        if (receiptPreviewContainer) receiptPreviewContainer.style.display = 'none';
        if (fileUploadText) fileUploadText.textContent = "Unggah Bukti Pembayaran (PNG/JPG) *";
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

    // Handle manual payment receipt upload and client-side compression
    if (checkoutReceipt) {
        checkoutReceipt.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Silakan pilih file gambar (PNG atau JPG).');
                checkoutReceipt.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Create a canvas for compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800;

                    // Resize logic maintaining ratio
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG format with 0.75 quality factor
                    uploadedReceiptBase64 = canvas.toDataURL('image/jpeg', 0.75);

                    // Show preview container
                    if (receiptPreview) receiptPreview.src = uploadedReceiptBase64;
                    if (receiptPreviewContainer) receiptPreviewContainer.style.display = 'block';
                    if (fileUploadText) fileUploadText.textContent = `File terpilih: ${file.name}`;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeReceiptBtn) {
        removeReceiptBtn.addEventListener('click', () => {
            if (checkoutReceipt) checkoutReceipt.value = '';
            uploadedReceiptBase64 = null;
            if (receiptPreview) receiptPreview.src = '';
            if (receiptPreviewContainer) receiptPreviewContainer.style.display = 'none';
            if (fileUploadText) fileUploadText.textContent = "Unggah Bukti Pembayaran (PNG/JPG) *";
        });
    }

    // Modal navigation listeners
    if (modalOrderBtn) {
        modalOrderBtn.addEventListener('click', showStepCheckout);
    }

    if (directOrderBtn) {
        directOrderBtn.addEventListener('click', () => {
            openModal();
            showStepCheckout();
        });
    }

    if (checkoutBackBtn) {
        checkoutBackBtn.addEventListener('click', showStepReview);
    }

    if (successCloseBtn) {
        successCloseBtn.addEventListener('click', closeModal);
    }

    // Submit Checkout form to Supabase via Vercel API
    if (checkoutSubmitBtn) {
        checkoutSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Check HTML5 validation
            if (!checkoutForm.checkValidity()) {
                checkoutForm.reportValidity();
                return;
            }

            if (!uploadedReceiptBase64) {
                alert('Silakan unggah screenshot bukti pembayaran terlebih dahulu.');
                return;
            }

            // Extract values
            const name = document.getElementById('checkout-name').value.trim();
            const email = document.getElementById('checkout-email').value.trim();
            const phone = document.getElementById('checkout-phone').value.trim();
            const address = document.getElementById('checkout-address').value.trim();

            const charmsPayload = braceletState.placedCharms.map(pc => ({
                id: pc.charm.id,
                name: pc.charm.name,
                price: pc.charm.price,
                slotIndex: pc.slotIndex,
                memoryName: pc.memoryName || ""
            }));

            const payload = {
                customer: { name, email, phone, address },
                size: braceletState.sizeLabel,
                charms: charmsPayload,
                receiptImage: uploadedReceiptBase64
            };

            // Enable loading state
            checkoutSubmitBtn.classList.add('btn-loading');
            checkoutSubmitBtn.disabled = true;
            if (checkoutBackBtn) checkoutBackBtn.disabled = true;

            try {
                const response = await fetch('/api/place-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Gagal mengirim pesanan. Silakan coba lagi.');
                }

                // Show success screen
                showStepSuccess(result.orderId, formatIDR(braceletState.totalPrice));
                
                // Fire custom event to reset the bracelet in builder.js
                document.dispatchEvent(new CustomEvent('reset-bracelet'));

            } catch (err) {
                console.error('Checkout error:', err);
                alert(err.message || 'Terjadi kesalahan saat memproses pesanan Anda. Silakan coba lagi.');
            } finally {
                // Restore submit buttons
                checkoutSubmitBtn.classList.remove('btn-loading');
                checkoutSubmitBtn.disabled = false;
                if (checkoutBackBtn) checkoutBackBtn.disabled = false;
            }
        });
    }
}
