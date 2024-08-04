function up(knex) {
  return knex.schema
    .createTable('l2_blocks', (tbl) => {
      tbl.integer('id').primary().unsigned().notNullable()
      tbl.string('hash').unique().notNullable()
      tbl.string('parent_hash').notNullable()
      tbl.timestamp('timestamp').notNullable()
      tbl.date('created_at').defaultTo(knex.fn.now())
    })
    .createTable('withdrawals', (tbl) => {
      tbl.increments('id').primary().unsigned()
      tbl.integer('block_number').notNullable()
      tbl.string('block_hash').notNullable()
      tbl.string('transaction_hash').unique().notNullable()
      tbl.timestamp('timestamp').notNullable()
      tbl.float('amount').notNullable()
      tbl.date('created_at').defaultTo(knex.fn.now())
    })
}

function down(knex) {
  return knex.schema.dropTableIfExists('l2_blocks').dropTableIfExists('withdrawals')
}

exports.up = up
exports.down = down
