# About

This is the source code for the [ivelum.com](https://ivelum.com) website, which
is built on [Hugo](https://gohugo.io). If you'd like to play with it, make sure
you have Hugo installed, clone the repo, and run:

```shell
$ hugo server
```

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

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
