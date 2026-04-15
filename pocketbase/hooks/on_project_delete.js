onRecordAfterDeleteSuccess((e) => {
  const projectId = e.record.id

  try {
    $app
      .db()
      .newQuery(
        'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
      )
      .bind({ projectId: projectId })
      .execute()
  } catch (err) {
    console.log('Error deleting entry_items: ' + err)
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  } catch (err) {
    console.log('Error deleting journal_entries: ' + err)
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  } catch (err) {
    console.log('Error deleting accounts: ' + err)
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM audit_comments WHERE project_id = {:projectId}')
      .bind({ projectId: projectId })
      .execute()
  } catch (err) {
    console.log('Error deleting audit_comments: ' + err)
  }

  return e.next()
}, 'projects')
