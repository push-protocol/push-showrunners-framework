const MySQLEvents = require('@rodrigogs/mysql-events');

export default async ({ pool, logger }) => {

  const instance = new MySQLEvents(pool, {
    startAtEnd: true,
  });

  const response = await instance.start();

  // EXAMPLE
  // dbEvents.addTrigger({
  //   name: 'Whole database instance',
  //   expression: '*',
  //   statement: MySQLEvents.STATEMENTS.ALL,
  //   onEvent: (event) => {
  //     console.log("Some Event");
  //     console.log(event);
  //   },
  // });

  // 1. SAMPLE SERVICE
  // Listen to Something for Some Data
  // logger.info('-- 🔮 Started Listening | INSERT | zzzz.tttt.*');
  // instance.addTrigger({
  //   name: 'CHANNELS_INSERT',
  //   expression: 'zzz.tttt.*',
  //   statement: MySQLEvents.STATEMENTS.INSERT,
  //   onEvent: async (event) => {
  //     logger.info("🧿 DB Event: %s | %s -- %o | [%s]", event.type, event.schema + '.' + event.table, event.affectedColumns, new Date(event.timestamp).toLocaleString());
  //
  //     await triggerBatchProcessSomething(event, logger);
  //   },
  // });

};
