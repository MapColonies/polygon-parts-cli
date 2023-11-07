import yargs, { showHelp } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { FileToDB } from './dataSource';

const argv = yargs(hideBin(process.argv))
  .usage('insert polygon part raw data into db')
  .option('i', {
    alias: 'input',
    describe: 'input file (csv)',
    type: 'string',
    demandOption: true,
  })
  .help(true)
  .parseSync();

if (!argv.i && !argv.input) {
  showHelp();
} else {
  const filePath = argv.i;

  const partsUploader = new FileToDB(filePath);

  (async () => {
    let exitCode: number = 1;
    try {
      console.log(`Start processing file: ${filePath}`);
      const summary = await partsUploader.csvToPg();
      console.log('Processing finished');
      console.log(`Summary:
Total lines processed: ${summary.linesProcessed}
Lines processed successfully: ${summary.linesProcessed - summary.linesSkipped}
Lines skipped: ${summary.linesSkipped}
Polygons processed successfully: ${summary.polygonsProcessed}
    `);
      exitCode = 0;
    } catch (err) {
      console.error('Processing failed with an error:', err instanceof Error ? err.message : err);
    } finally {
      process.exit(exitCode);
    }
  })();
}