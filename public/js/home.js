// Show top navbar when you scroll down
window.onscroll = function() {
    const navbar = document.querySelector('.top-nav');
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        navbar.classList.add('scrolled'); // Add the scrolled class
    } else {
        navbar.classList.remove('scrolled'); // Remove the scrolled class
    }
};

// Clicking on logo reloads the home page
$(".logo").click(function() {
    window.location.href = 'index.html';
});

$('#lightdarkIcon').on('click', toggleLightDarkModeHome);
function toggleLightDarkModeHome() {
    const lightDarkIcon = document.getElementById('lightdarkIcon');
    const screenshot = document.getElementById('screenshot');
    const listsScreenshot = document.getElementById('lists-screenshot');
    const tagsScreenshot = document.getElementById('tags-screenshot');
    const confettiScreenshot = document.getElementById('confetti-screenshot');
    const body = document.body;
    
    // Toggle light/dark mode
    body.classList.toggle('dark-mode');
    
    if (lightDarkIcon.src.includes('lightdark-icon-white.png')) {
        lightDarkIcon.src = './img/lightdark-icon-black.png';
        screenshot.src = './img/screenshot.png';
        listsScreenshot.src = './img/lists-screenshot.png';
        tagsScreenshot.src = './img/tags-screenshot.png';
        confettiScreenshot.src = './img/confetti-screenshot.png';
    } else {
        lightDarkIcon.src = './img/lightdark-icon-white.png';
        screenshot.src = './img/screenshot-dark.png';
        listsScreenshot.src = './img/lists-screenshot-dark.png';
        tagsScreenshot.src = './img/tags-screenshot-dark.png';
        confettiScreenshot.src = './img/confetti-screenshot-dark.png';
    }
}