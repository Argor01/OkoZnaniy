(function() {
  try {
    var t = localStorage.getItem('oko-theme-mode');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#0f1117';
    }
  } catch (e) {}
})();
