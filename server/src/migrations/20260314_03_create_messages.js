exports.up = function (knex) {
  return knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table.string('line_user_id', 255).notNullable();
    table.string('direction', 10).notNullable(); // inbound / outbound
    table.string('message_type', 20).notNullable(); // text / image / video / audio / sticker / file
    table.text('content');
    table.text('media_url');
    table.string('reply_source', 20); // ai / manual / system
    table.string('ai_model_used', 50);
    table.string('line_message_id', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('messages');
};
