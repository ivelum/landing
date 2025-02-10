import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

window.addEventListener('load', function () {
  document
    .getElementsByClassName('article--content')[0]
    .querySelectorAll('img')
    .forEach((img) => {
      let parentNode = img.parentNode;
      if (parentNode.tagName === 'PICTURE') {
        parentNode = parentNode.parentNode;
      }
      if (parentNode.tagName === 'A') {
        const previewWidth = 698; // See render-image.html
        const previewWidth2x = previewWidth * 2;
        parentNode.dataset.pswpWidth ||= previewWidth2x;
        parentNode.dataset.pswpHeight ||= Math.trunc(img.naturalHeight * (previewWidth2x / img.naturalWidth));
        const lightbox = new PhotoSwipeLightbox({
          gallery: parentNode,
          pswpModule: PhotoSwipe,
        });
        lightbox.init();
      }
    });
});
