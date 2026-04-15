onRecordDelete((e) => {
  const projectId = e.record.id

  if ($app.hasTable('journal_entries') && $app.hasTable('entry_items')) {
    $app
      .db()
      .newQuery(
        'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
      )
      .bind({ projectId: projectId })
      .execute()
    $app
      .db()
      .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  }

  if ($app.hasTable('accounts')) {
    $app
      .db()
      .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  }

  if ($app.hasTable('audit_comments')) {
    $app
      .db()
      .newQuery('DELETE FROM audit_comments WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  }

  return e.next()
}, 'projects')
