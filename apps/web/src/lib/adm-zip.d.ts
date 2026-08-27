// adm-zip has no .d.ts in the npm package. We use a narrow surface
// (constructor + getEntries + entry.getData) and declare that here.
declare module "adm-zip" {
  interface ZipEntry {
    readonly entryName: string;
    getData(): Buffer;
  }
  interface ZipEntries {
    find(predicate: (e: ZipEntry) => boolean): ZipEntry | undefined;
  }
  class AdmZip {
    constructor(data: Buffer | Uint8Array);
    getEntries(): ZipEntry[];
  }
  export default AdmZip;
}
