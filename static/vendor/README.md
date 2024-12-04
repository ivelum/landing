# How to vendor packages

1. Find the package on [jsDelivr](https://www.jsdelivr.com/), e.g.
   https://www.jsdelivr.com/package/npm/alpinejs.
2. Download the package as an ESM module. If the module name contains slashes
   `/`, replace them with dashes `-`.

   ```sh
   curl https://cdn.jsdelivr.net/npm/PACKAGE@VERSION[/MODULE1[/MODULE2[/...]]]/+esm > PACKAGE@VERSION[-MODULE1[-MODULE2[-...]]].js
   ```

   Example:

   ```sh
   curl https://cdn.jsdelivr.net/npm/alpinejs@3.14.6/+esm > alpinejs@3.14.6.js
   curl https://cdn.jsdelivr.net/npm/swiper@11.1.15/modules/pagination/+esm > swiper@11.1.15-modules-pagination.js
   ```

3. Open the module with an editor and remove the last line that starts with
   `//# sourceMappingURL`.
