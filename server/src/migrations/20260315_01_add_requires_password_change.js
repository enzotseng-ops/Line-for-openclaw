exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('requires_password_change').defaultTo(false);
  });

  // Mark existing default admin (seed account) as requiring password change
  await knex('users')
    .where({ email: 'admin@example.com' })
    .update({ requires_password_change: true });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('requires_password_change');
  });
};
