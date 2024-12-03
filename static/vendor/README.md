# How to vendor a package

1. Download the package from npm:

   ```sh
   npm pack swiper

   # Or, optionally, specify the version
   npm pack swiper@11.1.15
   ```

2. Unpack and remove the `tgz` file:

   ```sh
   tar xf swiper-11.1.15.tgz
   rm swiper-11.1.15.tgz
   ```

3. Rename the `package` folder to `<package>@<version>` format:

   ```sh
   mv package swiper@11.1.15
   ```

4. Commit the vendored package:

   ```sh
   git add swiper@11.1.15
   git commit
   ```
