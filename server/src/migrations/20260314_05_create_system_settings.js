exports.up = async function (knex) {
  await knex.schema.createTable('system_settings', (table) => {
    table.increments('id').primary();
    table.string('key', 100).unique().notNullable();
    table.text('value').notNullable();
    table.text('description');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Insert default settings
  await knex('system_settings').insert([
    { key: 'global_ai_enabled', value: 'true', description: '全域 AI 總開關' },
    { key: 'llm_provider', value: 'claude', description: 'LLM 供應商: claude / openai / custom' },
    { key: 'llm_api_key', value: '', description: 'LLM API Key (加密儲存)' },
    { key: 'llm_model', value: 'claude-sonnet-4-20250514', description: '使用的模型名稱' },
    { key: 'system_prompt', value: '你是無毒農的智能客服助理，請以友善、專業的態度回答客戶問題。請使用繁體中文回答。', description: 'AI 系統提示詞' },
    { key: 'google_file_search_api_key', value: '', description: 'OpenAI API Key (用於 Assistants API File Search)' },
    { key: 'google_assistant_id', value: '', description: 'OpenAI Assistants API 的 Assistant ID' },
    { key: 'custom_llm_base_url', value: '', description: 'Custom LLM Base URL (OpenAI compatible)' },
  ]);
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('system_settings');
};
