exports.up = function (knex) {
  return knex.schema.createTable('line_users', (table) => {
    table.increments('id').primary();
    table.string('line_user_id', 255).unique().notNullable();
    table.string('display_name', 255);
    table.text('picture_url');
    table.string('mode', 20).defaultTo('ai');
    table.boolean('is_active').defaultTo(true);
    table.text('note');
    table.timestamp('first_message_at');
    table.timestamp('last_message_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('line_users');
};
