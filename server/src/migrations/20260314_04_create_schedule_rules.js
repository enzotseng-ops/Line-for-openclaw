exports.up = function (knex) {
  return knex.schema.createTable('schedule_rules', (table) => {
    table.increments('id').primary();
    table.integer('day_of_week').notNullable(); // 0=Sun, 1=Mon, ..., 6=Sat
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('is_enabled').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('schedule_rules');
};
