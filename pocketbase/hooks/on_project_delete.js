onRecordDeleteRequest((e) => {
  const projectId = e.record.id

  // Execute a fast raw SQL cascade delete before PocketBase attempts to delete
  // records row-by-row, which prevents timeouts on projects with massive accounting data.
  try {
    $app.runInTransaction((txApp) => {
      // 1. entry_items (depends on journal_entries)
      txApp
        .db()
        .newQuery(
          'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
        )
        .bind({ projectId: projectId })
        .execute()

      // 2. journal_entries
      txApp
        .db()
        .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
        .bind({ projectId: projectId })
        .execute()

      // 3. accounts
      txApp
        .db()
        .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
        .bind({ projectId: projectId })
        .execute()

      // 4. audit_logs (depends on audit_comments)
      txApp
        .db()
        .newQuery('DELETE FROM audit_logs WHERE project_id = {:projectId}')
        .bind({ projectId: projectId })
        .execute()

      // 5. audit_comments
      txApp
        .db()
        .newQuery('DELETE FROM audit_comments WHERE project_id = {:projectId}')
        .bind({ projectId: projectId })
        .execute()
    })
  } catch (err) {
    $app
      .logger()
      .error('Error in fast project cascade delete', 'error', String(err), 'projectId', projectId)
  }

  // Proceed with the standard PocketBase deletion (which will now skip the children as they are already deleted)
  return e.next()
}, 'projects')
