import PhotoSwipeLightbox from '/vendor/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from '/vendor/photoswipe.esm.min.js';

window.addEventListener("load", function () {
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  link.href = '/vendor/photoswipe.css';
  document.querySelectorAll('img').forEach(function (img) {
    if (img.parentNode.tagName === "A") {
      img.parentNode.setAttribute("data-pswp-width", img.naturalWidth);
      img.parentNode.setAttribute("data-pswp-height", img.naturalHeight);
    }
  });

  const options = {
    gallery: '.narrow-container a',
    pswpModule: PhotoSwipe
  };
  const lightbox = new PhotoSwipeLightbox(options);
  lightbox.init();
});
