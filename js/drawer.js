import { charmsData } from './charms-data.js';
import { formatIDR, getCharmHTML } from './utils.js';

export function initDrawer() {
    const drawer = document.getElementById('charm-drawer');
    if (!drawer) return;

    const openBtn = document.getElementById('open-drawer-btn');
    const closeBtn = document.getElementById('close-drawer-btn');
    const overlay = document.getElementById('drawer-overlay');
    const charmsGrid = document.getElementById('charms-grid');
    const catBtns = document.querySelectorAll('.cat-btn');
    const customPhotoUpload = document.getElementById('custom-photo-upload');
    
    // Live Search Element
    const searchInput = document.getElementById('charm-search-input');

    // Crop Modal Elements
    const cropOverlay = document.getElementById('crop-modal-overlay');
    const cropPreviewImage = document.getElementById('crop-preview-image');
    const cropPreviewBox = document.getElementById('crop-preview-box');
    const cropZoomInput = document.getElementById('crop-zoom');
    const cropRotateInput = document.getElementById('crop-rotate');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const saveCropBtn = document.getElementById('save-crop-btn');

    // Cropper State
    let uploadedImage = null;
    let imgX = 0;
    let imgY = 0;
    let zoom = 1;
    let rotate = 0;
    let isDraggingCrop = false;
    let startDragX = 0;
    let startDragY = 0;
    let displayedWidth = 0;
    let displayedHeight = 0;

    // Open/Close drawer logic
    function openDrawer() {
        drawer.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('drawer-open');
    }

    function closeDrawer() {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('drawer-open');
    }

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Render Charms
    function renderCharms(category = 'all', query = '') {
        charmsGrid.innerHTML = '';
        
        let filtered = category === 'all' 
            ? charmsData 
            : charmsData.filter(c => c.category === category);
            
        if (query) {
            const cleanQuery = query.toLowerCase().trim();
            filtered = filtered.filter(c => c.name.toLowerCase().includes(cleanQuery));
        }

        if (filtered.length === 0) {
            charmsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Tidak ada charm ditemukan.</div>';
            return;
        }
            
        filtered.forEach(charm => {
            const card = document.createElement('div');
            card.className = 'charm-card';
            card.draggable = true;
            card.dataset.id = charm.id;
            card.dataset.name = charm.name;
            card.dataset.price = charm.price;
            card.dataset.image = charm.image;
            
            card.innerHTML = `
                <div class="charm-img-wrap">
                    ${getCharmHTML(charm.image, '', charm.name)}
                </div>
                <h4 class="charm-name">${charm.name}</h4>
                <p class="charm-price">${formatIDR(charm.price)}</p>
                <button class="quick-add" aria-label="Add ${charm.name}">Quick Add</button>
            `;
            
            // Drag logic
            card.addEventListener('dragstart', (e) => {
                window.draggedCharm = charm;
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: charm.id,
                    name: charm.name,
                    price: charm.price,
                    image: charm.image
                }));
                setTimeout(() => card.style.opacity = '0.5', 0);
            });
            
            card.addEventListener('dragend', () => {
                window.draggedCharm = null;
                card.style.opacity = '1';
            });
            
            // Click to add charm
            card.addEventListener('click', () => {
                const event = new CustomEvent('add-charm', {
                    detail: { charm }
                });
                document.dispatchEvent(event);
            });

            charmsGrid.appendChild(card);
        });
    }

    // Live Search event listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeCatBtn = document.querySelector('.cat-btn.active');
            const category = activeCatBtn ? activeCatBtn.dataset.cat : 'all';
            renderCharms(category, e.target.value);
        });
    }

    // Category filtering
    catBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            if (searchInput) searchInput.value = ''; // Reset search input
            
            const cat = e.target.dataset.cat;
            if (cat === 'custom') {
                customPhotoUpload.style.display = 'block';
                charmsGrid.innerHTML = '';
            } else {
                customPhotoUpload.style.display = 'none';
                renderCharms(cat);
            }
        });
    });

    // Custom Photo Upload logic to trigger crop modal
    const photoUploadInput = document.getElementById('photo-upload');
    if (photoUploadInput) {
        photoUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        uploadedImage = img;
                        cropPreviewImage.src = event.target.result;
                        
                        // Reset cropping states
                        imgX = 0;
                        imgY = 0;
                        zoom = 1;
                        rotate = 0;
                        if (cropZoomInput) cropZoomInput.value = 1;
                        if (cropRotateInput) cropRotateInput.value = 0;
                        
                        // Fit image inside crop viewport helper
                        const maxH = 220;
                        const scale = maxH / img.height;
                        displayedWidth = img.width * scale;
                        displayedHeight = img.height * scale;
                        
                        cropPreviewImage.style.width = `${displayedWidth}px`;
                        cropPreviewImage.style.height = `${displayedHeight}px`;
                        
                        updateCropPreview();
                        cropOverlay.classList.add('active');
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function updateCropPreview() {
        if (!cropPreviewImage) return;
        cropPreviewImage.style.transform = `translate(${imgX}px, ${imgY}px) scale(${zoom}) rotate(${rotate}deg)`;
    }

    // Zoom and rotate slider updates
    if (cropZoomInput) {
        cropZoomInput.addEventListener('input', (e) => {
            zoom = parseFloat(e.target.value);
            updateCropPreview();
        });
    }
    if (cropRotateInput) {
        cropRotateInput.addEventListener('input', (e) => {
            rotate = parseInt(e.target.value);
            updateCropPreview();
        });
    }

    // Drag crop viewport image logic
    if (cropPreviewBox) {
        const startDrag = (clientX, clientY) => {
            isDraggingCrop = true;
            startDragX = clientX - imgX;
            startDragY = clientY - imgY;
        };

        const moveDrag = (clientX, clientY) => {
            if (!isDraggingCrop) return;
            imgX = clientX - startDragX;
            imgY = clientY - startDragY;
            updateCropPreview();
        };

        const endDrag = () => {
            isDraggingCrop = false;
        };

        cropPreviewBox.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            moveDrag(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', endDrag);

        cropPreviewBox.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDraggingCrop) return;
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
        }, { passive: true });

        document.addEventListener('touchend', endDrag);
    }

    // Close crop overlay on Cancel
    if (cancelCropBtn) {
        cancelCropBtn.addEventListener('click', () => {
            cropOverlay.classList.remove('active');
            photoUploadInput.value = '';
        });
    }

    // Generate cropped image on Save
    if (saveCropBtn) {
        saveCropBtn.addEventListener('click', () => {
            if (!uploadedImage) return;

            const canvas = document.createElement('canvas');
            canvas.width = 176;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.translate(88, 100);
            ctx.rotate(rotate * Math.PI / 180);
            ctx.scale(zoom, zoom);

            const displayScale = 2.0;
            const w = displayedWidth * displayScale;
            const h = displayedHeight * displayScale;
            const x = imgX * displayScale - (w / 2);
            const y = imgY * displayScale - (h / 2);

            ctx.drawImage(uploadedImage, x, y, w, h);

            const resizedImage = canvas.toDataURL('image/jpeg', 0.85);

            const customCharm = {
                id: 'custom-' + Date.now(),
                name: 'Custom Photo',
                category: 'custom',
                price: 185000,
                image: resizedImage
            };

            const addEvent = new CustomEvent('add-charm', {
                detail: { charm: customCharm }
            });
            document.dispatchEvent(addEvent);

            cropOverlay.classList.remove('active');
            photoUploadInput.value = '';
        });
    }

    // Initial render
    renderCharms();

    // Auto-open on desktop on load
    if (window.innerWidth >= 1024) {
        openDrawer();
    }
}
