import { serve, acceptable } from './common/Dependency.ts';
import { HandleServer } from './server/Server.ts';
import { HandleClient } from './client/Client.ts';

const PORT = 8080;
const SERVER = serve({ port: PORT });
console.log(`http://localhost:${PORT}/`);

for await (const req of SERVER) {
	if (acceptable(req)) {
		HandleServer(req);
	} else {
		HandleClient(req);
	}
}
