self.addEventListener('fetch', (event) => {
	if (event.request.url.endsWith('/index.html') || event.request.url.endsWith('/')) {
		event.respondWith(
			fetch(event.request, { cache: 'no-store' })
		);
	}
});

<!--This is a service worker designed to ensure the index.html isn't cached-->
<!--The meta tags don't work on GitHub-->
<!--This is utilized in the index.html file-->
