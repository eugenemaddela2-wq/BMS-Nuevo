/**
 * Content Section Loader
 * Dynamically loads content sections from separate HTML files
 */

async function loadContentSections(dashboardType, sections) {
    const mainContent = document.querySelector('main, .main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }

    // Create a container for all sections
    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = 'sectionsContainer';

    try {
        for (const section of sections) {
            const sectionFile = `sections/${dashboardType}-${section}.html`;
            const response = await fetch(sectionFile);
            
            if (!response.ok) {
                console.error(`Failed to load ${sectionFile}: ${response.statusText}`);
                continue;
            }
            
            const html = await response.text();
            sectionsContainer.innerHTML += html;
        }
        
        // Replace main content with loaded sections
        const oldSections = mainContent.querySelectorAll('.content-section, .panel');
        oldSections.forEach(section => section.remove());
        
        mainContent.appendChild(sectionsContainer);
        console.log(`✓ Content sections loaded successfully (${sections.length} sections)`);
    } catch (error) {
        console.error('Error loading content sections:', error);
    }
}

// Export for use in dashboard files
window.loadContentSections = loadContentSections;
