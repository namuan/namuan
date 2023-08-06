---
markmap:
  colorFreezeLevel: 2
  maxWidth: 500
---

# Google Search Filters

## Content-based Filters
- allintext
  - Searches for occurrences of all the keywords given.
  - Example: `allintext:"keyword"`
- intext
  - Searches for the occurrences of keywords all at once or one at a time.
  - Example: `intext:"keyword"`
- intitle
  - Searches for occurrences of keywords in title all or one.
  - Example: `intitle:"keyword"`
- allintitle
  - Searches for occurrences of keywords all at a time.
  - Example: `allintitle:"keyword"`

## URL & Domain-based Filters
- inurl
  - Searches for a URL matching one of the keywords.
  - Example: `inurl:"keyword"`
- allinurl
  - Searches for a URL matching all the keywords in the query.
  - Example: `allinurl:"keyword"`
- site
  - Specifically searches that particular site and lists all the results for that site.
  - Example: `site:"www.google.com"`

## File & Link-based Filters
- filetype
  - Searches for a particular filetype mentioned in the query.
  - Example: `filetype:"pdf"`
- link
  - Searches for external links to pages.
  - Example: `link:"keyword"`
- allinanchor (and also inanchor)
  - This shows sites which have the keyterms in links pointing to them, in order of the most links.
  - Example: `inanchor:rat`

## Miscellaneous Filters
- numrange
  - Used to locate specific numbers in your searches.
  - Example: `numrange:321-325`
- before/after
  - Used to search within a particular date range.
  - Example: `filetype:pdf & (before:2000-01-01 after:2001-01-01)`
- allinpostauthor (and also inpostauthor)
  - Exclusive to blog search, this one picks out blog posts that are written by specific individuals.
  - Example: `allinpostauthor:"keyword"`
- related
  - List web pages that are “similar” to a specified web page.
  - Example: `related:www.google.com`
- cache
  - Shows the version of the web page that Google has in its cache.
  - Example: `cache:www.google.com`
