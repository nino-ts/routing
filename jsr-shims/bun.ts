/** JSR graph shim only — npm tarball keeps Bun built-in FileSystemRouter. */
export class FileSystemRouter {
	routes: Record<string, string> = {};
	constructor(_options: { dir: string; style: string }) {}
	match(_path: string): { filePath: string; kind: string; name: string; pathname: string; params: Record<string, string>; query: Record<string, string> } | null {
		return null;
	}
}