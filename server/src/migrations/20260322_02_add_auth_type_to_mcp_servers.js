exports.up = function (knex) {
  return knex.schema.alterTable('mcp_servers', (table) => {
    table.string('auth_type', 20).defaultTo('bearer'); // 'bearer' | 'x-api-key'
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('mcp_servers', (table) => {
    table.dropColumn('auth_type');
  });
};
