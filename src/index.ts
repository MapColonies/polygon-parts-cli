import yargs, { showHelp } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CSVToDB } from './csvToDB';
import { getErrorMessage } from './utilities';

const argv = yargs(hideBin(process.argv))
  .usage('insert polygon part raw data into db')
  .option('i', {
    alias: 'input',
    describe: 'input file (csv)',
    type: 'string'
  })
  .version(require('../package.json').version)
  .help(true)
  .parseSync();

if (argv.i) {
  const filePath = argv.i;

  const polygonPartsUploader = new CSVToDB(filePath);

  (async () => {
    let exitCode: number = 1;
    try {
      console.log(`Start processing file: ${filePath}`); // TODO: replace with @map-colonies/js-logger
      const summary = await polygonPartsUploader.csvToPg();
      console.log('Processing finished');
      console.log(`Summary:
Total rows processed: ${summary.rowsProcessed}
Polygons processed: ${summary.polygonsProcessed}
    `);
      exitCode = 0;
    } catch (err) {
      const errMessage = getErrorMessage(err);
      console.error(`Processing failed with an error: ${errMessage}`);
    } finally {
      process.exit(exitCode);
    }
  })();
}

else {
  showHelp();
}
