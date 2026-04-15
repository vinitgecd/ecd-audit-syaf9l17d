migrate(
  (app) => {
    const accounts = app.findCollectionByNameOrId('accounts')
    accounts.addIndex('idx_accounts_parent_id', false, 'parent_id', '')
    app.save(accounts)

    const entryItems = app.findCollectionByNameOrId('entry_items')
    entryItems.addIndex('idx_entry_items_acc_type', false, 'account_id, type', '')
    app.save(entryItems)
  },
  (app) => {
    const accounts = app.findCollectionByNameOrId('accounts')
    accounts.removeIndex('idx_accounts_parent_id')
    app.save(accounts)

    const entryItems = app.findCollectionByNameOrId('entry_items')
    entryItems.removeIndex('idx_entry_items_acc_type')
    app.save(entryItems)
  },
)
