

// Some thoughts on a pagination implementation.

The dojo store api uses count and start to specify a "page" to get.  For example:

first page: start = 0, count = 25
second page: start = 26, count = 25
third page: start = 51, count = 25

Couchdb uses a limit param for the size, but we want to specify a startkey.  For example:

first page:  ?limit=25
second page: ?limit=25&startkey=KEY_FOR_26th_DOCUMENT

Therefore, we need to actually get 26 documents in the first call, and stash the key for the 26th document.  
We can build a map that has the startkey for a given start value, like so:

0   : null
26  : KEY_FOR_26TH_DOCUMENT
