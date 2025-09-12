# About

This is the source code for the [ivelum.com](https://ivelum.com) website, which
is built on [Hugo](https://gohugo.io). If you'd like to play with it, make sure
you have Hugo installed, clone the repo, and run:

```shell
$ hugo server
```

## HOWTO: Work with images

Simple! You can use all common formats: `.png`, `.jpg` or `.svg`; just make
sure the images are high quality. For `.png` and `.jpg`, they should be more
than `1400px` wide. If you can't find such a high-resolution image then use
the best quality you can find. Put the image in the same folder as your post,
and embed them in the post content like this:

```markdown
![Image description](image-file.png)
```
Please note that the image description is required. It should be a meaningful
explanation of what is shown on the image, which will be put into the
`<img alt="...">` attribute (important for SEO).

You don't have to do any image processing besides finding high-quality images.
The blog will automatically generate smaller previews and convert them to
alternative formats such as `WebP` for faster rendering.

## HOWTO: Publish a draft blog post

Add the following two lines in the Frontmatter markup at the beginning of the
post:

```
sitemap:
  disable: true
```

It'll hide the post from the [/blog/](https://ivelum.com/blog/) page and from
[sitemap.xml](https://ivelum.com/sitemap.xml), however you'll be able to preview it using the direct link. When
you're ready to publish the post, simply remove these lines.

Full example of the Frontmatter markup that marks a post as draft:

```
---
title: My new shiny post title (WIP)
description: Post description for SEO and sharing
date: 2024-12-08T12:00:00+0200
sitemap:
  disable: true
---

In this episode, we'll talk about ...
```

## Please don't put HTML in Markdown

I know you technically can, but it doesn't mean you should. Please avoid using
HTML markup or explicitly mentioning class names anywhere in the `content`
folder. Thank you.

## License

- Code: MIT
- Text and visual content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
