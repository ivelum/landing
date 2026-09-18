import os
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup


ROOT_URL = os.environ.get('ROOT_URL', 'http://localhost:1313')
session = requests.Session()


def get_sitemap_paths():
    sitemap = session.get(urljoin(ROOT_URL, 'sitemap.xml')).text
    root = ElementTree.fromstring(sitemap)  # noqa: S314
    ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = [loc.text for loc in root.findall('./ns:url/ns:loc', ns)]
    assert len(urls)
    return {urlparse(u).path for u in urls}


def test_links():
    ignore_urls = {
        '/blog/index.xml',  # RSS feed
    }

    # Part 1: There should be no broken links.
    urls_queue = {'/'}
    initial_urls_count = len(urls_queue)
    urls_visited = set()
    while urls_queue:
        url = urls_queue.pop()
        if url in ignore_urls:
            continue

        response = session.get(urljoin(ROOT_URL, url))
        assert 200 == response.status_code, url
        print(f'URL checked: {url}')  # noqa: T201
        urls_visited.add(url)
        contents = BeautifulSoup(
            response.content.decode('utf-8'),
            'html.parser',
        )
        for link in contents.find_all('a'):
            link_url = link.attrs.get('href', '').split('#')[0]
            if link_url.startswith('/') and link_url not in urls_visited:
                urls_queue.add(link_url)
    # If no links were found at all,
    # something might be wrong with the start page(s)
    assert len(urls_visited) > initial_urls_count

    # Part 2: All visited pages must be in sitemap.xml,
    # and there must be nothing else in the sitemap
    assert urls_visited == get_sitemap_paths()
