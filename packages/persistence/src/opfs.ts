export class OPFSStorage {
	private root: FileSystemDirectoryHandle | null = null;

	private async getRoot(): Promise<FileSystemDirectoryHandle> {
		if (!this.root) {
			this.root = await navigator.storage.getDirectory();
		}
		return this.root;
	}

	private async getFileHandle(
		path: string,
		create = false,
	): Promise<FileSystemFileHandle> {
		const parts = path.split("/").filter(Boolean);
		const fileName = parts.pop();
		if (!fileName) {
			throw new Error(`Invalid path: ${path}`);
		}
		let dir = await this.getRoot();
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, { create });
		}
		return dir.getFileHandle(fileName, { create });
	}

	async writeFile(path: string, data: ArrayBuffer): Promise<void> {
		const handle = await this.getFileHandle(path, true);
		const writable = await handle.createWritable();
		try {
			await writable.write(data);
		} finally {
			await writable.close();
		}
	}

	async readFile(path: string): Promise<ArrayBuffer | null> {
		try {
			const handle = await this.getFileHandle(path);
			const file = await handle.getFile();
			return file.arrayBuffer();
		} catch {
			return null;
		}
	}

	async deleteFile(path: string): Promise<void> {
		const parts = path.split("/").filter(Boolean);
		const fileName = parts.pop();
		if (!fileName) return;
		let dir = await this.getRoot();
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part);
		}
		await dir.removeEntry(fileName);
	}

	async exists(path: string): Promise<boolean> {
		try {
			await this.getFileHandle(path);
			return true;
		} catch {
			return false;
		}
	}
}
