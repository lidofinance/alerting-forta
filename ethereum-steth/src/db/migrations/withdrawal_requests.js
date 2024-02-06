function up(knex) {
  return knex.schema.createTable('withdrawal_requests', (tbl) => {
    tbl.integer('id').primary().notNullable()
    tbl.string('amountOfStETH').notNullable()
    tbl.string('amountOfShares').notNullable()
    tbl.string('owner').notNullable()
    tbl.timestamp('timestamp').notNullable()
    tbl.boolean('isFinalized').notNullable()
    tbl.boolean('isClaimed').notNullable()
  })
}

function down(knex) {
  return knex.schema.dropTableIfExists('withdrawal_requests')
}

exports.up = up
exports.down = down
