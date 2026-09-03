declare module 'exceljs/lib/stream/xlsx/worksheet-reader.js' {
  import ExcelJS from 'exceljs';

  const ExcelWorksheetReader: new (
    options: any,
  ) => ExcelJS.stream.xlsx.WorksheetReader;

  export default ExcelWorksheetReader;
}

declare module 'exceljs/lib/xlsx/xform/style/styles-xform.js' {
  const ExcelStylesXform: new () => {
    init(): void;
    parseStream(stream: unknown): Promise<unknown>;
    getStyleModel(id: number | string): { numFmt?: string } | null;
  };

  export default ExcelStylesXform;
}
