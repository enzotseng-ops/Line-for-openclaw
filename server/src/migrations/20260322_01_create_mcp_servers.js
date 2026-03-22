exports.up = async function (knex) {
  await knex.schema.createTable('mcp_servers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('transport_type', 20).notNullable().defaultTo('sse'); // 'sse' | 'streamable-http'
    table.text('url').notNullable();
    table.text('api_key'); // encrypted, optional Bearer token
    table.text('custom_headers'); // encrypted JSON, optional custom headers
    table.boolean('is_enabled').defaultTo(true);
    table.text('tools_cache'); // JSON cache of discovered tools
    table.timestamp('last_connected_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('mcp_servers');
};
