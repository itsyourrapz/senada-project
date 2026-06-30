export function formatIDR(price) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

export function getCharmHTML(imageValue, style = '', altText = '') {
    if (!imageValue) return '';
    const isFilePath = imageValue.includes('.') || imageValue.includes('/') || imageValue.startsWith('http') || imageValue.startsWith('data:');
    if (isFilePath) {
        return `<div class="charm-bg-layer"></div><img src="${imageValue}" alt="${altText}" style="${style}; position: relative; z-index: 1;" draggable="false">`;
    } else {
        return `<span class="charm-emoji" style="${style}">${imageValue}</span>`;
    }
}
