/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'pdfmake/build/pdfmake' {
  interface PdfMakeStatic {
    createPdf: (docDefinition: Record<string, unknown>) => { download: (filename?: string) => void; open: () => void };
    vfs: Record<string, string>;
  }
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: { pdfMake: { vfs: Record<string, string> } };
  export default pdfFonts;
  export = pdfFonts;
}
