export function initBackgroundDecorations() {
    // Check if container already exists
    if (document.querySelector('.bg-decorations')) return;

    const container = document.createElement('div');
    container.className = 'bg-decorations';
    document.body.appendChild(container);

    // Inject elegant outline orbit circles representing design templates / jewelry chains
    const orbit1 = document.createElement('div');
    orbit1.className = 'bg-orbit bg-orbit-1';
    container.appendChild(orbit1);

    const orbit2 = document.createElement('div');
    orbit2.className = 'bg-orbit bg-orbit-2';
    container.appendChild(orbit2);

    const symbols = ['✨', '💖', '🌙', '🌸', '🍀', '🎈', '⭐', '🐱', '✈️'];
    const particleCount = 14;

    for (let i = 0; i < particleCount; i++) {
        createParticle(container, symbols);
    }
}

function createParticle(container, symbols) {
    const particle = document.createElement('div');
    particle.className = 'bg-particle';
    
    // Select a random symbol
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    particle.textContent = symbol;

    // Randomize properties
    const startX = Math.random() * 100; // in vw
    const startY = 100 + Math.random() * 20; // start below the screen
    const size = Math.random() * 2.5 + 1.2; // 1.2rem to 3.7rem
    const duration = Math.random() * 30 + 30; // 30s to 60s
    const delay = Math.random() * -40; // negative delay so particles start at different vertical heights immediately
    const opacity = Math.random() * 0.08 + 0.04; // low opacity (4% to 12%) for a very subtle look
    const rotationSpeed = (Math.random() * 2 - 1) * 360; // rotate direction
    const swayDistance = Math.random() * 60 + 20; // sway left/right
    
    particle.style.left = `${startX}vw`;
    particle.style.top = `${startY}vh`;
    particle.style.fontSize = `${size}rem`;
    particle.style.setProperty('--p-opacity', opacity);
    particle.style.setProperty('--sway', `${swayDistance}px`);
    particle.style.setProperty('--rot', `${rotationSpeed}deg`);
    
    particle.style.animation = `floatUp ${duration}s linear infinite`;
    particle.style.animationDelay = `${delay}s`;
    
    // Add subtle blur to some particles to create depth of field
    if (Math.random() > 0.5) {
        particle.style.filter = `blur(${Math.random() * 2 + 1}px)`;
    }

    container.appendChild(particle);
}
