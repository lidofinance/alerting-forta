function up(knex) {
  return knex.schema.createTable('withdrawal_requests', (tbl) => {
    tbl.integer('id').primary().notNullable()
    tbl.string('amount_steth').notNullable()
    tbl.string('amount_shares').notNullable()
    tbl.string('owner').notNullable()
    tbl.timestamp('timestamp').notNullable()
    tbl.boolean('finalized').notNullable()
    tbl.boolean('claimed').notNullable()
  })
}

function down(knex) {
  return knex.schema.dropTableIfExists('withdrawal_requests')
}

exports.up = up
exports.down = down
