import { WebSocket } from 'https://deno.land/std@0.76.0/ws/mod.ts';

type Connection = Readonly<{ id: String; ws: WebSocket }>;
const Connections: Map<String, WebSocket> = new Map();

export function GetConnections(): Promise<Array<Connection>> {
	return new Promise((resolve) => {
		const lConnection: Array<Connection> = [];
		Connections.forEach((pWebSocket, pId) => {
			lConnection.push(
				Object.freeze({
					id: pId,
					ws: pWebSocket,
				})
			);
		});
		resolve(lConnection);
	});
}

let id = 0;
export function AddConn(pWebSocket: WebSocket): Promise<String> {
	return new Promise((resolve) => {
		const _id = (id++).toString();
		Connections.set(_id, pWebSocket);
		return resolve(_id);
	});
}

export function FindConnById(pId: String): Promise<WebSocket | null> {
	return new Promise((resolve) => {
		const conn = Connections.get(pId);
		return resolve(conn ? conn : null);
	});
}

export function RemoveConnById(pId: String): Promise<Boolean> {
	return new Promise((resolve) => {
		const deleted = Connections.delete(pId);
		resolve(deleted);
	});
}

export function CheckConnById(pId: String): Promise<Boolean> {
	return new Promise((resolve) => {
		const conn = Connections.get(pId);
		const isValid = !(!conn || conn.isClosed);
		resolve(isValid);
	});
}

export function CountConn(): Promise<number> {
	return new Promise((resolve) => {
		return resolve(Connections.size);
	});
}
