/**
 * OPFS（Origin Private File System）文件操作
 * 用于存储缓存文件（如书籍内容、图片等）
 */

export class OPFSStorage {
	async writeFile(path: string, data: ArrayBuffer): Promise<void> {
		// TODO: 实现 OPFS 写入
		void path;
		void data;
	}

	async readFile(path: string): Promise<ArrayBuffer | null> {
		// TODO: 实现 OPFS 读取
		void path;
		return null;
	}

	async deleteFile(path: string): Promise<void> {
		// TODO: 实现 OPFS 删除
		void path;
	}
}
