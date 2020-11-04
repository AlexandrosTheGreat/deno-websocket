import { ServerRequest } from 'https://deno.land/std@0.76.0/http/server.ts';

const PUBLIC_PATH = `${Deno.cwd()}/src/client/public`;

function getFullPath(pPath: string) {
	return `${PUBLIC_PATH}/${pPath}`;
}

export async function HandleClient(pRequest: ServerRequest): Promise<void> {
	if (pRequest.method === 'GET') {
		switch (pRequest.url) {
			case '/':
			case '/index.html':
				return pRequest.respond({
					headers: new Headers({ 'content-type': 'text/html' }),
					body: await Deno.open(getFullPath('index.html'), {
						read: true,
					}),
				});
				break;
			case '/favicon.ico':
				return pRequest.respond({
					headers: new Headers({ 'content-type': 'image/x-icon' }),
					body: await Deno.open(getFullPath('favicon.ico'), {
						read: true,
					}),
				});
				break;
			case '/index.css':
				return pRequest.respond({
					headers: new Headers({ 'content-type': 'text/css' }),
					body: await Deno.open(getFullPath('index.css'), {
						read: true,
					}),
				});
				break;
			case '/index.js':
				return pRequest.respond({
					headers: new Headers({
						'content-type': 'text/javascript',
					}),
					body: await Deno.open(getFullPath('index.js'), {
						read: true,
					}),
				});
				break;
			default:
				break;
		}
	}
	return pRequest.respond({ body: 'Not Found', status: 404 });
}
