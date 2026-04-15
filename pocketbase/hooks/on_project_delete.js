onRecordDelete((e) => {
  const projectId = e.record.id
  $app.runInTransaction((txApp) => {
    if (txApp.hasTable('entry_items') && txApp.hasTable('journal_entries')) {
      txApp
        .db()
        .newQuery(
          'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
        )
        .bind({ projectId })
        .execute()
      txApp
        .db()
        .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
        .bind({ projectId })
        .execute()
    }

    if (txApp.hasTable('accounts')) {
      txApp
        .db()
        .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
        .bind({ projectId })
        .execute()
    }

    if (txApp.hasTable('audit_comments')) {
      txApp
        .db()
        .newQuery('DELETE FROM audit_comments WHERE project_id = {:projectId}')
        .bind({ projectId })
        .execute()
    }
  })

  return e.next()
}, 'projects')
