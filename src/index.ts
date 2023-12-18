import config from 'config';
import yargs, { showHelp } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CSVToDB } from './csvToDB';
import { DBProvider } from './pg';
import { PGConfig } from './types';
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

  const dbConfig = config.get<PGConfig>('pgConfig');
  const adminProvider = new DBProvider({ ...dbConfig, ...{ pool: { min: 0, max: 1 } } });
  const dbProvider = new DBProvider(dbConfig); // TODO: inject

  let shutdown = true;

  // https://github.com/brianc/node-postgres/issues/773
  // to cleanup pg resources an admin client terminating ongoing queries is currently the only option
  // this may require setting additional access to the user - https://www.postgresql.org/docs/12/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL
  const gracefulShutdown = async () => {
    if (shutdown) {
      shutdown = false;
      try {
        if (dbProvider.backendPID)
          await adminProvider.cancel(dbProvider.backendPID);
      } catch (err) {
        const errMessage = getErrorMessage(err);
        console.error(`Failed to cleanup DB resources: ${errMessage}`);
      }
    }
  }

  process.on('SIGTERM', async () => {
    console.log('SIGTERM');
    await gracefulShutdown();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT');
    await gracefulShutdown();
  });

  const polygonPartsUploader = new CSVToDB(filePath, dbProvider);

  (async () => {
    let exitCode: number = 1;
    try {
      console.log(`Start processing file 🎬: ${filePath}`); // TODO: replace with @map-colonies/js-logger
      const summary = await polygonPartsUploader.csvToPg();
      console.log('Processing finished 🏁');
      console.log(`Summary 📋:
Total rows processed: ${summary.rowsProcessed}
Polygons processed: ${summary.polygonsProcessed}
    `);
      exitCode = 0;
    } catch (err) {
      const errMessage = getErrorMessage(err);
      console.error(`🥴 Processing failed with an error: ${errMessage}`);
    } finally {
      process.exit(exitCode);
    }
  })();
}

else {
  showHelp();
}
