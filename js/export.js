import { braceletState } from './builder.js';
import { formatIDR, getCharmHTML } from './utils.js';

export function initExport() {
    const sharingCard = document.getElementById('sharing-card');
    if (!sharingCard) return;

    const downloadBtns = [
        document.getElementById('download-design-btn'),
        document.getElementById('modal-download-btn')
    ].filter(Boolean);

    downloadBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Preparing...';
            btn.disabled = true;

            try {
                // Populate Card Details
                document.getElementById('export-size').textContent = `Size: ${braceletState.sizeLabel}`;
                document.getElementById('export-count').textContent = `${braceletState.placedCharms.length} / ${braceletState.slots} Charms Used`;
                document.getElementById('export-price').textContent = formatIDR(braceletState.totalPrice);

                // Render Circular Preview in Export Card
                const previewContainer = document.getElementById('export-bracelet-preview');
                previewContainer.innerHTML = '';
                
                const count = braceletState.slots;
                const linkWidth = 42; // Scaled up width for export card
                const linkHeight = 48; // Scaled up height
                const radius = (linkWidth / 2) / Math.tan(Math.PI / count); // Apothem of regular polygon
                
                // Add padding for the shadow and height
                const containerSize = (radius + (linkHeight / 2) + 20) * 2;
                
                previewContainer.style.width = `${containerSize}px`;
                previewContainer.style.height = `${containerSize}px`;
                previewContainer.style.border = 'none';
                previewContainer.style.background = 'transparent';
                previewContainer.style.boxShadow = 'none';
                
                const centerX = containerSize / 2;
                const centerY = containerSize / 2;
                
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * (2 * Math.PI) - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle) - (linkWidth / 2);
                    const y = centerY + radius * Math.sin(angle) - (linkHeight / 2);
                    
                    const previewCharm = document.createElement('div');
                    previewCharm.className = 'preview-charm-link';
                    previewCharm.style.position = 'absolute';
                    previewCharm.style.width = `${linkWidth}px`;
                    previewCharm.style.height = `${linkHeight}px`;
                    previewCharm.style.left = `${x}px`;
                    previewCharm.style.top = `${y}px`;
                    previewCharm.style.transform = `rotate(${angle + Math.PI/2}rad)`;
                    
                    const pc = braceletState.placedCharms.find(p => p.slotIndex === i);
                    if (pc) {
                        previewCharm.innerHTML = getCharmHTML(pc.charm.image, 'width: 100%; height: 100%; object-fit: contain; display: block; margin: auto; padding: 2px; box-sizing: border-box;');
                    }
                    
                    previewContainer.appendChild(previewCharm);
                }

                // Render Stories List
                const storiesList = document.getElementById('export-stories-list');
                storiesList.innerHTML = '';
                
                if (braceletState.placedCharms.length === 0) {
                    storiesList.innerHTML = '<div style="grid-column: span 2; text-align: center; color: #888; padding: 10px;">No memories named yet. Begin placing charms!</div>';
                } else {
                    braceletState.placedCharms.forEach(pc => {
                        const item = document.createElement('div');
                        item.style.display = 'flex';
                        item.style.alignItems = 'center';
                        item.style.background = '#f5f5f7';
                        item.style.padding = '8px 12px';
                        item.style.borderRadius = '8px';
                        item.style.border = '1px solid #e5e5ea';
                        item.style.boxSizing = 'border-box';
                        
                        item.innerHTML = `
                            <div style="width: 28px; height: 28px; margin-right: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                                ${getCharmHTML(pc.charm.image, 'width: 100%; height: 100%; object-fit: contain; display: block;')}
                            </div>
                            <div style="overflow: hidden; text-align: left;">
                                <div style="font-weight: 600; font-size: 0.85rem; color: #1a1a1a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${pc.charm.name}</div>
                                <div style="font-size: 0.75rem; color: #666; font-style: italic; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                    ${pc.memoryName ? pc.memoryName : 'Memory link'}
                                </div>
                            </div>
                        `;
                        storiesList.appendChild(item);
                    });
                }

                // Wait for all images in the sharing card to load before capturing
                const images = sharingCard.querySelectorAll('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                }));

                // Render Card to Canvas via html2canvas
                const canvas = await html2canvas(sharingCard, {
                    backgroundColor: '#fafafa',
                    scale: 2, // High DPI
                    useCORS: true,
                    logging: false,
                    allowTaint: true
                });

                // Export file download
                const link = document.createElement('a');
                link.download = `Senada-Bracelet-Design-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
            } catch (error) {
                console.error('Error generating design image:', error);
                alert('Could not generate PNG export card. Please try again.');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });
}
