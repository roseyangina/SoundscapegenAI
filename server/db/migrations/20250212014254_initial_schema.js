/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('User', table => {
      table.increments('user_id').primary();
      table.string('google_id').unique();
      table.string('email').notNullable().unique();
      table.string('username').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('Soundscape', table => {
      table.increments('soundscape_id').primary();
      table.integer('user_id').references('user_id').inTable('User');
      table.string('name').notNullable();
      table.text('description');
      table.boolean('is_preset').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('Sound', table => {
      table.increments('sound_id').primary();
      table.text('source_url').notNullable();
      table.integer('freesound_id');
      table.string('file_path');
      table.string('name').notNullable().defaultTo('Unnamed Sound');
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('SoundscapeSound', table => {
      table.increments('soundscapesounds_id').primary();
      table.integer('soundscape_id').references('soundscape_id').inTable('Soundscape');
      table.integer('sound_id').references('sound_id').inTable('Sound');
      table.decimal('volume', 5, 2).defaultTo(1.0);
      table.decimal('pan', 5, 2).defaultTo(0.0);
      table.unique(['soundscape_id', 'sound_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('SoundscapeSound')
    .dropTableIfExists('Sound')
    .dropTableIfExists('Soundscape')
    .dropTableIfExists('User');
};