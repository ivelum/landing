import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

window.addEventListener('load', function () {
  document.querySelectorAll('[data-pswp-youtube-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const videoId = el.getAttribute('data-pswp-youtube-id');
      const pswp = new PhotoSwipe({
        dataSource: [
          {
            html: `
              <div class="youtube--modal">
                <iframe
                  src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=0"
                  frameborder="0"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                  class="youtube--modal-iframe"
                ></iframe>
              </div>
            `,
          },
        ],
        showHideAnimationType: 'fade',
      });
      pswp.init();
    });
  });
});
