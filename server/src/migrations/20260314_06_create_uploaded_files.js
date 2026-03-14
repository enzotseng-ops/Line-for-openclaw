exports.up = function (knex) {
  return knex.schema.createTable('uploaded_files', (table) => {
    table.increments('id').primary();
    table.string('original_name', 255).notNullable();
    table.text('stored_path').notNullable();
    table.integer('file_size');
    table.string('mime_type', 100);
    table.string('google_file_id', 255);
    table.string('status', 20).defaultTo('processing'); // processing / ready / error
    table.integer('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('uploaded_files');
};
