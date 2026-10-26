('DOMContentLoaded', () => {
    const darkToggle = document.getElementById('darkToggle');
    const darkIcon = document.getElementById('darkIcon');
    const htmlElement = document.documentElement; // This targets the <html> tag

    // 1. Check for saved user preference in LocalStorage
    if (localStorage.getItem('theme') === 'dark') {
        htmlElement.classList.add('dark');
        darkIcon.innerText = '☀️'; // Change icon to Sun
    }

    // 2. Add Click Event
    darkToggle.addEventListener('click', () => {
        // Toggle the 'dark' class
        htmlElement.classList.toggle('dark');

        // Update Icon and Save preference
        if (htmlElement.classList.contains('dark')) {
            darkIcon.innerText = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            darkIcon.innerText = '🌙';
            localStorage.setItem('theme', 'light');
        }
    });
});
