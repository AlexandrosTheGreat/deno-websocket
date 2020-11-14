import { v4 } from '../common/Dependency.ts';

export type FileInfo = { name: string; data: string };
const Files: Map<string, FileInfo> = new Map();

export function AddFile(pName: string, pData: string): Promise<string> {
	return new Promise((resolve) => {
		const _id = v4.generate();
		const objFileInfo = { name: pName, data: pData };
		Files.set(_id, objFileInfo);
		resolve(_id);
	});
}

export function FindFileById(pId: string): Promise<FileInfo | null> {
	return new Promise((resolve) => {
		const fileInfo = Files.get(pId);
		return resolve(fileInfo ? fileInfo : null);
	});
}

export function RemoveFileById(pId: string): Promise<boolean> {
	return new Promise((resolve) => {
		resolve(Files.delete(pId));
	});
}

export function CountFiles(): Promise<number> {
	return new Promise((resolve) => {
		return resolve(Files.size);
	});
}
