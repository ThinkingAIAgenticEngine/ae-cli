import type { Command } from '../../framework/types.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import { eventGet } from './event/get.js';
import { propertyGet } from './property/get.js';
import { dataTableCsvDelete } from './data-table/csv-delete.js';
import { dataTableCsvWrite } from './data-table/csv-write.js';
import { dataTableDownload } from './data-table/download.js';
import { dataTableGet } from './data-table/get.js';
import { dataTableList } from './data-table/list.js';
import { dataTablePropertyBindingsUpdate } from './data-table/property-bindings-update.js';
import { dataTableSqlDelete } from './data-table/sql-delete.js';
import { dataTableSqlWrite } from './data-table/sql-write.js';
import { inputFileUpload } from './input-file/upload.js';
import { propertyDimensionTableBindExisting } from './property/dimension-table/bind-existing.js';
import { propertyDimensionTableCreateAndBindCsv } from './property/dimension-table/create-and-bind-csv.js';

registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });

const commands: Command[] = [
  eventGet,
  propertyGet,
  dataTableList,
  dataTableGet,
  dataTableCsvWrite,
  dataTableSqlWrite,
  dataTableCsvDelete,
  dataTableSqlDelete,
  dataTableDownload,
  dataTablePropertyBindingsUpdate,
  inputFileUpload,
  propertyDimensionTableBindExisting,
  propertyDimensionTableCreateAndBindCsv,
];

export default commands;
