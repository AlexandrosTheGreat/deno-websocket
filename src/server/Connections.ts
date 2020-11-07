import { WebSocket } from 'https://deno.land/std@0.76.0/ws/mod.ts';

export type Connection = { ws: WebSocket; state: boolean; name: string };
export type ConnInfo = { id: string; conn: Connection };
export type ConnInfoRO = Readonly<ConnInfo>;

const Connections: Map<string, Connection> = new Map();

export function GetConnections(): Promise<Array<ConnInfoRO>> {
	return new Promise((resolve) => {
		const lConnection: Array<ConnInfoRO> = [];
		Connections.forEach((pConnection, pId) => {
			if (!pConnection.state) {
				return;
			}
			lConnection.push(
				Object.freeze({
					id: pId,
					conn: pConnection,
				})
			);
		});
		resolve(lConnection);
	});
}

let id = 0;
export function AddConn(pWebSocket: WebSocket): Promise<ConnInfo> {
	return new Promise((resolve) => {
		const _id = (id++).toString();
		const objConn = { ws: pWebSocket, state: false, name: '' };
		Connections.set(_id, objConn);
		return resolve({ id: _id, conn: objConn });
	});
}

export function FindConnById(pId: string): Promise<Connection | null> {
	return new Promise((resolve) => {
		const conn = Connections.get(pId);
		return resolve(conn ? conn : null);
	});
}

export function FindConnByName(pName: string): Promise<Connection | null> {
	return new Promise((resolve) => {
		for (const [_Id, _Conn] of Connections.entries()) {
			if (_Conn.name.toUpperCase() === pName.toUpperCase()) {
				return resolve(_Conn);
			}
		}
		resolve(null);
	});
}

export function RemoveConnById(pId: string): Promise<Boolean> {
	return new Promise((resolve) => {
		const deleted = Connections.delete(pId);
		resolve(deleted);
	});
}

export function CheckConnById(pId: string): Promise<Boolean> {
	return new Promise((resolve) => {
		const conn = Connections.get(pId);
		const isInvalid = !conn || conn.ws.isClosed;
		resolve(!isInvalid);
	});
}

export function CountConn(): Promise<number> {
	return new Promise((resolve) => {
		return resolve(Connections.size);
	});
}
